const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
    {
        student_email: {
            type: String,
            required: true,
            lowercase: true
        },
        student_name: {
            type: String,
            required: true
        },
        submission_text: {
            type: String,
            default: ""
        },
        attachment: {
            type: String,
            default: null
        },
        submitted_at: {
            type: Date,
            default: Date.now
        },
        grade: {
            type: String,
            default: null
        },
        feedback: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ["submitted", "graded"],
            default: "submitted"
        }
    },
    { _id: true }
);

const assignmentSchema = new mongoose.Schema(
    {
        assignment_id: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        course_id: {
            type: String,
            required: true,
            index: true
        },
        course_title: {
            type: String,
            required: true
        },
        teacher_email: {
            type: String,
            required: true,
            index: true
        },
        teacher_name: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        attachment: {
            type: String,
            default: null
        },
        due_date: {
            type: Date,
            default: null
        },
        total_points: {
            type: Number,
            default: 100
        },
        submissions: [submissionSchema]
    },
    {
        timestamps: true
    }
);

assignmentSchema.index({ course_id: 1, createdAt: -1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
