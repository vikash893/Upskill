const express = require("express");
const Enrollment = require("../models/enrollment");
const Course = require("../models/courses");
const User = require("../models/user");
const Teacher = require("../models/teacher");
const Lecture = require("../models/lecture");
const Assignment = require("../models/assignment");
const LiveClass = require("../models/liveClass");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const enrollmentRouter = express.Router();

// ======================================================
// ENROLL IN FREE COURSE (DIRECT ENROLLMENT)
// ======================================================
enrollmentRouter.post("/enroll/free/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const student_email = req.user.email;

        const user = await User.findOne({ email: student_email });
        if (!user) {
            return res.status(404).json({ error: "Student account not found" });
        }

        const course = await Course.findOne({ course_id });
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        if (course.course_type !== "free" && course.course_amount > 0) {
            return res.status(400).json({ error: "This is a paid course. Please complete payment to enroll." });
        }

        const existingEnrollment = await Enrollment.findOne({ student_email, course_id });
        if (existingEnrollment) {
            if (existingEnrollment.status === "active") {
                return res.status(400).json({ error: "You are already enrolled in this course" });
            }
            existingEnrollment.status = "active";
            await existingEnrollment.save();
            return res.status(200).json({ message: "Re-enrolled successfully", enrollment: existingEnrollment });
        }

        const newEnrollment = new Enrollment({
            student_id: user._id,
            student_name: user.name,
            student_email: user.email,
            course_id: course.course_id,
            course_title: course.course_title,
            plan_type: "lifetime",
            plan_expiry: null,
            status: "active"
        });

        await newEnrollment.save();

        return res.status(201).json({
            message: "Successfully enrolled in free course!",
            enrollment: newEnrollment
        });
    } catch (error) {
        console.log("FREE ENROLLMENT ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// GET MY ENROLLED COURSES (STUDENT DASHBOARD)
// ======================================================
enrollmentRouter.get("/my-courses", authMiddleware, async (req, res) => {
    try {
        const student_email = req.user.email;

        const enrollments = await Enrollment.find({ student_email, status: "active" }).sort({ createdAt: -1 });
        const courseIds = enrollments.map(e => e.course_id);

        const courseList = await Course.find({ course_id: { $in: courseIds } }).lean();

        // Enrich with counts and plan metadata
        const enrichedCourses = await Promise.all(courseList.map(async (course) => {
            const lectureCount = await Lecture.countDocuments({ course_id: course.course_id });
            const assignmentCount = await Assignment.countDocuments({ course_id: course.course_id });
            const liveClasses = await LiveClass.find({ course_id: course.course_id, status: { $in: ["upcoming", "live"] } }).lean();

            const enrollment = enrollments.find(e => e.course_id === course.course_id);

            return {
                ...course,
                photo: course.photo ? course.photo.replace(/\\/g, "/") : null,
                enrolled_at: enrollment ? enrollment.enrolled_at : null,
                plan_type: enrollment ? enrollment.plan_type || "monthly" : "monthly",
                plan_expiry: enrollment ? enrollment.plan_expiry : null,
                lecture_count: lectureCount,
                assignment_count: assignmentCount,
                active_live_classes: liveClasses
            };
        }));

        return res.status(200).json({
            total: enrichedCourses.length,
            courses: enrichedCourses
        });
    } catch (error) {
        console.log("GET MY COURSES ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// GET STUDENTS IN A COURSE (TEACHER & ADMIN VIEW WITH AVATARS)
// ======================================================
enrollmentRouter.get("/course/:course_id/students", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        // If teacher, strictly verify they are assigned to this course
        if (userRole === "TEACHER") {
            const teacher = await Teacher.findOne({ email: userEmail });
            if (!teacher) {
                return res.status(403).json({ error: "Teacher account not found" });
            }
            const assigned = teacher.course_assigned || [];
            const course = await Course.findOne({ course_id });
            const isAssigned = 
                assigned.includes(course_id) ||
                (course && assigned.includes(course.course_title)) ||
                assigned.some(c => 
                    c.toLowerCase() === course_id.toLowerCase() || 
                    (course && c.toLowerCase() === course.course_title.toLowerCase())
                );

            if (!isAssigned) {
                return res.status(403).json({ error: "Access denied. You are only authorized to view students in your assigned courses." });
            }
        }

        const enrolledStudents = await Enrollment.find({ course_id, status: "active" }).sort({ createdAt: -1 }).lean();

        // Enrich with student profile photo and phone from User collection
        const enrichedStudents = await Promise.all(enrolledStudents.map(async (st) => {
            const userDoc = await User.findOne({ email: st.student_email }).select("name phone photo").lean();
            return {
                ...st,
                student_name: userDoc?.name || st.student_name,
                student_phone: userDoc?.phone || null,
                student_photo: userDoc?.photo ? userDoc.photo.replace(/\\/g, "/") : null
            };
        }));

        return res.status(200).json({
            total_students: enrichedStudents.length,
            students: enrichedStudents
        });
    } catch (error) {
        console.log("GET COURSE STUDENTS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// ADMIN REMOVE STUDENT FROM COURSE
// ======================================================
enrollmentRouter.delete("/admin/remove-student/:course_id/:student_email", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { course_id, student_email } = req.params;

        const deleted = await Enrollment.findOneAndDelete({ course_id, student_email });
        if (!deleted) {
            return res.status(404).json({ error: "Enrollment record not found" });
        }

        return res.status(200).json({
            message: "Student successfully removed from course",
            student_email,
            course_id
        });
    } catch (error) {
        console.log("REMOVE STUDENT ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// CHECK IF LOGGED-IN STUDENT IS ENROLLED IN A COURSE
// ======================================================
enrollmentRouter.get("/check-enrollment/:course_id", authMiddleware, async (req, res) => {
    try {
        const { course_id } = req.params;
        const student_email = req.user.email;

        const enrollment = await Enrollment.findOne({ student_email, course_id, status: "active" });

        return res.status(200).json({
            enrolled: !!enrollment,
            enrollment: enrollment || null
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = enrollmentRouter;
