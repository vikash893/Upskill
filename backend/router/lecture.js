const express = require("express");
const crypto = require("crypto");
const Lecture = require("../models/lecture");
const Course = require("../models/courses");
const Teacher = require("../models/teacher");
const Enrollment = require("../models/enrollment");
const upload = require("../config/multer");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const lectureRouter = express.Router();

async function isTeacherAssigned(teacherEmail, course_id) {
    const teacher = await Teacher.findOne({ email: teacherEmail });
    if (!teacher) return false;
    const course = await Course.findOne({ course_id });
    if (!course) return false;

    const assigned = teacher.course_assigned || [];
    return (
        assigned.includes(course_id) ||
        assigned.includes(course.course_title) ||
        assigned.some(c => 
            c.toLowerCase() === course_id.toLowerCase() || 
            c.toLowerCase() === course.course_title.toLowerCase() ||
            course.course_title.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(course.course_title.toLowerCase())
        )
    );
}

// ======================================================
// ADD LECTURE (SUPPORTS LOCAL FILE UPLOADS & NETWORK LINKS)
// ======================================================
lectureRouter.post(
    "/lecture/add",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    upload.fields([
        { name: "video_file", maxCount: 1 },
        { name: "notes", maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            const userEmail = req.user.email;
            const userRole = req.user.role;
            const { course_id, title, description, video_url, duration, order } = req.body;

            if (!course_id || !title) {
                return res.status(400).json({ error: "Course ID and lecture title are required" });
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

            const lecture_id = `lec_${crypto.randomUUID ? crypto.randomUUID().substring(0, 10) : Date.now().toString(36)}`;
            
            // Determine video URL (local uploaded file vs network link)
            let finalVideoUrl = video_url || "";
            if (req.files && req.files.video_file && req.files.video_file.length > 0) {
                finalVideoUrl = `uploads/${req.files.video_file[0].filename}`.replace(/\\/g, "/");
            }

            // Determine notes file
            let notesPath = null;
            if (req.files && req.files.notes && req.files.notes.length > 0) {
                notesPath = `uploads/${req.files.notes[0].filename}`.replace(/\\/g, "/");
            }

            const newLecture = new Lecture({
                lecture_id,
                course_id: course.course_id,
                course_title: course.course_title,
                teacher_email: userEmail,
                teacher_name: teacherName,
                title,
                description: description || "",
                video_url: finalVideoUrl,
                notes_file: notesPath,
                duration: duration || "",
                order: order ? Number(order) : 1
            });

            await newLecture.save();

            return res.status(201).json({
                message: "Lecture added successfully",
                lecture: newLecture
            });
        } catch (error) {
            console.log("ADD LECTURE ERROR:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
);

// ======================================================
// GET LECTURES FOR A COURSE
// ======================================================
lectureRouter.get("/lecture/course/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        // If student, check enrollment
        if (userRole === "STUDENT") {
            const enrollment = await Enrollment.findOne({ student_email: userEmail, course_id, status: "active" });
            if (!enrollment) {
                return res.status(403).json({ error: "You must be enrolled in this course to view lectures" });
            }
        }

        const lectures = await Lecture.find({ course_id }).sort({ order: 1, createdAt: 1 }).lean();

        const processed = lectures.map(l => ({
            ...l,
            notes_file: l.notes_file ? l.notes_file.replace(/\\/g, "/") : null
        }));

        return res.status(200).json({
            total: processed.length,
            lectures: processed
        });
    } catch (error) {
        console.log("GET LECTURES ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// DELETE LECTURE
// ======================================================
lectureRouter.delete("/lecture/:lecture_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const { lecture_id } = req.params;
        const deleted = await Lecture.findOneAndDelete({ lecture_id });
        if (!deleted) {
            return res.status(404).json({ error: "Lecture not found" });
        }
        return res.status(200).json({ message: "Lecture deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = lectureRouter;
