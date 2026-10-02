const jwt = require("jsonwebtoken");
const Logger = require("../models/logger");
const { publishKafkaEvent, getAuditLogTopic } = require("../config/kafka");

// In-memory batch buffer for high-throughput non-blocking request logging
const logBuffer = [];
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2000;

async function flushLogBuffer() {
    if (logBuffer.length === 0) return;
    const batch = logBuffer.splice(0, logBuffer.length);
    try {
        await Logger.insertMany(batch, { ordered: false });
    } catch (err) {
        console.error("Batch logger write error:", err.message);
    }
}

// Periodic background flusher
setInterval(() => {
    if (logBuffer.length > 0) {
        flushLogBuffer().catch(() => {});
    }
}, FLUSH_INTERVAL_MS).unref();

const logger = (req, res, next) => {
    const url = req.originalUrl || req.url;

    // Skip static assets, health checks, and preflights to preserve high performance
    if (
        req.method === "OPTIONS" ||
        url.startsWith("/uploads/") ||
        url.startsWith("/api/health") ||
        url.includes("favicon.ico")
    ) {
        return next();
    }

    let email = "Guest";
    let name = "Guest Visitor";
    let role = "GUEST";

    // Fast non-blocking identity extraction from JWT header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "uniskill_2026_secret");
            email = decoded.email || email;
            role = decoded.role || role;
            name = decoded.name || (role === "ADMIN" ? "Administrator" : email);
        } catch {
            try {
                const decoded = jwt.decode(token);
                if (decoded && decoded.email) {
                    email = decoded.email;
                    role = decoded.role || role;
                    name = decoded.name || email;
                }
            } catch {}
        }
    } else if (req.body && req.body.email) {
        email = req.body.email;
        if (req.body.name) name = req.body.name;
    }

    const rawIp =
        req.headers["x-forwarded-for"] ||
        req.headers["x-real-ip"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "127.0.0.1";

    const ipAddress = typeof rawIp === "string" ? rawIp.split(",")[0].trim().replace(/^::ffff:/, "") : "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const method = req.method;
    const startTime = Date.now();

    // On response completion, queue log entry asynchronously
    res.on("finish", () => {
        const auditIdentity = res.locals.auditIdentity;
        const logEntry = {
            name: auditIdentity?.name || name,
            email: auditIdentity?.email || email,
            role: auditIdentity?.role || role,
            path: url,
            method,
            ipAddress,
            userAgent: userAgent.substring(0, 250),
            statusCode: res.statusCode,
            visitedAt: new Date(startTime),
            isActive: false
        };

        publishKafkaEvent(getAuditLogTopic(), logEntry.email, logEntry).catch(() => {});
        logBuffer.push(logEntry);
        if (logBuffer.length >= BATCH_SIZE) {
            flushLogBuffer().catch(() => {});
        }
    });

    next();
};

module.exports = logger;
module.exports.flushLogBuffer = flushLogBuffer;