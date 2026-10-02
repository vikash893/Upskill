const mongoose = require("mongoose");

const activityDaySchema = new mongoose.Schema(
    {
        identity_id: { type: String, required: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        role: { type: String, required: true, enum: ["STUDENT", "TEACHER", "ADMIN"] },
        day: { type: String, required: true },
        first_seen_at: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

activityDaySchema.index({ identity_id: 1, role: 1, day: 1 }, { unique: true });
activityDaySchema.index({ email: 1, day: -1 });

module.exports = mongoose.model("ActivityDay", activityDaySchema);