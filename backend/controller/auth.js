const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Teacher = require("../models/teacher");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const { persistFile } = require("../config/cloudinary");

const emailFilterFor = (email) => {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { email: { $regex: `^${escapedEmail}$`, $options: "i" } };
};

const userRegister = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        // Check required fields
        if (!name || !phone || !normalizedEmail || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        // Check phone number
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                error: "Phone number must be exactly 10 digits"
            });
        }

        // Check password
        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long, contain one uppercase letter and one special character"
            });
        }

        const emailFilter = emailFilterFor(normalizedEmail);
        const [userExist, teacherExist, adminExist] = await Promise.all([
            User.findOne(emailFilter),
            Teacher.findOne(emailFilter),
            Admin.findOne(emailFilter)
        ]);

        if (userExist || teacherExist || adminExist) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        const photo = req.file ? await persistFile(req.file, "uniskill/avatars") : null;

        // Hash password
        const hashPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            name,
            email: normalizedEmail,
            phone,
            password: hashPassword,
            photo
        });

        await newUser.save();

        return res.status(201).json({
            message: "User registered successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};



const userlogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const emailFilter = emailFilterFor(normalizedEmail);
        const [admins, teachers, students] = await Promise.all([
            Admin.find(emailFilter).limit(2),
            Teacher.find(emailFilter).limit(2),
            User.find(emailFilter).limit(2)
        ]);

        const accounts = [
            ...admins.map(account => ({ account, role: "ADMIN" })),
            ...teachers.map(account => ({ account, role: "TEACHER" })),
            ...students.map(account => ({ account, role: "STUDENT" }))
        ];

        const matchedAccounts = await Promise.all(accounts.map(async candidate => ({
            ...candidate,
            passwordMatches: candidate.account.password
                ? await bcrypt.compare(password, candidate.account.password)
                : false
        })));
        const validAccounts = matchedAccounts.filter(candidate => candidate.passwordMatches);

        if (validAccounts.length !== 1) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const { account, role } = validAccounts[0];
        const tokenPayload = {
            id: account._id.toString(),
            email: account.email,
            name: account.name,
            role
        };
        if (role === "STUDENT") {
            tokenPayload.userId = account._id.toString();
            tokenPayload.photo = account.photo;
        } else if (role === "TEACHER") {
            tokenPayload.teacherId = account._id.toString();
        } else {
            tokenPayload.adminId = account._id.toString();
        }

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || "uniskill_2026_secret",
            { expiresIn: "7d" }
        );

        res.locals.auditIdentity = {
            email: account.email,
            name: account.name,
            role
        };

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                _id: account._id,
                name: account.name,
                email: account.email,
                role,
                photo: role === "STUDENT" ? account.photo : role === "TEACHER" ? account.photo : null
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Internal server error"
        })
    }
}

// ======================================================
// GOOGLE OAUTH LOGIN & REGISTER
// ======================================================
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!credential) {
            return res.status(400).json({ error: "A Google credential is required." });
        }

        if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            return res.status(503).json({ error: "Google sign-in is not configured on the server." });
        }

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: clientId
            });
            payload = ticket.getPayload();
        } catch (verificationError) {
            return res.status(401).json({ error: "The Google credential is invalid or expired." });
        }

        if (!payload?.email || !payload.email_verified) {
            return res.status(401).json({ error: "Google must verify the account email." });
        }

        const email = payload.email.toLowerCase().trim();
        const emailFilter = emailFilterFor(email);
        const [adminAccount, teacherAccount] = await Promise.all([
            Admin.findOne(emailFilter),
            Teacher.findOne(emailFilter)
        ]);
        if (adminAccount || teacherAccount) {
            return res.status(403).json({ error: "Use email and password to sign in to this account." });
        }

        let user = await User.findOne(emailFilter);

        if (user) {
            if (!user.google_id && payload.sub) user.google_id = payload.sub;
            if (!user.photo && payload.picture) user.photo = payload.picture;
            await user.save();
        } else {
            user = new User({
                name: payload.name || email.split("@")[0],
                email,
                phone: "",
                photo: payload.picture || null,
                google_id: payload.sub || null,
                auth_provider: "google",
                password: null
            });
            await user.save();
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: "STUDENT",
                photo: user.photo
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.locals.auditIdentity = {
            email: user.email,
            name: user.name,
            role: "STUDENT"
        };

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: "STUDENT",
                photo: user.photo
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { old_password, current_password, new_password, confirm_password } = req.body;
        const currentPassword = old_password || current_password || "";
        const newPassword = new_password || "";
        const confirmPassword = confirm_password || newPassword;

        if (!newPassword) {
            return res.status(400).json({ error: "New password is required." });
        }

        if (confirmPassword !== newPassword) {
            return res.status(400).json({ error: "New password and confirm password do not match." });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: "New password must be at least 8 characters long, contain at least one uppercase letter and one special character (!@#$%^&*)."
            });
        }

        const email = String(req.user.email || "").toLowerCase().trim();
        const role = String(req.user.role || "").toUpperCase();
        const emailFilter = emailFilterFor(email);

        let account = null;
        if (role === "ADMIN") {
            account = await Admin.findOne(emailFilter);
        } else if (role === "TEACHER") {
            account = await Teacher.findOne(emailFilter);
        } else {
            account = await User.findOne(emailFilter);
        }

        if (!account) {
            // Fallback search in all 3 models if role not matched
            account = await User.findOne(emailFilter) || await Teacher.findOne(emailFilter) || await Admin.findOne(emailFilter);
        }

        if (!account) {
            return res.status(404).json({ error: "Account not found." });
        }

        // If account has an existing password, verify current password
        if (account.password) {
            if (!currentPassword) {
                return res.status(400).json({ error: "Current password is required." });
            }
            const isMatch = await bcrypt.compare(currentPassword, account.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect." });
            }
        }

        const hashPassword = await bcrypt.hash(newPassword, 10);
        account.password = hashPassword;
        await account.save();

        return res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        return res.status(500).json({ error: "Internal server error while changing password." });
    }
};

module.exports = { userRegister, userlogin, googleAuth, changePassword };