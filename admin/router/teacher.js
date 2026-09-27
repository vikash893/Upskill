const express = require('express');
const upload = require('../config/multer');
const authMiddleware = require('../middleware/Authmiddleware');
const admin = require('../../backend/models/admin');
const teacher = require('../../backend/models/teacher');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const teacherRouter = express.Router();

teacherRouter.post("/add-teacher", upload.single("photo"), authMiddleware, async (req, res) => {
    try {

        const AdminEmail = req.user.email;

        if (!AdminEmail) {
            return res.status(400).json({
                error: "Invalid token"
            })
        }

        const checkAdmin = await admin.findOne({ email: AdminEmail });

        if (!checkAdmin) {
            return res.status(400).json({
                error: "UnAutharised user"
            })
        }

        const { name, email, phone, course_assigned, password } = req.body;

        // basic validation 

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                error: "Name, email, phone, and password are required"
            })
        }

        const teacherExist = await teacher.findOne({ email });

        if (teacherExist) {
            return res.status(400).json({
                error: "Email already exists"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let assigned = [];
        if (course_assigned) {
            if (typeof course_assigned === 'string') {
                try {
                    assigned = JSON.parse(course_assigned);
                } catch {
                    assigned = course_assigned.split(',').map(s => s.trim()).filter(Boolean);
                }
            } else if (Array.isArray(course_assigned)) {
                assigned = course_assigned;
            } else {
                assigned = [course_assigned];
            }
        }

        const photoPath = req.file? `uploads/${req.file.filename}`: "";

        const newTeacher = new teacher({
            name,
            email,
            phone,
            photo: photoPath,
            course_assigned: assigned,
            password: hashedPassword
        });

        await newTeacher.save();

        res.status(200).json({
            message: "Teacher added successfully",
            teacher: {
                id: newTeacher._id,
                name: newTeacher.name,
                email: newTeacher.email,
                phone: newTeacher.phone,
                course_assigned: newTeacher.course_assigned,
                photo: newTeacher.photo
            }
        });
    } catch (error) {
        console.log("ADD TEACHER ERROR:", error);
        res.status(500).json({
            error: "Internal server error"
        });
    }
});


teacherRouter.post("/teacher-login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        const checkTeacher = await teacher.findOne({ email });

        if (!checkTeacher) {
            return res.status(400).json({
                error: "Teacher not found"
            });
        }

        const comparepassword = await bcrypt.compare(password, checkTeacher.password);

        if (!comparepassword) {
            return res.status(400).json({
                error: "Wrong email or password"
            });
        }

        const teacherToken = jwt.sign({
            teacherId: checkTeacher._id.toString(),
            email: checkTeacher.email,
            role: "TEACHER"
        },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successfully",
            token: teacherToken,
            teacherToken: teacherToken,
            teacher: {
                id: checkTeacher._id,
                name: checkTeacher.name,
                email: checkTeacher.email,
                course_assigned: checkTeacher.course_assigned
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

// GET ALL TEACHERS (FOR ADMIN AND PUBLIC LIST)
teacherRouter.get("/get-all-teachers", async (req, res) => {
    try {
        const teachersList = await teacher.find({}).select("-password").sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Teachers fetched successfully",
            total: teachersList.length,
            teachers: teachersList
        });
    } catch (error) {
        console.log("GET ALL TEACHERS ERROR:", error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

// GET CURRENT TEACHER PROFILE
teacherRouter.get("/teacher/profile", authMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        if (!email) {
            return res.status(400).json({ error: "Invalid token" });
        }
        const checkTeacher = await teacher.findOne({ email }).select("-password");
        if (!checkTeacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }
        return res.status(200).json({
            teacher: checkTeacher
        });
    } catch (error) {
        console.log("TEACHER PROFILE ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ASSIGN COURSES TO TEACHER (ADMIN)
teacherRouter.patch("/assign-courses/:teacherId", authMiddleware, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { course_assigned } = req.body;

        let assigned = course_assigned;
        if (typeof course_assigned === 'string') {
            try {
                assigned = JSON.parse(course_assigned);
            } catch {
                assigned = course_assigned.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        if (!Array.isArray(assigned)) {
            assigned = [assigned];
        }

        const updatedTeacher = await teacher.findByIdAndUpdate(
            teacherId,
            { course_assigned: assigned },
            { new: true }
        ).select("-password");

        if (!updatedTeacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        return res.status(200).json({
            message: "Courses assigned successfully",
            teacher: updatedTeacher
        });
    } catch (error) {
        console.log("ASSIGN COURSES ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// GET TEACHER'S ASSIGNED COURSES WITH STATS
teacherRouter.get("/teacher/my-courses", authMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const teacherDoc = await teacher.findOne({ email });
        if (!teacherDoc) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        const Course = require("../../backend/models/courses");
        const Enrollment = require("../../backend/models/enrollment");

        const allCourses = await Course.find({}).lean();
        const assignedNames = teacherDoc.course_assigned || [];

        const matchedCourses = allCourses.filter(c =>
            assignedNames.includes(c.course_id) ||
            assignedNames.includes(c.course_title) ||
            assignedNames.some(a => a.toLowerCase() === c.course_id.toLowerCase() || a.toLowerCase() === c.course_title.toLowerCase())
        );

        const enriched = await Promise.all(matchedCourses.map(async (c) => {
            const studentCount = await Enrollment.countDocuments({ course_id: c.course_id, status: "active" });
            return {
                ...c,
                photo: c.photo ? c.photo.replace(/\\/g, "/") : null,
                student_count: studentCount
            };
        }));

        return res.status(200).json({
            total: enriched.length,
            courses: enriched
        });
    } catch (error) {
        console.log("TEACHER COURSES ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE TEACHER
teacherRouter.delete("/delete-teacher/:teacherId", authMiddleware, async (req, res) => {
    try {
        const { teacherId } = req.params;
        const deletedTeacher = await teacher.findByIdAndDelete(teacherId);
        if (!deletedTeacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }
        return res.status(200).json({
            message: "Teacher removed successfully"
        });
    } catch (error) {
        console.log("DELETE TEACHER ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = teacherRouter; 