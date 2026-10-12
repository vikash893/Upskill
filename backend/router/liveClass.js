const express = require("express");
const crypto = require("crypto");
const LiveClass = require("../models/liveClass");
const Course = require("../models/courses");
const Teacher = require("../models/teacher");
const User = require("../models/user");
const Enrollment = require("../models/enrollment");
const LiveAttendance = require("../models/liveAttendance");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { liveClassRateLimit } = require("../middleware/rateLimit");
const upload = require("../config/multer");
const { persistFile } = require("../config/cloudinary");
const {
    isEnrolled,
    getLiveClassSnapshot,
    getStudentDisplayName,
    invalidateLiveClassSnapshot,
    joinLiveClass,
    leaveLiveClass,
    endLiveClassAttendance
} = require("../services/liveAttendance");
const {
    createGoogleMeetEvent,
    endGoogleMeetConference,
    getGoogleMeetConferenceStatus,
    isGoogleMeetConfigured,
    ensureGoogleMeetEventAttendees,
    syncGoogleMeetRecordingMetadata
} = require("../services/googleMeetService");

const liveClassRouter = express.Router();

function buildPlatformJoinUrl(req, classId) {
    const frontendBase = process.env.FRONTEND_URL || req.get("origin") || `${req.protocol}://${req.get("host")}`;
    return `${String(frontendBase).replace(/\/$/, "")}/live-class/${encodeURIComponent(classId)}`;
}

function exposeLiveClass(liveClass, req, { includeMeetingUrl = false } = {}) {
    const plain = typeof liveClass.toObject === "function" ? liveClass.toObject() : { ...liveClass };
    plain.platform_join_url = buildPlatformJoinUrl(req, plain.class_id);
    plain.join_url = plain.platform_join_url;
    if (!includeMeetingUrl) {
        delete plain.meeting_url;
    }
    return plain;
}

function buildAttendancePipeline(classId, courseId, { skip, limit } = {}) {
    const pipeline = [
        { $match: { course_id: courseId, status: "active" } },
        { $sort: { student_email: 1 } },
        {
            $lookup: {
                from: LiveAttendance.collection.name,
                let: { email: { $toLower: "$student_email" } },
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$class_id", classId] },
                                { $eq: ["$student_email", "$$email"] }
                            ]
                        }
                    }
                }, { $limit: 1 }],
                as: "class_attendance"
            }
        },
        { $addFields: { attendance_record: { $arrayElemAt: ["$class_attendance", 0] } } },
        {
            $project: {
                _id: 0,
                student_email: 1,
                student_name: { $ifNull: ["$attendance_record.student_name", "$student_name"] },
                status: { $cond: [{ $ifNull: ["$attendance_record._id", false] }, "Present", "Absent"] },
                entered_at: "$attendance_record.entered_at",
                left_at: "$attendance_record.left_at",
                duration_minutes: { $ifNull: ["$attendance_record.duration_minutes", 0] },
                source: "$attendance_record.source"
            }
        }
    ];

    if (typeof skip === "number") pipeline.push({ $skip: skip });
    if (typeof limit === "number") pipeline.push({ $limit: limit });
    return pipeline;
}

const mongoose = require("mongoose");

async function findTeacher(emailOrId) {
    if (!emailOrId) return null;
    const str = String(emailOrId).trim();
    if (mongoose.isValidObjectId(str)) {
        const byId = await Teacher.findById(str);
        if (byId) return byId;
    }
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return Teacher.findOne({ email: { $regex: `^${escaped}$`, $options: "i" } });
}

async function isTeacherAssigned(teacherEmail, course_id) {
    const teacher = await findTeacher(teacherEmail);
    if (!teacher) return false;
    const course = await Course.findOne({ course_id });
    if (!course) return false;

    return (
        teacher.course_assigned.includes(course_id) ||
        teacher.course_assigned.includes(course.course_title) ||
        teacher.course_assigned.some(c => c.toLowerCase() === course_id.toLowerCase() || c.toLowerCase() === course.course_title.toLowerCase())
    );
}

async function canAccessCourseLiveClasses(user, courseId, liveClass = null) {
    if (!user) return false;
    if (user.role === "ADMIN") return true;

    if (user.role === "TEACHER") {
        const ownsClass = liveClass?.teacher_email
            ? liveClass.teacher_email.toLowerCase() === user.email.toLowerCase()
            : false;
        return ownsClass || await isTeacherAssigned(user.email, courseId);
    }

    if (user.role === "STUDENT") {
        return isEnrolled(user.email, courseId);
    }

    return false;
}

async function getActiveCourseAttendeeEmails(courseId, teacherEmail = null) {
    const enrollments = await Enrollment.find({ course_id: courseId, status: "active" })
        .select("student_email")
        .lean();
    const emails = enrollments.map((enrollment) => enrollment.student_email);
    if (teacherEmail) emails.push(teacherEmail);
    return [...new Set(
        emails
            .filter(Boolean)
            .map((email) => String(email).trim().toLowerCase())
            .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )];
}

async function markLiveClassEnded(liveClass, endedAt = new Date()) {
    liveClass.status = "ended";
    liveClass.ended_at = endedAt;
    await liveClass.save();
    await invalidateLiveClassSnapshot(liveClass.class_id);
    await endLiveClassAttendance(liveClass.class_id, endedAt);
}

// ======================================================
// CREATE LIVE CLASS (UNISKILL WEBRTC STREAM)
// ======================================================
liveClassRouter.post(
    "/live-class/create",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const userEmail = req.user.email;
            const userRole = req.user.role;
            const { course_id, title, topic, scheduled_time, duration_minutes } = req.body;

            if (!course_id || !title) {
                return res.status(400).json({ error: "Course ID and class title are required" });
            }

            const course = await Course.findOne({ course_id });
            if (!course) {
                return res.status(404).json({ error: "Course not found" });
            }

            if (userRole === "TEACHER") {
                const assigned = await isTeacherAssigned(userEmail, course_id);
                if (!assigned) {
                    return res.status(403).json({ error: "You are not assigned to teach this course" });
                }
            }

            const teacherDoc = await Teacher.findOne({ email: userEmail });
            const teacherName = teacherDoc?.name || req.user.name || "Course Instructor";

            const class_id = `cls_${crypto.randomUUID ? crypto.randomUUID().substring(0, 10) : Date.now().toString(36)}`;
            const safeCoursePart = course.course_title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12);
            const randomPart = crypto.randomUUID ? crypto.randomUUID().substring(0, 8) : Math.random().toString(36).substring(2, 8);
            const room_name = `UniSkill_${safeCoursePart}_${randomPart}`;
            const scheduledAt = scheduled_time ? new Date(scheduled_time) : new Date();
            const durationMinutes = Number(duration_minutes) > 0 ? Number(duration_minutes) : 60;
            const startDateTime = scheduledAt instanceof Date && !Number.isNaN(scheduledAt) ? scheduledAt : new Date();
            const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

            const googleMeetEnabled = isGoogleMeetConfigured();
            let meetingResult = { created: false, configured: false, connected: false, meetUrl: null, eventId: null, meetSpaceId: null };

            if (googleMeetEnabled && teacherDoc?.google_refresh_token) {
                const attendeeEmails = await getActiveCourseAttendeeEmails(course.course_id, userEmail);
                meetingResult = await createGoogleMeetEvent({
                    title,
                    description: topic || "Course live class",
                    startTime: startDateTime,
                    endTime: endDateTime,
                    courseTitle: course.course_title,
                    teacherName,
                    attendeeEmails
                }, teacherDoc);
            } else if (googleMeetEnabled) {
                meetingResult = {
                    created: false,
                    configured: true,
                    connected: false,
                    meetUrl: null,
                    eventId: null,
                    meetSpaceId: null,
                    message: "Google Meet is configured, but this teacher has not connected their Google account yet."
                };
            }

            const newClass = new LiveClass({
                class_id,
                course_id: course.course_id,
                course_title: course.course_title,
                teacher_email: userEmail,
                teacher_name: teacherName,
                title,
                topic: topic || "",
                room_name,
                stream_provider: meetingResult.created ? "google-meet" : "uniskill-webrtc",
                meeting_provider: meetingResult.created ? "google-meet" : "legacy-webrtc",
                meeting_url: meetingResult.meetUrl || null,
                calendar_event_id: meetingResult.eventId || null,
                meet_space_id: meetingResult.meetSpaceId || null,
                scheduled_time: startDateTime,
                status: "upcoming",
                attendance: []
            });

            await newClass.save();

            return res.status(201).json({
                message: meetingResult.created
                    ? "Live class created successfully with Google Meet"
                    : googleMeetEnabled
                        ? "Live class created but Google Meet scheduling is still pending. Please verify your Google Workspace config."
                        : "Live class created successfully. Configure Google Meet credentials to generate a Meet link.",
                liveClass: exposeLiveClass(newClass, req, { includeMeetingUrl: true }),
                meet: meetingResult
            });
        } catch (error) {
            console.log("CREATE LIVE CLASS ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

liveClassRouter.post(
    "/live-class/:class_id/generate-meeting",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const { class_id } = req.params;
            const liveClass = await LiveClass.findOne({ class_id });

            if (!liveClass) {
                return res.status(404).json({ error: "Live class not found" });
            }

            const userEmail = req.user.email;
            if (req.user.role === "TEACHER" && liveClass.teacher_email.toLowerCase() !== userEmail.toLowerCase()) {
                return res.status(403).json({ error: "You are not allowed to generate a meeting for this class" });
            }

            const teacherDoc = (await findTeacher(req.user.teacherId)) || (await findTeacher(liveClass.teacher_email)) || (await findTeacher(userEmail));

            if (!isGoogleMeetConfigured()) {
                return res.status(400).json({
                    error: "Google Meet is not configured for this LMS yet. Add your Google OAuth or service account settings first.",
                    configured: false,
                });
            }

            if (!teacherDoc?.google_refresh_token) {
                return res.status(409).json({
                    error: "The instructor must connect and verify their Google account before generating this Meet session.",
                    configured: true,
                    connected: false,
                });
            }

            const scheduledTime = liveClass.scheduled_time || new Date();
            const endDateTime = new Date(scheduledTime.getTime() + (Number(liveClass.duration_minutes) || 60) * 60 * 1000);
            const attendeeEmails = await getActiveCourseAttendeeEmails(liveClass.course_id, liveClass.teacher_email);

            const meetingResult = await createGoogleMeetEvent({
                title: liveClass.title,
                description: liveClass.topic || "Course live class",
                startTime: scheduledTime,
                endTime: endDateTime,
                courseTitle: liveClass.course_title,
                teacherName: liveClass.teacher_name,
                attendeeEmails
            }, teacherDoc);

            if (!meetingResult.created) {
                return res.status(400).json({
                    error: meetingResult.message || "Unable to generate a Google Meet session right now.",
                    configured: meetingResult.configured,
                    connected: Boolean(teacherDoc?.google_refresh_token),
                    meet: meetingResult,
                });
            }

            liveClass.meeting_url = meetingResult.meetUrl || liveClass.meeting_url;
            liveClass.meeting_provider = "google-meet";
            liveClass.stream_provider = "google-meet";
            liveClass.calendar_event_id = meetingResult.eventId || liveClass.calendar_event_id;
            liveClass.meet_space_id = meetingResult.meetSpaceId || liveClass.meet_space_id;
            liveClass.status = liveClass.status === "ended" ? "upcoming" : liveClass.status;
            await liveClass.save();
            await invalidateLiveClassSnapshot(class_id);

            return res.status(200).json({
                message: "Google Meet session generated successfully.",
                join_url: buildPlatformJoinUrl(req, liveClass.class_id),
                platform_join_url: buildPlatformJoinUrl(req, liveClass.class_id),
                meeting_url: liveClass.meeting_url,
                liveClass: exposeLiveClass(liveClass, req, { includeMeetingUrl: true }),
                meet: meetingResult,
            });
        } catch (error) {
            console.log("GENERATE LIVE CLASS MEETING ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// ======================================================
// GET LIVE CLASSES FOR A COURSE
// ======================================================
liveClassRouter.get("/live-class/google-meet/status", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    return res.status(200).json({
        enabled: isGoogleMeetConfigured(),
        provider: isGoogleMeetConfigured() ? "google-meet" : "not-configured",
        message: isGoogleMeetConfigured()
            ? "Google Meet is configured for live-class scheduling."
            : "Google Meet is not configured yet. Add the Google OAuth or service account settings to generate Meet links."
    });
});

liveClassRouter.get("/live-class/history/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        if (!(await canAccessCourseLiveClasses(req.user, course_id))) {
            return res.status(403).json({
                error: userRole === "STUDENT"
                    ? "You must be enrolled in this course to view class history"
                    : "You are not allowed to view live classes for this course"
            });
        }

        const rawClasses = await LiveClass.find({ course_id }).sort({ scheduled_time: -1 }).lean();
        const classes = rawClasses.map((liveClass) =>
            exposeLiveClass(liveClass, req, { includeMeetingUrl: userRole !== "STUDENT" })
        );
        const upcoming = classes.filter((item) => item.status === "upcoming");
        const liveNow = classes.filter((item) => item.status === "live");
        const completed = classes.filter((item) => item.status === "ended");
        const recordings = classes.filter((item) => item.recording_url || item.recording_status === "completed");

        return res.status(200).json({
            total: classes.length,
            upcoming,
            liveNow,
            completed,
            recordings,
            classes
        });
    } catch (error) {
        console.log("GET LIVE CLASS HISTORY ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveClassRouter.get("/live-class/course/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        if (!(await canAccessCourseLiveClasses(req.user, course_id))) {
            return res.status(403).json({
                error: userRole === "STUDENT"
                    ? "You must be enrolled in this course to view live classes"
                    : "You are not allowed to view live classes for this course"
            });
        }

        const includeMeetingUrl = userRole !== "STUDENT";
        const liveClasses = (await LiveClass.find({ course_id }).sort({ createdAt: -1 }).lean())
            .map((liveClass) => exposeLiveClass(liveClass, req, { includeMeetingUrl }));

        if (userRole === "STUDENT" && liveClasses.length > 0) {
            const attendanceRecords = await LiveAttendance.find({
                class_id: { $in: liveClasses.map(liveClass => liveClass.class_id) },
                student_email: userEmail.toLowerCase()
            }).lean();
            const attendanceByClass = new Map(attendanceRecords.map(record => [record.class_id, record]));

            for (const liveClass of liveClasses) {
                const attendance = attendanceByClass.get(liveClass.class_id);
                liveClass.attendance = attendance
                    ? [attendance]
                    : (liveClass.attendance || []).filter(record => record.student_email.toLowerCase() === userEmail.toLowerCase());
            }
        }

        return res.status(200).json({
            total: liveClasses.length,
            classes: liveClasses
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// START / END LIVE CLASS
// ======================================================
liveClassRouter.post(
    "/live-class/:class_id/sync-recording",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const { class_id } = req.params;
            const liveClass = await LiveClass.findOne({ class_id });

            if (!liveClass) {
                return res.status(404).json({ error: "Live class not found" });
            }
            if (req.user.role === "TEACHER" && liveClass.teacher_email !== req.user.email) {
                return res.status(403).json({ error: "You are not allowed to sync this class" });
            }

            const teacherDoc = await Teacher.findOne({ email: liveClass.teacher_email });

            const syncResult = await syncGoogleMeetRecordingMetadata({
                meetSpaceId: liveClass.meet_space_id,
                calendarEventId: liveClass.calendar_event_id,
                liveClass,
            }, teacherDoc);

            if (syncResult.recordings && syncResult.recordings.length > 0) {
                const firstRecording = syncResult.recordings[0];
                liveClass.recording_url = firstRecording.uri || liveClass.recording_url;
                liveClass.recording_status = "completed";
                liveClass.recording_duration = liveClass.recording_duration || "Recorded session";
                await liveClass.save();
            }

            return res.status(200).json({
                message: syncResult.message,
                syncResult,
                liveClass
            });
        } catch (error) {
            console.log("SYNC MEET RECORDING ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

liveClassRouter.get(
    "/live-class/:class_id/meet-status",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const liveClass = await LiveClass.findOne({ class_id: req.params.class_id });
            if (!liveClass) return res.status(404).json({ error: "Live class not found" });
            if (req.user.role === "TEACHER" && liveClass.teacher_email !== req.user.email) {
                return res.status(403).json({ error: "You are not allowed to sync this class" });
            }
            if (liveClass.status === "ended") {
                return res.status(200).json({ state: "ended", liveClass });
            }
            if (liveClass.meeting_provider !== "google-meet" || !liveClass.meeting_url) {
                return res.status(200).json({ state: liveClass.status, liveClass });
            }

            const teacher = await Teacher.findOne({ email: liveClass.teacher_email });
            const conferenceState = await getGoogleMeetConferenceStatus({
                meetSpaceId: liveClass.meet_space_id,
                meetingUrl: liveClass.meeting_url
            }, teacher);

            if (conferenceState.state === "ended") {
                const endedAt = conferenceState.endedAt ? new Date(conferenceState.endedAt) : new Date();
                await markLiveClassEnded(liveClass, endedAt);
                return res.status(200).json({ state: "ended", liveClass, conferenceState });
            }

            return res.status(200).json({ state: conferenceState.state, liveClass, conferenceState });
        } catch (error) {
            console.error("SYNC GOOGLE MEET STATUS ERROR:", error?.response?.data || error?.message || error);
            return res.status(503).json({ error: "Google Meet status could not be checked; retry shortly." });
        }
    }
);

liveClassRouter.patch(
    "/live-class/status/:class_id",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const { class_id } = req.params;
            const { status } = req.body; // "live" or "ended"

            if (!["upcoming", "live", "ended"].includes(status)) {
                return res.status(400).json({ error: "Invalid status" });
            }

            const liveClass = await LiveClass.findOne({ class_id });
            if (!liveClass) {
                return res.status(404).json({ error: "Live class not found" });
            }
            if (req.user.role === "TEACHER" && liveClass.teacher_email !== req.user.email) {
                return res.status(403).json({ error: "You are not allowed to update this class" });
            }

            if (status === "ended" && liveClass.status !== "ended" && liveClass.meeting_provider === "google-meet") {
                const teacher = await Teacher.findOne({ email: liveClass.teacher_email });
                const conferenceState = await getGoogleMeetConferenceStatus({
                    meetSpaceId: liveClass.meet_space_id,
                    meetingUrl: liveClass.meeting_url
                }, teacher);

                if (conferenceState.state === "active") {
                    const endResult = await endGoogleMeetConference({
                        meetSpaceId: liveClass.meet_space_id,
                        meetingUrl: liveClass.meeting_url
                    }, teacher);
                    if (!endResult.ended) {
                        return res.status(502).json({ error: endResult.message });
                    }
                } else if (conferenceState.state === "unsupported" && req.body.confirm_meet_ended !== true) {
                    return res.status(409).json({
                        error: "This older Meet link cannot be ended by the LMS. End it in Google Meet first, then confirm here.",
                        confirm_meet_ended: true,
                    });
                } else if (conferenceState.state === "unavailable") {
                    return res.status(503).json({ error: conferenceState.message });
                }
            }

            liveClass.status = status;
            if (status === "live" && !liveClass.started_at) {
                liveClass.started_at = new Date();
            }

            if (status === "ended") {
                await markLiveClassEnded(liveClass);
            } else {
                await liveClass.save();
                await invalidateLiveClassSnapshot(class_id);
            }

            return res.status(200).json({
                message: `Live class marked as ${status}`,
                liveClass
            });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// ======================================================
// STUDENT JOIN LIVE CLASS (TRACK ENTRY ATTENDANCE)
// ======================================================
liveClassRouter.post("/live-class/join/:class_id", authMiddleware, liveClassRateLimit, async (req, res) => {
    try {
        const { class_id } = req.params;
        const studentEmail = req.user.email;

        const liveClass = await getLiveClassSnapshot(class_id);
        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }

        if (req.user.role === "STUDENT" && liveClass.status !== "live") {
            return res.status(409).json({ error: "Attendance is recorded only while the instructor has started this class." });
        }

        if (!liveClass.meeting_url) {
            return res.status(409).json({ error: "The instructor has not generated a Google Meet link for this class yet." });
        }

        // Check enrollment
        const allowed = await canAccessCourseLiveClasses(req.user, liveClass.course_id, liveClass);
        if (!allowed) {
            return res.status(403).json({
                error: req.user.role === "STUDENT"
                    ? "You are not enrolled in this course"
                    : "You are not allowed to join this live class"
            });
        }

        if (req.user.role === "STUDENT") {
            if (liveClass.calendar_event_id) {
                const teacher = await Teacher.findOne({ email: liveClass.teacher_email });
                await ensureGoogleMeetEventAttendees({
                    calendarEventId: liveClass.calendar_event_id,
                    attendeeEmails: [studentEmail],
                }, teacher);
            }
            const studentName = await getStudentDisplayName(studentEmail, req.user.name);
            await joinLiveClass({ classId: class_id, studentEmail, studentName });
        }

        return res.status(200).json({
            message: "Joined live class successfully",
            join_url: liveClass.meeting_url,
            meeting_url: liveClass.meeting_url,
            platform_join_url: buildPlatformJoinUrl(req, class_id),
            access_granted: true,
            checked_email: studentEmail,
            room_name: liveClass.room_name,
            class_title: liveClass.title,
            course_title: liveClass.course_title,
            meeting_provider: liveClass.meeting_provider || liveClass.stream_provider || "legacy-webrtc"
        });
    } catch (error) {
        console.log("JOIN LIVE CLASS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// STUDENT LEAVE LIVE CLASS (TRACK EXIT & DURATION)
// ======================================================
liveClassRouter.post("/live-class/leave/:class_id", authMiddleware, liveClassRateLimit, async (req, res) => {
    try {
        const { class_id } = req.params;
        const studentEmail = req.user.email;

        const liveClass = await getLiveClassSnapshot(class_id);
        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }

        if (req.user.role === "STUDENT" && !(await isEnrolled(req.user.email, liveClass.course_id))) {
            return res.status(403).json({ error: "You are not enrolled in this course" });
        }

        await leaveLiveClass({ classId: class_id, studentEmail });

        return res.status(200).json({ message: "Left live class, attendance duration recorded" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// GET ATTENDANCE SHEET (PRESENT & ABSENT STUDENTS)
// ======================================================
liveClassRouter.get("/live-class/attendance/:class_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const { class_id } = req.params;

        const liveClass = await LiveClass.findOne({ class_id });
        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }
        if (req.user.role === "TEACHER" && liveClass.teacher_email !== req.user.email) {
            return res.status(403).json({ error: "You are not allowed to view this attendance report" });
        }

        // Get all enrolled students in the course
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const pageSize = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
        const [totalEnrolled, presentCounts, attendance] = await Promise.all([
            Enrollment.countDocuments({ course_id: liveClass.course_id, status: "active" }),
            Enrollment.aggregate([
                ...buildAttendancePipeline(class_id, liveClass.course_id),
                { $match: { status: "Present" } },
                { $count: "total" }
            ]),
            Enrollment.aggregate(buildAttendancePipeline(class_id, liveClass.course_id, {
                skip: (page - 1) * pageSize,
                limit: pageSize
            }))
        ]);
        const totalPresent = presentCounts[0]?.total || 0;
        const totalAbsent = Math.max(0, totalEnrolled - totalPresent);

        return res.status(200).json({
            class_id: liveClass.class_id,
            title: liveClass.title,
            course_title: liveClass.course_title,
            scheduled_time: liveClass.scheduled_time,
            started_at: liveClass.started_at,
            ended_at: liveClass.ended_at,
            total_enrolled: totalEnrolled,
            total_present: totalPresent,
            total_absent: totalAbsent,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(totalEnrolled / pageSize),
            attendance
        });
    } catch (error) {
        console.log("GET ATTENDANCE ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// ADMIN / TEACHER EXPORT ATTENDANCE CSV
// ======================================================
liveClassRouter.get("/live-class/export-attendance/:class_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const { class_id } = req.params;

        const liveClass = await LiveClass.findOne({ class_id });
        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }
        if (req.user.role === "TEACHER" && liveClass.teacher_email !== req.user.email) {
            return res.status(403).json({ error: "You are not allowed to export this attendance report" });
        }

        const allEnrolled = await Enrollment.find({ course_id: liveClass.course_id, status: "active" });
        const studentEmails = allEnrolled.map(enrollment => enrollment.student_email.toLowerCase());
        const attendanceRecords = await LiveAttendance.find({
            class_id,
            student_email: { $in: studentEmails }
        }).lean();
        const attendanceByEmail = new Map(attendanceRecords.map(record => [record.student_email.toLowerCase(), record]));
        const presentEmails = new Set(attendanceByEmail.keys());

        const csvCell = value => {
            const text = String(value ?? "").replace(/^[=+@\-]/, "'$&");
            return `"${text.replace(/"/g, '""')}"`;
        };
        let csv = "Student Name,Student Email,Course,Class Title,Status,Entered At,Left At,Duration (Minutes),Source\n";

        // Present students
        allEnrolled.forEach(e => {
            const email = e.student_email.toLowerCase();
            const record = attendanceByEmail.get(email);
            const entered = record?.entered_at ? new Date(record.entered_at).toLocaleString() : "N/A";
            const left = record?.left_at ? new Date(record.left_at).toLocaleString() : (record && liveClass.status === "live" ? "In Session" : "N/A");
            const values = [
                record?.student_name || e.student_name,
                email,
                liveClass.course_title,
                liveClass.title,
                presentEmails.has(email) ? "Present" : "Absent",
                entered,
                left,
                record?.duration_minutes || 0,
                record?.source || ""
            ];
            csv += `${values.map(csvCell).join(",")}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=attendance_${class_id}.csv`);
        return res.status(200).send(csv);

    } catch (error) {
        console.log("EXPORT CSV ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// UPDATE LIVE CLASS RECORDING (FILE OR NETWORK LINK)
// ======================================================
liveClassRouter.patch(
    "/live-class/recording/:class_id",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    upload.single("recording_file"),
    async (req, res) => {
        try {
            const { class_id } = req.params;
            const { recording_url, is_recording, recording_duration } = req.body;

            const liveClass = await LiveClass.findOne({ class_id });
            if (!liveClass) {
                return res.status(404).json({ error: "Live class not found" });
            }

            if (req.file) {
                liveClass.recording_url = await persistFile(req.file, "uniskill/recordings");
                liveClass.is_recording = false;
            } else if (recording_url) {
                liveClass.recording_url = recording_url;
            }

            if (typeof is_recording !== "undefined") {
                liveClass.is_recording = String(is_recording) === "true";
                if (liveClass.is_recording) {
                    liveClass.recording_started_at = new Date();
                }
            }

            if (recording_duration) {
                liveClass.recording_duration = recording_duration;
            }

            await liveClass.save();

            return res.status(200).json({
                message: "Live class recording updated successfully",
                liveClass
            });
        } catch (error) {
            console.log("UPDATE RECORDING ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// ======================================================
// DELETE LIVE CLASS / RECORDING
// ======================================================
liveClassRouter.delete("/live-class/:class_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const { class_id } = req.params;
        const deleted = await LiveClass.findOneAndDelete({ class_id });
        if (!deleted) {
            return res.status(404).json({ error: "Live class not found" });
        }
        return res.status(200).json({ message: "Live class and recording deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = liveClassRouter;
