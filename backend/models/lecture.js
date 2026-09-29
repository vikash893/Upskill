const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema(
    {
        lecture_id: {
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
            default: ""
        },
        video_url: {
            type: String,
            default: ""
        },
        notes_file: {
            type: String,
            default: null
        },
        duration: {
            type: String,
            default: ""
        },
        order: {
            type: Number,
            default: 1
        }
    },
    {
        timestamps: true
    }
);

lectureSchema.index({ course_id: 1, order: 1 });

module.exports = mongoose.model("Lecture", lectureSchema);
