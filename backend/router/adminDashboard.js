const express = require("express");
const User = require("../models/user");
const Teacher = require("../models/teacher");
const Course = require("../models/courses");
const Enrollment = require("../models/enrollment");
const Payment = require("../models/payment");
const Logger = require("../models/logger");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const adminDashboardRouter = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Kolkata";
const LOGIN_PATHS = [
    "/api/auth/login",
    "/api/auth/google",
    "/api/teacher-login",
    "/api/admin-login"
];

const getDayKey = (date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
}).format(date);

const getIndiaMidnight = (date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date).reduce((result, part) => {
        result[part.type] = part.value;
        return result;
    }, {});

    return new Date(Date.UTC(parts.year, Number(parts.month) - 1, parts.day) - 330 * 60 * 1000);
};

adminDashboardRouter.get(
    "/admin/dashboard/stats",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const todayStart = getIndiaMidnight(new Date());
            const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
            const weekStart = new Date(todayStart.getTime() - 6 * DAY_MS);

            const [
                totalStudents,
                totalCourses,
                totalTeachers,
                activeEnrollments,
                loginActivity,
                enrollmentActivity,
                courseEnrollments,
                revenueResult
            ] = await Promise.all([
                User.countDocuments(),
                Course.countDocuments(),
                Teacher.countDocuments(),
                Enrollment.countDocuments({ status: "active" }),
                Logger.aggregate([
                    {
                        $match: {
                            path: { $in: LOGIN_PATHS },
                            statusCode: { $gte: 200, $lt: 300 },
                            visitedAt: { $gte: weekStart, $lt: tomorrowStart }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$visitedAt",
                                    timezone: TIME_ZONE
                                }
                            },
                            total: { $sum: 1 }
                        }
                    }
                ]),
                Enrollment.aggregate([
                    {
                        $match: {
                            status: "active",
                            enrolled_at: { $gte: weekStart, $lt: tomorrowStart }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$enrolled_at",
                                    timezone: TIME_ZONE
                                }
                            },
                            total: { $sum: 1 }
                        }
                    }
                ]),
                Enrollment.aggregate([
                    { $match: { status: "active" } },
                    {
                        $group: {
                            _id: "$course_id",
                            title: { $first: "$course_title" },
                            students: { $sum: 1 }
                        }
                    },
                    { $sort: { students: -1, title: 1 } },
                    { $limit: 6 }
                ]),
                Payment.aggregate([
                    { $match: { status: "approved" } },
                    { $group: { _id: null, total: { $sum: "$final_amount" } } }
                ])
            ]);

            const loginsByDay = new Map(loginActivity.map(item => [item._id, item.total]));
            const enrollmentsByDay = new Map(enrollmentActivity.map(item => [item._id, item.total]));
            const activity = Array.from({ length: 7 }, (_, index) => {
                const day = new Date(weekStart.getTime() + index * DAY_MS);
                const key = getDayKey(day);
                return {
                    date: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(day),
                    dateKey: key,
                    logins: loginsByDay.get(key) || 0,
                    enrollments: enrollmentsByDay.get(key) || 0
                };
            });
            const todayKey = getDayKey(new Date());

            return res.status(200).json({
                overview: {
                    totalStudents,
                    totalCourses,
                    totalTeachers,
                    activeEnrollments,
                    loginsToday: loginsByDay.get(todayKey) || 0,
                    approvedRevenue: revenueResult[0]?.total || 0
                },
                activity,
                courseEnrollments: courseEnrollments.map(course => ({
                    title: course.title || course._id,
                    students: course.students
                }))
            });
        } catch (error) {
            console.log("ADMIN DASHBOARD STATS ERROR:", error);
            return res.status(500).json({ error: "Could not load dashboard statistics." });
        }
    }
);

module.exports = adminDashboardRouter;