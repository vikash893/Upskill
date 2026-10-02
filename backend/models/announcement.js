const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 140 },
        message: { type: String, required: true, trim: true, maxlength: 6000 },
        target_type: { type: String, enum: ["course", "audience"], required: true, index: true },
        audience: { type: String, enum: ["students", "teachers", "everyone"], default: null },
        course_id: { type: String, default: null, index: true },
        course_title: { type: String, default: null },
        image: { type: String, default: null },
        author_id: { type: String, required: true },
        author_name: { type: String, required: true },
        author_email: { type: String, required: true, lowercase: true },
        author_role: { type: String, enum: ["ADMIN", "TEACHER"], required: true }
    },
    { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Announcement", announcementSchema);