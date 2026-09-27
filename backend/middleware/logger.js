const jwt = require("jsonwebtoken");
const Logger = require("../models/logger");
const User = require("../models/user");
const Teacher = require("../models/teacher");

const logger = async (req, res, next) => {
    try {
        let email = "Guest";
        let name = "Guest Visitor";
        let role = "GUEST";

        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                email = decoded.email || email;
                role = decoded.role || role;

                if (role === "STUDENT") {
                    const u = await User.findOne({ email }).lean();
                    if (u) name = u.name;
                } else if (role === "TEACHER") {
                    const t = await Teacher.findOne({ email }).lean();
                    if (t) name = t.name;
                } else if (role === "ADMIN") {
                    name = "Administrator";
                }
            } catch (err) {
                // Token expired or invalid, keep guest or decoded values if possible
                try {
                    const decoded = jwt.decode(token);
                    if (decoded && decoded.email) {
                        email = decoded.email;
                        role = decoded.role || role;
                    }
                } catch {}
            }
        } else if (req.body && req.body.email) {
            // For login or registration requests
            email = req.body.email;
            if (req.body.name) name = req.body.name;
        }

        // Extract IP address
        const rawIp =
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            req.socket.remoteAddress ||
            req.ip ||
            "127.0.0.1";

        const ipAddress = typeof rawIp === "string" ? rawIp.split(",")[0].trim().replace(/^::ffff:/, "") : "127.0.0.1";

        const log = await Logger.create({
            name: name,
            email: email,
            role: role,
            path: req.originalUrl || req.url,
            method: req.method,
            ipAddress: ipAddress,
            userAgent: req.headers["user-agent"] || "",
            isActive: true
        });

        // When response finishes
        res.on("finish", async () => {
            try {
                await Logger.findByIdAndUpdate(log._id, {
                    statusCode: res.statusCode,
                    isActive: false
                });
            } catch {}
        });

        next();
    } catch (error) {
        console.log("Logger Error:", error);
        next();
    }
};

module.exports = logger;