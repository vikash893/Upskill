const express = require("express");
const crypto = require("crypto");
const LiveClass = require("../models/liveClass");
const Course = require("../models/courses");
const Teacher = require("../models/teacher");
const User = require("../models/user");
const Enrollment = require("../models/enrollment");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const liveClassRouter = express.Router();

async function isTeacherAssigned(teacherEmail, course_id) {
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) return false;
    const course = await Course.findOne({ course_id });
    if (!course) return false;

    return (
        teacher.course_assigned.includes(course_id) ||
        teacher.course_assigned.includes(course.course_title) ||
        teacher.course_assigned.some(c => c.toLowerCase() === course_id.toLowerCase() || c.toLowerCase() === course.course_title.toLowerCase())
    );
}

// ======================================================
// CREATE LIVE CLASS (JITSI MEET)
// ======================================================
liveClassRouter.post(
    "/live-class/create",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const userEmail = req.user.email;
            const userRole = req.user.role;
            const { course_id, title, topic, scheduled_time } = req.body;

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
            // Create safe Jitsi room name (e.g. UniSkill_CourseName_RandomHex)
            const safeCoursePart = course.course_title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12);
            const randomPart = crypto.randomUUID ? crypto.randomUUID().substring(0, 8) : Math.random().toString(36).substring(2, 8);
            const room_name = `UniSkill_${safeCoursePart}_${randomPart}`;

            const newClass = new LiveClass({
                class_id,
                course_id: course.course_id,
                course_title: course.course_title,
                teacher_email: userEmail,
                teacher_name: teacherName,
                title,
                topic: topic || "",
                room_name,
                scheduled_time: scheduled_time ? new Date(scheduled_time) : new Date(),
                status: "upcoming",
                attendance: []
            });

            await newClass.save();

            return res.status(201).json({
                message: "Live class created successfully",
                liveClass: newClass
            });
        } catch (error) {
            console.log("CREATE LIVE CLASS ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// ======================================================
// GET LIVE CLASSES FOR A COURSE
// ======================================================
liveClassRouter.get("/live-class/course/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        // Verify enrollment if student
        if (userRole === "STUDENT") {
            const enrollment = await Enrollment.findOne({ student_email: userEmail, course_id, status: "active" });
            if (!enrollment) {
                return res.status(403).json({ error: "You must be enrolled in this course to view live classes" });
            }
        }

        const liveClasses = await LiveClass.find({ course_id }).sort({ createdAt: -1 });

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

            liveClass.status = status;
            if (status === "live" && !liveClass.started_at) {
                liveClass.started_at = new Date();
            } else if (status === "ended") {
                liveClass.ended_at = new Date();
            }

            await liveClass.save();

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
liveClassRouter.post("/live-class/join/:class_id", authMiddleware, async (req, res) => {
    try {
        const { class_id } = req.params;
        const studentEmail = req.user.email;

        const liveClass = await LiveClass.findOne({ class_id });
        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }

        // Check enrollment
        const enrollment = await Enrollment.findOne({ student_email: studentEmail, course_id: liveClass.course_id, status: "active" });
        if (!enrollment && req.user.role !== "ADMIN" && req.user.role !== "TEACHER") {
            return res.status(403).json({ error: "You are not enrolled in this course" });
        }

        const user = await User.findOne({ email: studentEmail });
        const studentName = user?.name || studentEmail;

        const existingAtt = liveClass.attendance.find(a => a.student_email === studentEmail);
        if (existingAtt) {
            // Re-joining or continuing
            existingAtt.left_at = null;
        } else {
            liveClass.attendance.push({
                student_email: studentEmail,
                student_name: studentName,
                entered_at: new Date(),
                left_at: null,
                duration_minutes: 0,
                status: "present"
            });
        }

        await liveClass.save();

        return res.status(200).json({
            message: "Joined live class successfully",
            room_name: liveClass.room_name,
            class_title: liveClass.title,
            course_title: liveClass.course_title
        });
    } catch (error) {
        console.log("JOIN LIVE CLASS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// STUDENT LEAVE LIVE CLASS (TRACK EXIT & DURATION)
// ======================================================
liveClassRouter.post("/live-class/leave/:class_id", authMiddleware, async (req, res) => {
    try {
        const { class_id } = req.params;
        const studentEmail = req.user.email;

        const liveClass = await LiveClass.findOne({ class_id });
        if (!liveClass) {
            return res.status(404).json({ error: "Live class not found" });
        }

        const att = liveClass.attendance.find(a => a.student_email === studentEmail);
        if (att) {
            att.left_at = new Date();
            if (att.entered_at) {
                const diffMs = att.left_at.getTime() - new Date(att.entered_at).getTime();
                att.duration_minutes = Math.round(diffMs / 60000);
            }
            await liveClass.save();
        }

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

        // Get all enrolled students in the course
        const allEnrolled = await Enrollment.find({ course_id: liveClass.course_id, status: "active" });

        const presentList = liveClass.attendance.map(a => ({
            student_email: a.student_email,
            student_name: a.student_name,
            status: "Present",
            entered_at: a.entered_at,
            left_at: a.left_at,
            duration_minutes: a.duration_minutes || (a.entered_at ? Math.round((new Date().getTime() - new Date(a.entered_at).getTime()) / 60000) : 0)
        }));

        const presentEmails = new Set(liveClass.attendance.map(a => a.student_email.toLowerCase()));

        const absentList = allEnrolled
            .filter(e => !presentEmails.has(e.student_email.toLowerCase()))
            .map(e => ({
                student_email: e.student_email,
                student_name: e.student_name,
                status: "Absent",
                entered_at: null,
                left_at: null,
                duration_minutes: 0
            }));

        const fullAttendance = [...presentList, ...absentList];

        return res.status(200).json({
            class_id: liveClass.class_id,
            title: liveClass.title,
            course_title: liveClass.course_title,
            scheduled_time: liveClass.scheduled_time,
            started_at: liveClass.started_at,
            ended_at: liveClass.ended_at,
            total_enrolled: allEnrolled.length,
            total_present: presentList.length,
            total_absent: absentList.length,
            attendance: fullAttendance
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

        const allEnrolled = await Enrollment.find({ course_id: liveClass.course_id, status: "active" });
        const presentEmails = new Set(liveClass.attendance.map(a => a.student_email.toLowerCase()));

        let csv = "Student Name,Student Email,Course,Class Title,Status,Entered At,Left At,Duration (Minutes)\n";

        // Present students
        liveClass.attendance.forEach(a => {
            const entered = a.entered_at ? new Date(a.entered_at).toLocaleString() : "N/A";
            const left = a.left_at ? new Date(a.left_at).toLocaleString() : (liveClass.status === "live" ? "In Session" : "N/A");
            const duration = a.duration_minutes || 0;
            csv += `"${a.student_name}","${a.student_email}","${liveClass.course_title}","${liveClass.title}","Present","${entered}","${left}","${duration}"\n`;
        });

        // Absent students
        allEnrolled.forEach(e => {
            if (!presentEmails.has(e.student_email.toLowerCase())) {
                csv += `"${e.student_name}","${e.student_email}","${liveClass.course_title}","${liveClass.title}","Absent","N/A","N/A","0"\n`;
            }
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
const upload = require("../config/multer");

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
                liveClass.recording_url = `uploads/${req.file.filename}`.replace(/\\/g, "/");
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
