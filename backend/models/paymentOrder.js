const mongoose = require('mongoose');

const paymentOrderItemSchema = new mongoose.Schema({
    course_id: { type: String, required: true },
    course_title: { type: String, required: true },
    plan_type: { type: String, enum: ['monthly', 'yearly', 'custom', 'one_time', 'lifetime', 'free'], default: 'custom' },
    actual_amount: { type: Number, required: true },
    course_discount_percent: { type: Number, default: 0 },
    course_discount_amount: { type: Number, default: 0 },
    coupon_code: { type: String, default: null },
    coupon_discount_percent: { type: Number, default: 0 },
    coupon_discount_amount: { type: Number, default: 0 },
    bulk_discount_percent: { type: Number, default: 0 },
    bulk_discount_amount: { type: Number, default: 0 },
    final_amount: { type: Number, required: true },
    plan_expiry_days: { type: Number, required: true },
}, { _id: false });

const paymentOrderSchema = new mongoose.Schema({
    razorpay_order_id: { type: String, required: true, unique: true, index: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    student_name: { type: String, required: true },
    student_email: { type: String, required: true, lowercase: true, index: true },
    items: { type: [paymentOrderItemSchema], required: true },
    subtotal_before_bulk: { type: Number, required: true },
    bulk_discount_percent: { type: Number, default: 0 },
    bulk_discount_amount: { type: Number, default: 0 },
    total_discount_amount: { type: Number, default: 0 },
    final_amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed', 'cancelled'], default: 'created', index: true },
    razorpay_payment_id: { type: String, default: null, index: true },
    razorpay_signature: { type: String, default: null },
    paid_at: { type: Date, default: null },
    expires_at: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), index: { expires: 0 } },
}, { timestamps: true });

paymentOrderSchema.index({ student_email: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
