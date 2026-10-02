const mongoose = require("mongoose");

const formFieldSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        label: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ["text", "email", "number", "date", "textarea", "select", "checkbox"],
            default: "text"
        },
        required: { type: Boolean, default: false },
        options: { type: [String], default: [] }
    },
    { _id: false }
);

const formSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, default: "", maxlength: 1200 },
        audience: {
            type: String,
            enum: ["everyone", "student", "teacher"],
            required: true,
            default: "everyone",
            index: true
        },
        enabled: { type: Boolean, default: false, index: true },
        fields: { type: [formFieldSchema], default: [] },
        created_by: { type: String, required: true, lowercase: true },
        updated_by: { type: String, required: true, lowercase: true }
    },
    { timestamps: true }
);

formSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Form", formSchema);