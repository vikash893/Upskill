const express = require("express");
const Mentor = require("../models/mentor");
const upload = require("../config/multer");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { persistFile } = require("../config/cloudinary");
const { getCache, setCache, delCache } = require("../config/redis");

const mentorRouter = express.Router();
const CACHE_KEY = "mentors:public:list";

function parseExpertise(expertiseInput) {
    if (!expertiseInput) return [];
    if (Array.isArray(expertiseInput)) return expertiseInput.map(s => String(s).trim()).filter(Boolean);
    if (typeof expertiseInput === "string") {
        try {
            const parsed = JSON.parse(expertiseInput);
            if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
        } catch {
            // Comma separated
            return expertiseInput.split(",").map(s => s.trim()).filter(Boolean);
        }
    }
    return [];
}

// 1. PUBLIC: Get all active mentors
mentorRouter.get("/mentors", async (req, res) => {
    try {
        const cached = await getCache(CACHE_KEY);
        if (cached) {
            return res.status(200).json({ success: true, mentors: cached, cached: true });
        }

        const mentors = await Mentor.find({ is_active: true })
            .sort({ order: 1, createdAt: -1 })
            .lean();

        await setCache(CACHE_KEY, mentors, 300); // 5 minutes cache
        return res.status(200).json({ success: true, mentors });
    } catch (error) {
        console.error("GET /mentors error:", error);
        return res.status(500).json({ error: "Failed to retrieve mentors" });
    }
});

// 2. ADMIN: Get all mentors (both active and inactive)
mentorRouter.get("/admin/mentors", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const mentors = await Mentor.find()
            .sort({ order: 1, createdAt: -1 })
            .lean();
        return res.status(200).json({ success: true, mentors });
    } catch (error) {
        console.error("GET /admin/mentors error:", error);
        return res.status(500).json({ error: "Failed to retrieve mentors" });
    }
});

// 3. ADMIN: Create a new mentor (with optional photo upload)
const createMentorHandler = async (req, res) => {
    try {
        const { name, role, company, bio, linkedin, expertise, order, is_active } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Mentor name is required" });
        }
        if (!role || !role.trim()) {
            return res.status(400).json({ error: "Mentor role/designation is required" });
        }
        if (!bio || !bio.trim()) {
            return res.status(400).json({ error: "Mentor bio/about is required" });
        }

        let photoUrl = "";
        if (req.file) {
            try {
                photoUrl = await persistFile(req.file, "uniskill/mentors");
            } catch (uploadErr) {
                console.error("Mentor photo upload error:", uploadErr);
                return res.status(500).json({ error: "Failed to upload mentor photo: " + uploadErr.message });
            }
        }

        const newMentor = new Mentor({
            name: name.trim(),
            role: role.trim(),
            company: (company || "").trim(),
            bio: bio.trim(),
            photo: photoUrl || (req.body.photo ? req.body.photo.trim() : ""),
            linkedin: (linkedin || "").trim(),
            expertise: parseExpertise(expertise),
            order: Number(order) || 0,
            is_active: is_active === undefined ? true : is_active === "true" || is_active === true
        });

        await newMentor.save();
        await delCache(CACHE_KEY);

        return res.status(201).json({
            success: true,
            message: "Mentor added successfully",
            mentor: newMentor
        });
    } catch (error) {
        console.error("Add mentor error:", error);
        return res.status(500).json({ error: error.message || "Failed to create mentor" });
    }
};

mentorRouter.post("/add-mentor", authMiddleware, requireRole("ADMIN"), upload.single("photo"), createMentorHandler);
mentorRouter.post("/mentors", authMiddleware, requireRole("ADMIN"), upload.single("photo"), createMentorHandler);

// 4. ADMIN: Update an existing mentor
const updateMentorHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const mentor = await Mentor.findById(id);
        if (!mentor) {
            return res.status(404).json({ error: "Mentor not found" });
        }

        const { name, role, company, bio, linkedin, expertise, order, is_active } = req.body;

        if (name !== undefined) mentor.name = name.trim();
        if (role !== undefined) mentor.role = role.trim();
        if (company !== undefined) mentor.company = (company || "").trim();
        if (bio !== undefined) mentor.bio = (bio || "").trim();
        if (linkedin !== undefined) mentor.linkedin = (linkedin || "").trim();
        if (order !== undefined) mentor.order = Number(order) || 0;
        if (is_active !== undefined) {
            mentor.is_active = is_active === "true" || is_active === true;
        }

        if (expertise !== undefined) {
            mentor.expertise = parseExpertise(expertise);
        }

        if (req.file) {
            try {
                mentor.photo = await persistFile(req.file, "uniskill/mentors");
            } catch (uploadErr) {
                console.error("Mentor photo update upload error:", uploadErr);
                return res.status(500).json({ error: "Failed to upload mentor photo: " + uploadErr.message });
            }
        } else if (req.body.photo !== undefined && req.body.photo.trim()) {
            mentor.photo = req.body.photo.trim();
        }

        await mentor.save();
        await delCache(CACHE_KEY);

        return res.status(200).json({
            success: true,
            message: "Mentor updated successfully",
            mentor
        });
    } catch (error) {
        console.error("Update mentor error:", error);
        return res.status(500).json({ error: error.message || "Failed to update mentor" });
    }
};

mentorRouter.put("/mentor/:id", authMiddleware, requireRole("ADMIN"), upload.single("photo"), updateMentorHandler);
mentorRouter.put("/update-mentor/:id", authMiddleware, requireRole("ADMIN"), upload.single("photo"), updateMentorHandler);

// 5. ADMIN: Delete a mentor
const deleteMentorHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const mentor = await Mentor.findByIdAndDelete(id);
        if (!mentor) {
            return res.status(404).json({ error: "Mentor not found" });
        }

        await delCache(CACHE_KEY);
        return res.status(200).json({
            success: true,
            message: "Mentor deleted successfully"
        });
    } catch (error) {
        console.error("Delete mentor error:", error);
        return res.status(500).json({ error: error.message || "Failed to delete mentor" });
    }
};

mentorRouter.delete("/mentor/:id", authMiddleware, requireRole("ADMIN"), deleteMentorHandler);
mentorRouter.delete("/delete-mentor/:id", authMiddleware, requireRole("ADMIN"), deleteMentorHandler);

module.exports = mentorRouter;
