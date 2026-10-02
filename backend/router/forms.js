const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Form = require("../models/form");
const FormSubmission = require("../models/formSubmission");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const formsRouter = express.Router();
const allowedTypes = new Set(["text", "email", "number", "date", "textarea", "select", "checkbox"]);
const allowedAudiences = new Set(["everyone", "student", "teacher"]);

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid authorization header." });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || "uniskill_2026_secret");
        return next();
    } catch {
        return res.status(401).json({ error: "Unexpected or expired token." });
    }
};

const normalizeFields = (input) => {
    if (!Array.isArray(input)) throw new Error("Fields must be an array.");
    if (input.length > 40) throw new Error("A form can contain at most 40 fields.");

    const seenKeys = new Set();
    return input.map((field, index) => {
        const label = String(field?.label || "").trim().slice(0, 120);
        const type = allowedTypes.has(field?.type) ? field.type : "text";
        const key = String(field?.key || `field_${index + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .slice(0, 80);

        if (!label) throw new Error("Every field needs a label.");
        if (!key || seenKeys.has(key)) throw new Error("Form field keys must be unique.");
        seenKeys.add(key);

        const options = Array.isArray(field.options)
            ? [...new Set(field.options.map(option => String(option).trim().slice(0, 120)).filter(Boolean))].slice(0, 50)
            : [];
        if (type === "select" && options.length === 0) {
            throw new Error(`Add at least one option for “${label}”.`);
        }

        return { key, label, type, required: Boolean(field.required), options };
    });
};

const audienceForUser = (user) => {
    if (!user) return "guest";
    if (user.role === "STUDENT") return "student";
    if (user.role === "TEACHER") return "teacher";
    return "admin";
};

const isAudienceAllowed = (form, user) => {
    const audience = audienceForUser(user);
    return form.audience === "everyone" || form.audience === audience;
};

const validateAnswers = (form, submittedAnswers) => {
    if (!submittedAnswers || typeof submittedAnswers !== "object" || Array.isArray(submittedAnswers)) {
        throw new Error("Form answers are required.");
    }

    const answers = {};
    for (const field of form.fields) {
        const rawValue = submittedAnswers[field.key];
        const missing = rawValue === undefined || rawValue === null || rawValue === "" || (Array.isArray(rawValue) && rawValue.length === 0);

        if (field.required && (missing || (field.type === "checkbox" && rawValue !== true))) {
            throw new Error(`${field.label} is required.`);
        }
        if (missing) continue;

        if (field.type === "email") {
            const email = String(rawValue).trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error(`${field.label} must be a valid email address.`);
            }
            answers[field.key] = email.slice(0, 254);
        } else if (field.type === "number") {
            const number = Number(rawValue);
            if (!Number.isFinite(number)) throw new Error(`${field.label} must be a number.`);
            answers[field.key] = number;
        } else if (field.type === "checkbox") {
            answers[field.key] = rawValue === true;
        } else if (field.type === "select") {
            const value = String(rawValue);
            if (!field.options.includes(value)) throw new Error(`Choose a valid option for ${field.label}.`);
            answers[field.key] = value;
        } else {
            answers[field.key] = String(rawValue).trim().slice(0, 10000);
        }
    }

    return answers;
};

formsRouter.get("/forms/admin", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const forms = await Form.find({}).sort({ updatedAt: -1 }).lean();
        const counts = await FormSubmission.aggregate([
            { $group: { _id: "$form_id", count: { $sum: 1 } } }
        ]);
        const countByForm = new Map(counts.map(item => [String(item._id), item.count]));

        return res.status(200).json({
            forms: forms.map(form => ({ ...form, submission_count: countByForm.get(String(form._id)) || 0 }))
        });
    } catch (error) {
        console.log("GET ADMIN FORMS ERROR:", error);
        return res.status(500).json({ error: "Could not load forms." });
    }
});

formsRouter.post("/forms/admin", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const title = String(req.body.title || "").trim();
        const audience = req.body.audience || "everyone";
        if (!title) return res.status(400).json({ error: "Form title is required." });
        if (!allowedAudiences.has(audience)) return res.status(400).json({ error: "Choose a valid audience." });

        const fields = normalizeFields(req.body.fields || []);
        const enabled = Boolean(req.body.enabled);
        if (enabled && fields.length === 0) return res.status(400).json({ error: "Add at least one field before enabling this form." });

        const form = await Form.create({
            title,
            description: String(req.body.description || "").trim().slice(0, 1200),
            audience,
            enabled,
            fields,
            created_by: req.user.email,
            updated_by: req.user.email
        });

        return res.status(201).json({ form, message: "Form created." });
    } catch (error) {
        console.log("CREATE FORM ERROR:", error);
        return res.status(400).json({ error: error.message || "Could not create form." });
    }
});

formsRouter.patch("/forms/admin/:formId", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.formId)) {
            return res.status(400).json({ error: "Invalid form ID." });
        }

        const form = await Form.findById(req.params.formId);
        if (!form) return res.status(404).json({ error: "Form not found." });

        if (req.body.title !== undefined) {
            const title = String(req.body.title).trim();
            if (!title) return res.status(400).json({ error: "Form title is required." });
            form.title = title.slice(0, 120);
        }
        if (req.body.description !== undefined) form.description = String(req.body.description).trim().slice(0, 1200);
        if (req.body.audience !== undefined) {
            if (!allowedAudiences.has(req.body.audience)) return res.status(400).json({ error: "Choose a valid audience." });
            form.audience = req.body.audience;
        }
        if (req.body.fields !== undefined) form.fields = normalizeFields(req.body.fields);
        if (req.body.enabled !== undefined) {
            const enabled = Boolean(req.body.enabled);
            if (enabled && form.fields.length === 0) {
                return res.status(400).json({ error: "Add at least one field before enabling this form." });
            }
            form.enabled = enabled;
        }
        form.updated_by = req.user.email;
        await form.save();

        return res.status(200).json({ form, message: "Form updated." });
    } catch (error) {
        console.log("UPDATE FORM ERROR:", error);
        return res.status(400).json({ error: error.message || "Could not update form." });
    }
});

formsRouter.get("/forms/admin/submissions", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
        const filter = {};
        if (req.query.formId) {
            if (!mongoose.isValidObjectId(req.query.formId)) return res.status(400).json({ error: "Invalid form ID." });
            filter.form_id = req.query.formId;
        }

        const [submissions, total] = await Promise.all([
            FormSubmission.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            FormSubmission.countDocuments(filter)
        ]);

        return res.status(200).json({ submissions, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
        console.log("GET FORM SUBMISSIONS ERROR:", error);
        return res.status(500).json({ error: "Could not load form submissions." });
    }
});

formsRouter.get("/forms/available", optionalAuth, async (req, res) => {
    try {
        const audience = audienceForUser(req.user);
        const audiences = audience === "student" || audience === "teacher"
            ? ["everyone", audience]
            : ["everyone"];
        const forms = await Form.find({ enabled: true, audience: { $in: audiences } })
            .select("title description audience fields")
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({ forms });
    } catch (error) {
        console.log("GET AVAILABLE FORMS ERROR:", error);
        return res.status(500).json({ error: "Could not load available forms." });
    }
});

formsRouter.post("/forms/:formId/submissions", optionalAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.formId)) return res.status(400).json({ error: "Invalid form ID." });
        const form = await Form.findOne({ _id: req.params.formId, enabled: true }).lean();
        if (!form) return res.status(404).json({ error: "This form is unavailable." });
        if (!isAudienceAllowed(form, req.user)) return res.status(403).json({ error: "This form is not available for your account." });

        const answers = validateAnswers(form, req.body.answers);
        const nameField = form.fields.find(field => /\bname\b/i.test(field.label));
        const emailField = form.fields.find(field => /e-?mail/i.test(field.label));
        const respondentName = String(req.user?.name || req.body.respondent_name || answers[nameField?.key] || answers.name || "").trim().slice(0, 120);
        const respondentEmail = String(req.user?.email || req.body.respondent_email || answers[emailField?.key] || answers.email || "").trim().toLowerCase().slice(0, 254);
        const submission = await FormSubmission.create({
            form_id: form._id,
            form_title: form.title,
            audience: form.audience,
            respondent_id: req.user?.id || req.user?.userId || req.user?.teacherId || req.user?.adminId || null,
            respondent_role: req.user?.role || "GUEST",
            respondent_name: respondentName,
            respondent_email: respondentEmail,
            answers
        });

        return res.status(201).json({ message: "Your response has been submitted.", submission_id: submission._id });
    } catch (error) {
        console.log("SUBMIT FORM ERROR:", error);
        return res.status(400).json({ error: error.message || "Could not submit this form." });
    }
});

module.exports = formsRouter;