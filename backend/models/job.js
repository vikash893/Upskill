const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },
        type: {
            type: String,
            enum: ["job", "internship"],
            default: "job",
            required: true,
            index: true
        },
        company: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },
        location: {
            type: String,
            default: "Remote",
            trim: true,
            maxlength: 150
        },
        source_platform: {
            type: String,
            default: "Other",
            trim: true,
            maxlength: 100
        },
        apply_url: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        target_branches: {
            type: [String],
            default: ["All Branches"]
        },
        salary_or_stipend: {
            type: String,
            default: "Best in industry",
            trim: true,
            maxlength: 100
        },
        experience: {
            type: String,
            default: "Fresher / Students",
            trim: true,
            maxlength: 100
        },
        deadline: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ["active", "closed"],
            default: "active",
            index: true
        },
        created_by_name: {
            type: String,
            default: "Admin"
        },
        created_by_email: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

jobSchema.index({ createdAt: -1 });
jobSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
