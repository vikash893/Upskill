const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Announcement = require("../models/announcement");
const AnnouncementRead = require("../models/announcementRead");
const Course = require("../models/courses");
const Enrollment = require("../models/enrollment");
const Teacher = require("../models/teacher");
const upload = require("../config/multer");
const { persistFile, isConfigured } = require("../config/cloudinary");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const announcementRouter = express.Router();

async function getAccessibleFilter(user) {
    if (user.role === "ADMIN") return {};

    const audience = user.role === "TEACHER" ? "teachers" : "students";
    const filters = [{ target_type: "audience", audience: "everyone" }, { target_type: "audience", audience }];

    if (user.role === "STUDENT") {
        const enrollments = await Enrollment.find({
            student_email: user.email.toLowerCase(),
            status: "active"
        }).select("course_id").lean();
        const courseIds = enrollments.map(enrollment => enrollment.course_id);
        if (courseIds.length) filters.push({ target_type: "course", course_id: { $in: courseIds } });
    } else if (user.role === "TEACHER") {
        const teacher = await Teacher.findOne({ email: user.email.toLowerCase() }).select("course_assigned").lean();
        const assigned = teacher?.course_assigned || [];
        const courses = assigned.length
            ? await Course.find({ $or: [{ course_id: { $in: assigned } }, { course_title: { $in: assigned } }] }).select("course_id").lean()
            : [];
        const courseIds = courses.map(course => course.course_id);
        if (courseIds.length) filters.push({ target_type: "course", course_id: { $in: courseIds } });
    }

    return { $or: filters };
}

async function saveAnnouncementImage(file) {
    if (!file) return null;
    if (isConfigured) {
        try {
            return await persistFile(file, "uniskill/announcements");
        } catch (err) {
            console.warn("Cloudinary upload failed for announcement image, falling back to disk:", err.message);
        }
    }

    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname || ".png");
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);
    return `uploads/${filename}`;
}

announcementRouter.get("/announcements/mine", authMiddleware, async (req, res) => {
    try {
        const filter = await getAccessibleFilter(req.user);
        const email = req.user.email.toLowerCase();
        const [summary] = await Announcement.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: AnnouncementRead.collection.name,
                    let: { announcementId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$announcement_id", "$$announcementId"] },
                                        { $eq: ["$user_email", email] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "user_read"
                }
            },
            { $addFields: { is_read: { $gt: [{ $size: "$user_read" }, 0] } } },
            {
                $facet: {
                    total: [{ $count: "count" }],
                    unread: [{ $match: { is_read: false } }, { $count: "count" }],
                    announcements: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 100 },
                        { $project: { user_read: 0 } }
                    ]
                }
            }
        ]);
        const total = summary?.total[0]?.count || 0;
        const unreadCount = summary?.unread[0]?.count || 0;

        return res.status(200).json({
            unread_count: unreadCount,
            total,
            announcements: summary?.announcements || []
        });
    } catch (error) {
        console.log("GET ANNOUNCEMENTS ERROR:", error);
        return res.status(500).json({ error: "Could not load announcements." });
    }
});

announcementRouter.post("/announcements", authMiddleware, requireRole("ADMIN", "TEACHER"), upload.single("image"), async (req, res) => {
    try {
        const title = String(req.body.title || "").trim();
        const message = String(req.body.message || "").trim();
        const targetType = req.body.target_type;

        if (!title || !message) return res.status(400).json({ error: "Announcement title and message are required." });
        if (!new Set(["course", "audience"]).has(targetType)) return res.status(400).json({ error: "Choose a valid announcement target." });

        let course = null;
        let audience = req.body.audience || null;
        if (targetType === "course") {
            if (req.user.role === "TEACHER") {
                const teacher = await Teacher.findOne({ email: req.user.email.toLowerCase() }).select("course_assigned").lean();
                const assigned = (teacher?.course_assigned || []).map(value => String(value).toLowerCase());
                course = await Course.findOne({ course_id: req.body.course_id }).select("course_id course_title").lean();
                const hasAccess = course && (assigned.includes(course.course_id.toLowerCase()) || assigned.includes(course.course_title.toLowerCase()));
                if (!hasAccess) return res.status(403).json({ error: "You can only announce in courses assigned to you." });
            } else {
                course = await Course.findOne({ course_id: req.body.course_id }).select("course_id course_title").lean();
            }
            if (!course) return res.status(404).json({ error: "Course not found." });
            audience = "students";
        } else {
            if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Only admins can send audience-wide announcements." });
            if (!new Set(["students", "teachers", "everyone"]).has(audience)) {
                return res.status(400).json({ error: "Choose students, teachers, or everyone as the audience." });
            }
        }

        let imageUrl = req.body.image_url || null;
        if (req.file) {
            imageUrl = await saveAnnouncementImage(req.file);
        }

        const announcement = await Announcement.create({
            title: title.slice(0, 140),
            message: message.slice(0, 6000),
            target_type: targetType,
            audience,
            course_id: course?.course_id || null,
            course_title: course?.course_title || null,
            image: imageUrl,
            author_id: String(req.user.id || req.user.teacherId || req.user.adminId || req.user.email),
            author_name: req.user.name || req.user.email,
            author_email: req.user.email.toLowerCase(),
            author_role: req.user.role
        });

        return res.status(201).json({ message: "Announcement published.", announcement });
    } catch (error) {
        console.log("CREATE ANNOUNCEMENT ERROR:", error);
        return res.status(500).json({ error: "Could not publish announcement." });
    }
});

announcementRouter.delete("/announcements/:announcementId", authMiddleware, requireRole("ADMIN", "TEACHER"), async (req, res) => {
    try {
        const { announcementId } = req.params;
        if (!mongoose.isValidObjectId(announcementId)) return res.status(400).json({ error: "Invalid announcement ID." });

        const announcement = await Announcement.findById(announcementId);
        if (!announcement) return res.status(404).json({ error: "Announcement not found." });

        // If teacher, check ownership or assigned course
        if (req.user.role === "TEACHER") {
            const isAuthor = announcement.author_email === req.user.email.toLowerCase();
            let hasCourseAccess = false;
            if (announcement.course_id) {
                const teacher = await Teacher.findOne({ email: req.user.email.toLowerCase() }).select("course_assigned").lean();
                const assigned = (teacher?.course_assigned || []).map(v => String(v).toLowerCase());
                hasCourseAccess = assigned.includes(announcement.course_id.toLowerCase()) || assigned.includes(String(announcement.course_title).toLowerCase());
            }
            if (!isAuthor && !hasCourseAccess) {
                return res.status(403).json({ error: "You can only delete your own announcements." });
            }
        }

        await Announcement.deleteOne({ _id: announcementId });
        await AnnouncementRead.deleteMany({ announcement_id: announcementId });

        return res.status(200).json({ message: "Announcement deleted successfully." });
    } catch (error) {
        console.log("DELETE ANNOUNCEMENT ERROR:", error);
        return res.status(500).json({ error: "Could not delete announcement." });
    }
});

announcementRouter.post("/announcements/:announcementId/read", authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.announcementId)) return res.status(400).json({ error: "Invalid announcement ID." });
        const filter = await getAccessibleFilter(req.user);
        const announcement = await Announcement.findOne({ _id: req.params.announcementId, ...filter }).select("_id").lean();
        if (!announcement) return res.status(404).json({ error: "Announcement not found." });

        await AnnouncementRead.updateOne(
            { announcement_id: announcement._id, user_email: req.user.email.toLowerCase() },
            { $setOnInsert: { read_at: new Date() } },
            { upsert: true }
        );
        return res.status(200).json({ message: "Announcement marked as read." });
    } catch (error) {
        if (error.code === 11000) return res.status(200).json({ message: "Announcement already read." });
        console.log("MARK ANNOUNCEMENT READ ERROR:", error);
        return res.status(500).json({ error: "Could not update announcement status." });
    }
});

module.exports = announcementRouter;