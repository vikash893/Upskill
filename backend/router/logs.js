const express = require("express");
const Logger = require("../models/logger");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { getPaginationParams, buildPaginationMetadata } = require("../utils/pagination");

const logsRouter = express.Router();

// ======================================================
// GET SYSTEM LOGS (ADMIN AUDIT TRAIL)
// ======================================================
logsRouter.get("/admin/logs", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { search } = req.query;
        const filter = {};
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [{ email: regex }, { ip: regex }, { method: regex }, { path: regex }];
        }

        const { page, limit, skip } = getPaginationParams(req, 25, 100);

        const [total, logs] = await Promise.all([
            Logger.countDocuments(filter),
            Logger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
        ]);

        return res.status(200).json({
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            logs,
            pagination: buildPaginationMetadata(total, page, limit)
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
