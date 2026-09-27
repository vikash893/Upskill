const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Assignment = require("../models/assignment");
const Course = require("../models/courses");
const Teacher = require("../models/teacher");
const User = require("../models/user");
const Enrollment = require("../models/enrollment");
const upload = require("../config/multer");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const assignmentRouter = express.Router();

// Helper to check if teacher is assigned to course
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
// TEACHER CREATE ASSIGNMENT
// ======================================================
assignmentRouter.post(
    "/assignment/create",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    upload.single("attachment"),
    async (req, res) => {
        try {
            const userEmail = req.user.email;
            const userRole = req.user.role;
            const { course_id, title, description, due_date, total_points } = req.body;

            if (!course_id || !title || !description) {
                return res.status(400).json({ error: "Course ID, title, and description are required" });
            }

            const course = await Course.findOne({ course_id });
            if (!course) {
                return res.status(404).json({ error: "Course not found" });
            }

            if (userRole === "TEACHER") {
                const assigned = await isTeacherAssigned(userEmail, course_id);
                if (!assigned) {
                    return res.status(403).json({ error: `You are not assigned to teach course "${course.course_title}"` });
                }
            }

            const teacherDoc = await Teacher.findOne({ email: userEmail });
            const teacherName = teacherDoc?.name || req.user.name || "Course Instructor";

            const assignment_id = `asg_${crypto.randomUUID ? crypto.randomUUID().substring(0, 10) : Date.now().toString(36)}`;
            const attachmentPath = req.file ? `uploads/${req.file.filename}`.replace(/\\/g, "/") : null;

            const newAssignment = new Assignment({
                assignment_id,
                course_id: course.course_id,
                course_title: course.course_title,
                teacher_email: userEmail,
                teacher_name: teacherName,
                title,
                description,
                attachment: attachmentPath,
                due_date: due_date ? new Date(due_date) : null,
                total_points: total_points ? Number(total_points) : 100,
                submissions: []
            });

            await newAssignment.save();

            return res.status(201).json({
                message: "Assignment created successfully",
                assignment: newAssignment
            });
        } catch (error) {
            console.log("CREATE ASSIGNMENT ERROR:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
);

// ======================================================
// GET ASSIGNMENTS FOR A COURSE
// ======================================================
assignmentRouter.get("/assignment/course/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        // Verify access: Admin, assigned teacher, or enrolled student
        if (userRole === "STUDENT") {
            const enrollment = await Enrollment.findOne({ student_email: userEmail, course_id, status: "active" });
            if (!enrollment) {
                return res.status(403).json({ error: "You must be enrolled in this course to view assignments" });
            }
        }

        const assignments = await Assignment.find({ course_id }).sort({ createdAt: -1 }).lean();

        // If student, attach their specific submission status
        const processed = assignments.map(a => {
            const mySub = a.submissions?.find(s => s.student_email?.toLowerCase() === userEmail?.toLowerCase());
            return {
                ...a,
                attachment: a.attachment ? a.attachment.replace(/\\/g, "/") : null,
                my_submission: mySub || null,
                submission_count: a.submissions?.length || 0,
                submissions: userRole === "STUDENT" ? undefined : a.submissions
            };
        });

        return res.status(200).json({
            total: processed.length,
            assignments: processed
        });
    } catch (error) {
        console.log("GET ASSIGNMENTS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// STUDENT SUBMIT ASSIGNMENT
// ======================================================
assignmentRouter.post(
    "/assignment/submit/:assignment_id",
    authMiddleware,
    upload.single("attachment"),
    async (req, res) => {
        try {
            const { assignment_id } = req.params;
            const studentEmail = req.user.email;
            const { submission_text } = req.body;

            const assignment = await Assignment.findOne({ assignment_id });
            if (!assignment) {
                return res.status(404).json({ error: "Assignment not found" });
            }

            // Verify enrollment (if student)
            if (req.user.role === "STUDENT") {
                const enrollment = await Enrollment.findOne({ student_email: studentEmail, course_id: assignment.course_id, status: "active" });
                if (!enrollment) {
                    return res.status(403).json({ error: "You are not enrolled in this course" });
                }
            }

            const user = await User.findOne({ email: studentEmail });
            const studentName = user?.name || req.user.name || studentEmail;

            const attachmentPath = req.file ? `uploads/${req.file.filename}`.replace(/\\/g, "/") : null;

            const existingSubIndex = assignment.submissions.findIndex(s => s.student_email?.toLowerCase() === studentEmail?.toLowerCase());

            const submissionData = {
                student_email: studentEmail,
                student_name: studentName,
                submission_text: submission_text || "",
                attachment: attachmentPath || (existingSubIndex >= 0 ? assignment.submissions[existingSubIndex].attachment : null),
                submitted_at: new Date(),
                status: "submitted"
            };

            if (existingSubIndex >= 0) {
                assignment.submissions[existingSubIndex] = submissionData;
            } else {
                assignment.submissions.push(submissionData);
            }

            await assignment.save();

            return res.status(200).json({
                message: "Assignment submitted successfully!",
                submission: submissionData
            });
        } catch (error) {
            console.log("SUBMIT ASSIGNMENT ERROR:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
);

// ======================================================
// TEACHER VIEW ALL SUBMISSIONS FOR ASSIGNMENT
// ======================================================
assignmentRouter.get("/assignment/submissions/:assignment_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const { assignment_id } = req.params;

        const assignment = await Assignment.findOne({ assignment_id });
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        return res.status(200).json({
            assignment_id: assignment.assignment_id,
            title: assignment.title,
            course_title: assignment.course_title,
            total_points: assignment.total_points,
            submissions: assignment.submissions
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// TEACHER GRADE SUBMISSION
// ======================================================
assignmentRouter.patch(
    "/assignment/grade/:assignment_id/:student_email",
    authMiddleware,
    requireRole("TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const { assignment_id, student_email } = req.params;
            const { grade, feedback } = req.body;

            const assignment = await Assignment.findOne({ assignment_id });
            if (!assignment) {
                return res.status(404).json({ error: "Assignment not found" });
            }

            const sub = assignment.submissions.find(s => s.student_email?.toLowerCase() === student_email?.toLowerCase());
            if (!sub) {
                return res.status(404).json({ error: "Student submission not found" });
            }

            sub.grade = grade;
            sub.feedback = feedback || "";
            sub.status = "graded";

            await assignment.save();

            return res.status(200).json({
                message: "Submission graded successfully",
                submission: sub
            });
        } catch (error) {
            console.log("GRADE ASSIGNMENT ERROR:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
);

// ======================================================
// DELETE ASSIGNMENT
// ======================================================
assignmentRouter.delete("/assignment/:assignment_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const { assignment_id } = req.params;
        await Assignment.findOneAndDelete({ assignment_id });
        return res.status(200).json({ message: "Assignment deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = assignmentRouter;
