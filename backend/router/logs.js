const express = require("express");
const Logger = require("../models/logger");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const logsRouter = express.Router();

// ======================================================
// GET SYSTEM LOGS (ADMIN AUDIT TRAIL)
// ======================================================
logsRouter.get("/admin/logs", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const total = await Logger.countDocuments();
        const logs = await Logger.find().sort({ createdAt: -1 }).skip(skip).limit(limit);

        return res.status(200).json({
            total,
            page,
            pages: Math.ceil(total / limit),
            logs
        });
    } catch (error) {
        console.log("GET LOGS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// CLEAR LOGS
// ======================================================
logsRouter.delete("/admin/logs/clear", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        await Logger.deleteMany({});
        return res.status(200).json({ message: "All system activity logs cleared successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = logsRouter;
