const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        role: {
            type: String,
            required: true,
            trim: true
        },
        company: {
            type: String,
            default: "",
            trim: true
        },
        bio: {
            type: String,
            required: true,
            trim: true
        },
        photo: {
            type: String,
            default: ""
        },
        linkedin: {
            type: String,
            default: "",
            trim: true
        },
        expertise: {
            type: [String],
            default: []
        },
        order: {
            type: Number,
            default: 0
        },
        is_active: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Mentor", mentorSchema);
