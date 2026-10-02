const mongoose = require("mongoose");

const formSubmissionSchema = new mongoose.Schema(
    {
        form_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Form",
            required: true,
            index: true
        },
        form_title: { type: String, required: true },
        audience: { type: String, enum: ["everyone", "student", "teacher"], required: true },
        respondent_id: { type: String, default: null },
        respondent_role: { type: String, default: "GUEST" },
        respondent_name: { type: String, default: "" },
        respondent_email: { type: String, default: "", lowercase: true, trim: true },
        answers: { type: mongoose.Schema.Types.Mixed, required: true }
    },
    { timestamps: true }
);

formSubmissionSchema.index({ form_id: 1, createdAt: -1 });
formSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("FormSubmission", formSubmissionSchema);