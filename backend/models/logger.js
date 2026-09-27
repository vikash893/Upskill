const mongoose = require("mongoose");

const loggerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "Guest Visitor"
        },
        email: {
            type: String,
            default: "Guest"
        },
        role: {
            type: String,
            default: "GUEST"
        },
        path: {
            type: String,
            required: true
        },
        method: {
            type: String,
            required: true
        },
        visitedAt: {
            type: Date,
            default: Date.now
        },
        ipAddress: {
            type: String,
            default: "127.0.0.1"
        },
        statusCode: {
            type: Number
        },
        userAgent: {
            type: String,
            default: ""
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Logger", loggerSchema);