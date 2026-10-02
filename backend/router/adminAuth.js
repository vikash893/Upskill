const express = require('express'); 
const admin = require('../models/admin');
const User = require('../models/user');
const Teacher = require('../models/teacher');
const bcrypt = require('bcryptjs'); 
const { authRateLimit } = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

const emailFilterFor = (email) => {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { email: { $regex: `^${escapedEmail}$`, $options: "i" } };
};

const adminAuth = express.Router(); 

adminAuth.post("/create-admin", authRateLimit, authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedName = String(name || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({
                error: "Name, email, and password are required."
            });
        }

        if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/.test(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters and include an uppercase letter and a special character."
            });
        }

        const emailFilter = emailFilterFor(normalizedEmail);
        const [existingAdmin, existingTeacher, existingUser] = await Promise.all([
            admin.findOne(emailFilter),
            Teacher.findOne(emailFilter),
            User.findOne(emailFilter)
        ]);
        if (existingAdmin || existingTeacher || existingUser) {
            return res.status(400).json({
                error: "An account with this email already exists."
            });
        }

        const hashPassword = await bcrypt.hash(password, 10); 

        const newAdmin = new admin({
            name: normalizedName,
            email: normalizedEmail,
            role: "ADMIN",
            password: hashPassword
        });

        await newAdmin.save(); 

        return res.status(201).json({
            message: "Administrator added successfully.",
            admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: "ADMIN",
                createdAt: newAdmin.createdAt
            }
        });
    } catch (error) {
        console.log(error); 
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

adminAuth.get("/admin/admins", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const admins = await admin.find({}).select("name email role createdAt").sort({ createdAt: 1 }).lean();
        return res.status(200).json({ admins });
    } catch (error) {
        console.log("GET ADMINISTRATORS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = adminAuth;