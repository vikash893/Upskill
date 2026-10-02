const mongoose = require("mongoose");

const announcementReadSchema = new mongoose.Schema(
    {
        announcement_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Announcement",
            required: true
        },
        user_email: { type: String, required: true, lowercase: true, trim: true },
        read_at: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

announcementReadSchema.index({ announcement_id: 1, user_email: 1 }, { unique: true });
announcementReadSchema.index({ user_email: 1, read_at: -1 });

module.exports = mongoose.model("AnnouncementRead", announcementReadSchema);