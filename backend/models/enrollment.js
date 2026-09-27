const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
    {
        student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        student_name: {
            type: String,
            required: true
        },
        student_email: {
            type: String,
            required: true
        },
        course_id: {
            type: String,
            required: true
        },
        course_title: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["active", "completed", "revoked", "expired"],
            default: "active"
        },
        plan_type: {
            type: String,
            enum: ["monthly", "yearly", "one_time", "lifetime", "free"],
            default: "monthly"
        },
        plan_expiry: {
            type: Date,
            default: null
        },
        enrolled_at: {
            type: Date,
            default: Date.now
        },
        payment_id: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

enrollmentSchema.index({ student_email: 1, course_id: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
