const express = require("express");
const ActivityDay = require("../models/activityDay");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const activityRouter = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Kolkata";

function getTodayKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date()).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function previousDay(dayKey) {
    return new Date(Date.parse(`${dayKey}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

activityRouter.post(
    "/activity/check-in",
    authMiddleware,
    requireRole("STUDENT", "TEACHER", "ADMIN"),
    async (req, res) => {
        try {
            const email = String(req.user.email).toLowerCase();
            const identityId = String(req.user.id || req.user.userId || req.user.teacherId || req.user.adminId || email);
            const role = req.user.role;
            const today = getTodayKey();

            try {
                await ActivityDay.updateOne(
                    { identity_id: identityId, role, day: today },
                    { $setOnInsert: { email, identity_id: identityId, role, day: today, first_seen_at: new Date() } },
                    { upsert: true }
                );
            } catch (error) {
                if (error.code !== 11000) throw error;
            }

            const records = await ActivityDay.find({ identity_id: identityId, role })
                .select("day")
                .sort({ day: -1 })
                .lean();
            const activeDays = new Set(records.map(record => record.day));

            let currentStreak = 0;
            let cursor = today;
            while (activeDays.has(cursor)) {
                currentStreak += 1;
                cursor = previousDay(cursor);
            }

            let longestStreak = 0;
            let runningStreak = 0;
            let priorDay = null;
            const ascendingDays = records.map(record => record.day).sort();
            for (const day of ascendingDays) {
                runningStreak = priorDay && Date.parse(`${day}T00:00:00Z`) - Date.parse(`${priorDay}T00:00:00Z`) === DAY_MS
                    ? runningStreak + 1
                    : 1;
                longestStreak = Math.max(longestStreak, runningStreak);
                priorDay = day;
            }

            const start = Date.parse(`${today}T00:00:00Z`) - 364 * DAY_MS;
            const heatmap = Array.from({ length: 365 }, (_, index) => {
                const date = new Date(start + index * DAY_MS).toISOString().slice(0, 10);
                return { date, active: activeDays.has(date) };
            });

            return res.status(200).json({
                today,
                current_streak: currentStreak,
                longest_streak: longestStreak,
                active_days: activeDays.size,
                heatmap
            });
        } catch (error) {
            console.log("ACTIVITY CHECK-IN ERROR:", error);
            return res.status(500).json({ error: "Could not update daily activity." });
        }
    }
);

module.exports = activityRouter;