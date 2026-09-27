const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        payment_id: {
            type: String,
            required: true,
            unique: true
        },
        student_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        },
        student_name: {
            type: String,
            required: true
        },
        student_email: {
            type: String,
            required: true
        },
        course_id: {
            type: String,
            required: true
        },
        course_title: {
            type: String,
            required: true
        },
        actual_amount: {
            type: Number,
            required: true
        },
        discount_applied: {
            type: Number,
            default: 0
        },
        coupon_code: {
            type: String,
            default: null
        },
        coupon_discount: {
            type: Number,
            default: 0
        },
        final_amount: {
            type: Number,
            required: true
        },
        plan_type: {
            type: String,
            enum: ["monthly", "yearly", "one_time", "lifetime"],
            default: "monthly"
        },
        plan_expiry: {
            type: Date,
            default: null
        },
        receipt_photo: {
            type: String,
            default: null
        },
        transaction_id: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "cancelled"],
            default: "pending"
        },
        cancellation_reason: {
            type: String,
            default: null
        },
        rejection_reason: {
            type: String,
            default: null
        },
        approved_by: {
            type: String,
            default: null
        },
        approved_at: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Payment", paymentSchema);
