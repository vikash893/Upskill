const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
    {
        course_id: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        course_title: {
            type: String,
            required: true,
            index: true
        },
        course_description: {
            type: String,
            required: true
        },
        course_amount: {
            type: Number,
            required: true
        },
        monthly_amount: {
            type: Number,
            default: 0
        },
        yearly_amount: {
            type: Number,
            default: 0
        },
        pricing_period: {
            type: String,
            enum: ["one_time", "monthly", "yearly", "both"],
            default: "both"
        },
        course_type: {
            type: String,
            enum: ["free", "paid"],
            required: true,
            index: true
        },
        photo: {
            type: String,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        discount_time: {
            type: Date,
            default: null
        },
        coupon_code: {
            type: String,
            default: null,
            index: true
        },
        coupon_discount: {
            type: Number,
            default: 0
        },
        coupon_code_time: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

courseSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Course", courseSchema);