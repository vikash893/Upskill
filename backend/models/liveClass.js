const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        student_email: {
            type: String,
            required: true
        },
        student_name: {
            type: String,
            required: true
        },
        entered_at: {
            type: Date,
            default: Date.now
        },
        left_at: {
            type: Date,
            default: null
        },
        duration_minutes: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ["present", "absent"],
            default: "present"
        }
    },
    { _id: true }
);

const liveClassSchema = new mongoose.Schema(
    {
        class_id: {
            type: String,
            required: true,
            unique: true
        },
        course_id: {
            type: String,
            required: true
        },
        course_title: {
            type: String,
            required: true
        },
        teacher_email: {
            type: String,
            required: true
        },
        teacher_name: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        topic: {
            type: String,
            default: ""
        },
        room_name: {
            type: String,
            required: true
        },
        scheduled_time: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["upcoming", "live", "ended"],
            default: "upcoming"
        },
        started_at: {
            type: Date,
            default: null
        },
        ended_at: {
            type: Date,
            default: null
        },
        is_recording: {
            type: Boolean,
            default: false
        },
        recording_url: {
            type: String,
            default: null
        },
        recording_started_at: {
            type: Date,
            default: null
        },
        recording_duration: {
            type: String,
            default: ""
        },
        attendance: [attendanceSchema]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("LiveClass", liveClassSchema);
