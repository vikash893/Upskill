const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        payment_id: {
            type: String,
            required: true,
            unique: true,
            index: true
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
            required: true,
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
        currency: {
            type: String,
            default: "INR"
        },
        plan_type: {
            type: String,
            enum: ["monthly", "yearly", "one_time", "lifetime", "free"],
            default: "monthly"
        },
        plan_expiry: {
            type: Date,
            default: null
        },
        payment_gateway: {
            type: String,
            default: "RAZORPAY"
        },
        razorpay_order_id: {
            type: String,
            default: null,
            index: true
        },
        razorpay_payment_id: {
            type: String,
            default: null,
            index: true
        },
        razorpay_signature: {
            type: String,
            default: null
        },
        transaction_id: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["approved", "pending", "failed", "cancelled", "refunded", "rejected"],
            default: "approved",
            index: true
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
            default: "RAZORPAY_GATEWAY"
        },
        approved_at: {
            type: Date,
            default: Date.now
        },
        receipt_photo: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

paymentSchema.index({ student_email: 1, course_id: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
