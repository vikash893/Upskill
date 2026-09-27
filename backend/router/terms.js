const express = require("express");
const Terms = require("../models/terms");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const termsRouter = express.Router();

// ======================================================
// GET ACTIVE TERMS & PRIVACY POLICY (PUBLIC)
// ======================================================
termsRouter.get("/terms", async (req, res) => {
    try {
        let terms = await Terms.findOne().sort({ updatedAt: -1 });
        if (!terms) {
            terms = new Terms();
            await terms.save();
        }

        return res.status(200).json({
            terms
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// ADMIN UPDATE TERMS & PRIVACY POLICY
// ======================================================
termsRouter.patch("/admin/terms", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { title, content, ip_logging_notice, version } = req.body;
        const adminEmail = req.user.email;

        let terms = await Terms.findOne().sort({ updatedAt: -1 });
        if (!terms) {
            terms = new Terms();
        }

        if (title) terms.title = title;
        if (content) terms.content = content;
        if (ip_logging_notice) terms.ip_logging_notice = ip_logging_notice;
        if (version) terms.version = version;
        terms.updated_by = adminEmail;

        await terms.save();

        return res.status(200).json({
            message: "Terms and conditions updated successfully",
            terms
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = termsRouter;
