const express = require("express");
const Job = require("../models/job");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const jobRouter = express.Router();

// Helper to normalize URL
function normalizeUrl(url) {
    if (!url) return "";
    let trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = "https://" + trimmed;
    }
    return trimmed;
}

// ======================================================
// 1. GET ALL JOBS & INTERNSHIPS (Student, Teacher, Admin)
// ======================================================
jobRouter.get(
    "/jobs",
    authMiddleware,
    async (req, res) => {
        try {
            const { type, branch, search, source, status } = req.query;
            const query = {};

            // If non-admin, only show active listings by default
            if (req.user.role !== "ADMIN") {
                query.status = "active";
            } else if (status && status !== "all") {
                query.status = status;
            }

            // Filter by type: "job" or "internship"
            if (type && type !== "all") {
                query.type = type.toLowerCase();
            }

            // Filter by source platform (e.g., LinkedIn, Instagram)
            if (source && source !== "all") {
                query.source_platform = new RegExp(`^${source.trim()}$`, "i");
            }

            // Filter by target branch/course (e.g. BCA, BBA, B.Tech)
            if (branch && branch !== "all" && branch !== "All Branches") {
                query.$or = [
                    { target_branches: { $regex: new RegExp(branch.trim(), "i") } },
                    { target_branches: { $in: ["All Branches", "All", "Any", "Any Graduate"] } }
                ];
            }

            // Search query across title, company, location, and description
            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), "i");
                const searchFilter = {
                    $or: [
                        { title: searchRegex },
                        { company: searchRegex },
                        { location: searchRegex },
                        { description: searchRegex }
                    ]
                };

                if (query.$or) {
                    query.$and = [{ $or: query.$or }, searchFilter];
                    delete query.$or;
                } else {
                    query.$or = searchFilter.$or;
                }
            }

            const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();

            // Overall stats
            const totalJobs = await Job.countDocuments({ type: "job", status: "active" });
            const totalInternships = await Job.countDocuments({ type: "internship", status: "active" });

            return res.status(200).json({
                message: "Jobs fetched successfully",
                total: jobs.length,
                stats: {
                    total_jobs: totalJobs,
                    total_internships: totalInternships
                },
                jobs
            });
        } catch (error) {
            console.error("GET JOBS ERROR:", error);
            return res.status(500).json({ error: "Failed to fetch jobs & internships." });
        }
    }
);

// ======================================================
// 2. GET SINGLE JOB DETAILS
// ======================================================
jobRouter.get(
    "/jobs/:id",
    authMiddleware,
    async (req, res) => {
        try {
            const job = await Job.findById(req.params.id).lean();
            if (!job) {
                return res.status(404).json({ error: "Job listing not found." });
            }
            return res.status(200).json({ job });
        } catch (error) {
            console.error("GET SINGLE JOB ERROR:", error);
            return res.status(500).json({ error: "Failed to fetch job details." });
        }
    }
);

// ======================================================
// 3. CREATE JOB / INTERNSHIP (Admin Only)
// ======================================================
jobRouter.post(
    "/jobs",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const {
                title,
                type = "job",
                company,
                location = "Remote",
                source_platform = "Other",
                apply_url,
                description,
                target_branches = ["All Branches"],
                salary_or_stipend = "Best in industry",
                experience = "Fresher / Students",
                deadline = null,
                status = "active"
            } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({ error: "Job title is required." });
            }
            if (!company || !company.trim()) {
                return res.status(400).json({ error: "Company or organization name is required." });
            }
            if (!apply_url || !apply_url.trim()) {
                return res.status(400).json({ error: "Source / apply link is required." });
            }
            if (!description || !description.trim()) {
                return res.status(400).json({ error: "Job description is required." });
            }

            // Format target branches array
            let branchesArray = [];
            if (Array.isArray(target_branches)) {
                branchesArray = target_branches.map(b => String(b).trim()).filter(Boolean);
            } else if (typeof target_branches === "string") {
                branchesArray = target_branches.split(",").map(b => b.trim()).filter(Boolean);
            }
            if (branchesArray.length === 0) {
                branchesArray = ["All Branches"];
            }

            const newJob = new Job({
                title: title.trim(),
                type: type.toLowerCase() === "internship" ? "internship" : "job",
                company: company.trim(),
                location: location.trim() || "Remote",
                source_platform: source_platform.trim() || "Other",
                apply_url: normalizeUrl(apply_url),
                description: description.trim(),
                target_branches: branchesArray,
                salary_or_stipend: salary_or_stipend.trim() || "Best in industry",
                experience: experience.trim() || "Fresher / Students",
                deadline: deadline ? new Date(deadline) : null,
                status: status === "closed" ? "closed" : "active",
                created_by_name: req.user.name || "Admin",
                created_by_email: req.user.email || ""
            });

            await newJob.save();

            return res.status(201).json({
                message: `${newJob.type === "internship" ? "Internship" : "Job"} listing posted successfully!`,
                job: newJob
            });
        } catch (error) {
            console.error("CREATE JOB ERROR:", error);
            return res.status(500).json({ error: error.message || "Failed to create job listing." });
        }
    }
);

// ======================================================
// 4. UPDATE JOB / INTERNSHIP (Admin Only)
// ======================================================
jobRouter.put(
    "/jobs/:id",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const job = await Job.findById(id);
            if (!job) {
                return res.status(404).json({ error: "Job listing not found." });
            }

            const {
                title,
                type,
                company,
                location,
                source_platform,
                apply_url,
                description,
                target_branches,
                salary_or_stipend,
                experience,
                deadline,
                status
            } = req.body;

            if (title !== undefined) job.title = title.trim();
            if (type !== undefined) job.type = type.toLowerCase() === "internship" ? "internship" : "job";
            if (company !== undefined) job.company = company.trim();
            if (location !== undefined) job.location = location.trim();
            if (source_platform !== undefined) job.source_platform = source_platform.trim();
            if (apply_url !== undefined) job.apply_url = normalizeUrl(apply_url);
            if (description !== undefined) job.description = description.trim();
            if (salary_or_stipend !== undefined) job.salary_or_stipend = salary_or_stipend.trim();
            if (experience !== undefined) job.experience = experience.trim();
            if (status !== undefined) job.status = status;
            if (deadline !== undefined) job.deadline = deadline ? new Date(deadline) : null;

            if (target_branches !== undefined) {
                let branchesArray = [];
                if (Array.isArray(target_branches)) {
                    branchesArray = target_branches.map(b => String(b).trim()).filter(Boolean);
                } else if (typeof target_branches === "string") {
                    branchesArray = target_branches.split(",").map(b => b.trim()).filter(Boolean);
                }
                job.target_branches = branchesArray.length > 0 ? branchesArray : ["All Branches"];
            }

            await job.save();

            return res.status(200).json({
                message: "Job listing updated successfully!",
                job
            });
        } catch (error) {
            console.error("UPDATE JOB ERROR:", error);
            return res.status(500).json({ error: error.message || "Failed to update job listing." });
        }
    }
);

// ======================================================
// 5. DELETE JOB / INTERNSHIP (Admin Only)
// ======================================================
jobRouter.delete(
    "/jobs/:id",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const job = await Job.findByIdAndDelete(id);
            if (!job) {
                return res.status(404).json({ error: "Job listing not found." });
            }

            return res.status(200).json({
                message: "Job listing deleted successfully.",
                id
            });
        } catch (error) {
            console.error("DELETE JOB ERROR:", error);
            return res.status(500).json({ error: "Failed to delete job listing." });
        }
    }
);

module.exports = jobRouter;
