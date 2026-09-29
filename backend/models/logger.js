const mongoose = require("mongoose");

const loggerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "Guest Visitor"
        },
        email: {
            type: String,
            default: "Guest",
            index: true
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
            default: Date.now,
            index: true
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
            default: false
        }
    },
    {
        timestamps: true
    }
);

loggerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Logger", loggerSchema);