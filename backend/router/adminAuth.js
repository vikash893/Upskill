const express = require('express'); 
const admin = require('../models/admin');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const { authRateLimit } = require('../middleware/rateLimit');

const adminAuth = express.Router(); 

adminAuth.post("/create-admin", authRateLimit, async (req, res) => {
    try {
        const { name, email, role, password } = req.body; 

        if (!name || !email || !role || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        const existingAdmin = await admin.findOne({ email: email.toLowerCase().trim() });
        if (existingAdmin) {
            return res.status(400).json({
                error: "Admin email already exists"
            });
        }

        const hashPassword = await bcrypt.hash(password, 10); 

        const newAdmin = new admin({
            name, 
            email: email.toLowerCase().trim(), 
            role, 
            password: hashPassword
        });

        await newAdmin.save(); 

        return res.status(200).json({
            message: "Admin registered successfully"
        });
    } catch (error) {
        console.log(error); 
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

adminAuth.post("/admin-login", authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body; 

        if (!email || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        const adminExist = await admin.findOne({ email: email.toLowerCase().trim() }); 

        if (!adminExist) {
            return res.status(400).json({
                error: "Wrong email or password"
            });
        }

        const comparePassword = await bcrypt.compare(password, adminExist.password); 

        if (!comparePassword) {
            return res.status(400).json({
                error: "Wrong email or password"
            });
        }

        const token = jwt.sign({
            adminId: adminExist._id.toString(),
            id: adminExist._id.toString(),
            email: adminExist.email,
            name: adminExist.name,
            role: "ADMIN"
        }, 
        process.env.JWT_SECRET || "uniskill_2026_secret", 
        { expiresIn: "7d" });

        return res.status(200).json({
            message: "Login successfully", 
            token,
            admin: {
                id: adminExist._id,
                name: adminExist.name,
                email: adminExist.email,
                role: "ADMIN"
            }
        });
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = adminAuth;