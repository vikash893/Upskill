const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        photo: {
            type: String,
            default: null
        },

        google_refresh_token: {
            type: String,
            default: null
        },

        google_access_token: {
            type: String,
            default: null
        },

        google_token_scope: {
            type: String,
            default: null
        },

        google_token_expiry_date: {
            type: Date,
            default: null
        },

        google_account_email: {
            type: String,
            default: null,
            lowercase: true
        },

        google_meet_connected_at: {
            type: Date,
            default: null
        },

        course_assigned: {
            type: [String],
            default: []
        },
        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Teacher", teacherSchema);