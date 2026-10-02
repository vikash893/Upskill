const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
    {
        certificate_id: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        student_email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        student_name: {
            type: String,
            required: true,
            trim: true
        },
        course_id: {
            type: String,
            default: null
        },
        course_title: {
            type: String,
            required: true,
            trim: true
        },
        issue_date: {
            type: Date,
            required: true
        },
        issued_by: {
            type: String,
            required: true,
            lowercase: true
        },
        issuance_type: {
            type: String,
            enum: ["manual", "course"],
            required: true
        },
        admin_signature: {
            type: String,
            required: true
        },
        teacher_signature: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

certificateSchema.index(
    { student_email: 1, course_id: 1 },
    {
        unique: true,
        partialFilterExpression: { issuance_type: "course" }
    }
);

module.exports = mongoose.model("Certificate", certificateSchema);