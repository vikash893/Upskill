const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/payment");
const Enrollment = require("../models/enrollment");
const Course = require("../models/courses");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { paymentRateLimit } = require("../middleware/rateLimit");
const { delCache, delByPrefix } = require("../config/redis");
const { publishKafkaEvent, getPaymentTopic } = require("../config/kafka");

const paymentRouter = express.Router();

// Helper to initialize Razorpay instance lazily
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
        throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.");
    }
    return new Razorpay({ key_id, key_secret });
};

// ======================================================
// 1. RAZORPAY - CREATE ORDER
// ======================================================
const handleCreateOrder = async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const { course_id, plan_type = "monthly", coupon_code, amount, currency = "INR", receipt } = req.body;

        let amountInPaise = 0;
        let course = null;
        let selectedPlan = plan_type === "yearly" ? "yearly" : "monthly";
        let user = await User.findOne({ email: studentEmail });

        if (course_id) {
            course = await Course.findOne({ course_id });
            if (!course) {
                return res.status(404).json({ error: "Course not found" });
            }

            // Check if student already actively enrolled
            const existingEnrollment = await Enrollment.findOne({
                student_email: studentEmail,
                course_id,
                status: "active"
            });

            if (existingEnrollment) {
                // If enrolled with active future expiry, prevent duplicate
                if (!existingEnrollment.plan_expiry || new Date(existingEnrollment.plan_expiry) > new Date()) {
                    return res.status(400).json({ error: "You already have active enrollment in this course." });
                }
            }

            // Calculate base amount
            let actualAmount = course.course_amount || 0;
            if (selectedPlan === "yearly") {
                actualAmount = course.yearly_amount > 0 ? course.yearly_amount : (actualAmount > 0 ? actualAmount * 10 : 0);
            } else {
                actualAmount = course.monthly_amount > 0 ? course.monthly_amount : actualAmount;
            }

            // Apply active flash discount
            const currentDate = new Date();
            let currentPrice = actualAmount;
            let discountApplied = 0;

            if (course.discount > 0 && course.discount_time && currentDate < new Date(course.discount_time)) {
                discountApplied = course.discount;
                const discAmt = (actualAmount * course.discount) / 100;
                currentPrice = actualAmount - discAmt;
            }

            // Apply coupon discount
            if (coupon_code) {
                const inputCode = coupon_code.trim().toUpperCase();
                const matchedCoupon = (course.coupons || []).find(
                    (cp) => cp.code && cp.code.trim().toUpperCase() === inputCode &&
                        (!cp.expires_at || currentDate <= new Date(cp.expires_at))
                );
                if (matchedCoupon) {
                    const coupAmt = (actualAmount * (matchedCoupon.discount || 0)) / 100;
                    currentPrice = Math.max(0, currentPrice - coupAmt);
                }
            }

            const finalPriceInRupees = Math.round(currentPrice);
            amountInPaise = finalPriceInRupees * 100;
        } else if (amount) {
            amountInPaise = parseInt(amount, 10);
        }

        // Validate minimum amount (Minimum 100 paise = ₹1.00)
        if (!amountInPaise || amountInPaise < 100) {
            return res.status(400).json({ error: "Payment amount must be at least ₹1.00 (100 paise)." });
        }

        const razorpay = getRazorpayInstance();

        const orderReceipt = receipt || `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 6)}`;
        const options = {
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: orderReceipt,
            notes: {
                course_id: course ? course.course_id : (course_id || ""),
                course_title: course ? course.course_title : "",
                student_email: studentEmail,
                student_name: user?.name || req.user.name || "Student",
                plan_type: selectedPlan
            }
        };

        const order = await razorpay.orders.create(options);

        // Stream event to Kafka
        publishKafkaEvent(getPaymentTopic(), order.id, {
            event_type: "ORDER_CREATED",
            order_id: order.id,
            amount: order.amount,
            student_email: studentEmail,
            course_id: course?.course_id || course_id,
            created_at: new Date().toISOString()
        });

        return res.status(200).json({
            order_id: order.id,
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            key_id: process.env.RAZORPAY_KEY_ID,
            course_title: course?.course_title || "",
            plan_type: selectedPlan,
            final_amount: order.amount / 100
        });
    } catch (error) {
        console.error("RAZORPAY CREATE ORDER ERROR:", error);
        if (error?.statusCode === 401 || error?.error?.code === "BAD_REQUEST_ERROR") {
            return res.status(400).json({
                error: "Razorpay Gateway Authentication Failed: Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend configuration."
            });
        }
        return res.status(500).json({
            error: error?.error?.description || error?.message || "Failed to create Razorpay checkout order"
        });
    }
};

paymentRouter.post("/create-order", authMiddleware, paymentRateLimit, handleCreateOrder);
paymentRouter.post("/payment/create-order", authMiddleware, paymentRateLimit, handleCreateOrder);

// ======================================================
// 2. RAZORPAY - VERIFY PAYMENT SIGNATURE
// ======================================================
const handleVerifyPayment = async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            course_id,
            plan_type = "monthly",
            coupon_code
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                error: "Missing required verification parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature."
            });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({ error: "Razorpay secret key is not configured on the server." });
        }

        // HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: "Payment verification failed: Invalid digital signature. Transaction cannot be validated."
            });
        }

        // Signature verified! Grant instant access & record payment idempotently
        let savedPayment = null;
        let savedEnrollment = null;

        if (course_id) {
            const course = await Course.findOne({ course_id });
            const user = await User.findOne({ email: studentEmail });
            const selectedPlan = plan_type === "yearly" ? "yearly" : "monthly";
            const expiryDays = selectedPlan === "yearly" ? 365 : 30;
            const now = new Date();
            const planExpiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

            let actualAmount = course
                ? (selectedPlan === "yearly"
                    ? (course.yearly_amount > 0 ? course.yearly_amount : (course.course_amount > 0 ? course.course_amount * 10 : 0))
                    : (course.monthly_amount > 0 ? course.monthly_amount : course.course_amount || 0))
                : 0;

            let currentPrice = actualAmount;
            let discountApplied = 0;

            if (course && course.discount > 0 && course.discount_time && now < new Date(course.discount_time)) {
                discountApplied = course.discount;
                const discAmt = (actualAmount * course.discount) / 100;
                currentPrice = actualAmount - discAmt;
            }

            let couponDiscount = 0;
            let appliedCouponCode = null;
            if (course && coupon_code) {
                const inputCode = coupon_code.trim().toUpperCase();
                const matchedCoupon = (course.coupons || []).find(
                    (cp) => cp.code && cp.code.trim().toUpperCase() === inputCode &&
                        (!cp.expires_at || now <= new Date(cp.expires_at))
                );
                if (matchedCoupon) {
                    appliedCouponCode = matchedCoupon.code;
                    couponDiscount = matchedCoupon.discount || 0;
                    const coupAmt = (actualAmount * couponDiscount) / 100;
                    currentPrice = Math.max(0, currentPrice - coupAmt);
                }
            }
            const finalAmount = Math.round(currentPrice);

            // Record or update verified payment
            const payment_id = `PAY-RZP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

            savedPayment = await Payment.findOneAndUpdate(
                { razorpay_payment_id },
                {
                    payment_id,
                    student_id: user?._id || req.user.id,
                    student_name: user?.name || req.user.name || "Student",
                    student_email: studentEmail,
                    course_id: course?.course_id || course_id,
                    course_title: course?.course_title || "Enrolled Course",
                    actual_amount: actualAmount,
                    discount_applied: discountApplied,
                    coupon_code: appliedCouponCode,
                    coupon_discount: couponDiscount,
                    final_amount: finalAmount,
                    plan_type: selectedPlan,
                    plan_expiry: planExpiry,
                    payment_gateway: "RAZORPAY",
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                    transaction_id: razorpay_payment_id,
                    status: "approved",
                    approved_by: "RAZORPAY_GATEWAY",
                    approved_at: now
                },
                { upsert: true, new: true }
            );

            // Activate enrollment
            savedEnrollment = await Enrollment.findOneAndUpdate(
                { student_email: studentEmail, course_id: course?.course_id || course_id },
                {
                    student_id: user?._id || req.user.id,
                    student_name: user?.name || req.user.name || "Student",
                    student_email: studentEmail,
                    course_id: course?.course_id || course_id,
                    course_title: course?.course_title || "Enrolled Course",
                    plan_type: selectedPlan,
                    plan_expiry: planExpiry,
                    status: "active",
                    payment_id: savedPayment.payment_id,
                    enrolled_at: now
                },
                { upsert: true, new: true }
            );

            // Invalidate student caches in Redis
            await delCache(`enrollment:${encodeURIComponent(studentEmail.toLowerCase())}:${encodeURIComponent(course_id)}`);
            await delByPrefix(`cache:student:${encodeURIComponent(studentEmail.toLowerCase())}`);

            // Stream payment event to Kafka
            publishKafkaEvent(getPaymentTopic(), razorpay_payment_id, {
                event_type: "PAYMENT_VERIFIED",
                payment_id: savedPayment.payment_id,
                razorpay_payment_id,
                razorpay_order_id,
                student_email: studentEmail,
                course_id: course?.course_id || course_id,
                final_amount: finalAmount,
                plan_type: selectedPlan,
                enrolled_at: now.toISOString()
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully! Instant course access has been activated.",
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            payment: savedPayment,
            enrollment: savedEnrollment
        });
    } catch (error) {
        console.error("RAZORPAY VERIFY PAYMENT ERROR:", error);
        return res.status(500).json({ error: "Internal server error during payment verification" });
    }
};

paymentRouter.post("/verify-payment", authMiddleware, paymentRateLimit, handleVerifyPayment);
paymentRouter.post("/payment/verify-payment", authMiddleware, paymentRateLimit, handleVerifyPayment);

// ======================================================
// 3. RAZORPAY WEBHOOK HANDLER
// ======================================================
paymentRouter.post("/payment/webhook", async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        if (webhookSecret && signature) {
            const bodyString = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(bodyString)
                .digest("hex");

            if (expectedSignature !== signature) {
                console.warn("⚠️ Razorpay Webhook signature mismatch.");
                return res.status(400).json({ error: "Invalid webhook signature" });
            }
        }

        const event = req.body?.event;
        const payload = req.body?.payload;

        console.log(`Razorpay Webhook event received: ${event}`);

        if (event === "payment.captured" || event === "order.paid") {
            const paymentEntity = payload?.payment?.entity;
            const notes = paymentEntity?.notes || payload?.order?.entity?.notes || {};
            const studentEmail = notes.student_email;
            const courseId = notes.course_id;
            const planType = notes.plan_type || "monthly";

            if (studentEmail && courseId) {
                const now = new Date();
                const expiryDays = planType === "yearly" ? 365 : 30;
                const planExpiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

                await Enrollment.findOneAndUpdate(
                    { student_email: studentEmail, course_id: courseId },
                    {
                        student_name: notes.student_name || "Student",
                        course_title: notes.course_title || "Course",
                        plan_type: planType,
                        plan_expiry: planExpiry,
                        status: "active",
                        enrolled_at: now
                    },
                    { upsert: true }
                );

                await delCache(`enrollment:${encodeURIComponent(studentEmail.toLowerCase())}:${encodeURIComponent(courseId)}`);
            }
        }

        publishKafkaEvent(getPaymentTopic(), event, {
            event_type: "WEBHOOK_EVENT",
            event,
            received_at: new Date().toISOString()
        });

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("WEBHOOK ERROR:", error);
        return res.status(500).json({ error: "Webhook processing error" });
    }
});

// ======================================================
// 4. STUDENT LOG CHECKOUT CANCELLATION
// ======================================================
paymentRouter.post("/payment/cancel-checkout", authMiddleware, async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const { course_id, plan_type = "monthly", reason } = req.body;

        if (!course_id) {
            return res.status(400).json({ error: "Course ID is required" });
        }

        const user = await User.findOne({ email: studentEmail });
        const course = await Course.findOne({ course_id });

        const selectedPlan = plan_type === "yearly" ? "yearly" : "monthly";
        let actualAmount = course ? (selectedPlan === "yearly" ? (course.yearly_amount || (course.course_amount * 10)) : (course.monthly_amount || course.course_amount || 0)) : 0;

        const randomCode = crypto.randomUUID ? crypto.randomUUID().substring(0, 6).toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();
        const payment_id = `CANC-${Date.now().toString().slice(-6)}-${randomCode}`;

        const cancelledPayment = new Payment({
            payment_id,
            student_id: user?._id || req.user.id,
            student_name: user?.name || req.user.name || "Student",
            student_email: studentEmail,
            course_id: course?.course_id || course_id,
            course_title: course?.course_title || "Course",
            plan_type: selectedPlan,
            actual_amount: actualAmount,
            discount_applied: course?.discount || 0,
            final_amount: actualAmount,
            payment_gateway: "RAZORPAY",
            transaction_id: "CANCELLED_CHECKOUT",
            status: "cancelled",
            cancellation_reason: reason || "Student dismissed Razorpay modal before completing payment"
        });

        await cancelledPayment.save();

        return res.status(200).json({
            message: "Cancellation recorded successfully",
            payment: cancelledPayment
        });
    } catch (error) {
        console.log("CANCEL CHECKOUT ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// 5. STUDENT PAYMENT HISTORY
// ======================================================
paymentRouter.get("/payment/student-history", authMiddleware, async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const payments = await Payment.find({ student_email: studentEmail }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({
            total: payments.length,
            payments
        });
    } catch (error) {
        console.log("STUDENT PAYMENT HISTORY ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// 6. ADMIN GET ALL TRANSACTIONS
// ======================================================
paymentRouter.get("/payment/all", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};

        if (status && status !== "all") {
            filter.status = status;
        }

        if (search && search.trim()) {
            const q = search.trim();
            filter.$or = [
                { payment_id: { $regex: q, $options: "i" } },
                { student_email: { $regex: q, $options: "i" } },
                { student_name: { $regex: q, $options: "i" } },
                { course_title: { $regex: q, $options: "i" } },
                { transaction_id: { $regex: q, $options: "i" } },
                { razorpay_payment_id: { $regex: q, $options: "i" } }
            ];
        }

        const payments = await Payment.find(filter).sort({ createdAt: -1 }).lean();

        return res.status(200).json({
            total: payments.length,
            payments
        });
    } catch (error) {
        console.log("ADMIN GET PAYMENTS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// 7. GET PAYMENT RECEIPT / INVOICE
// ======================================================
paymentRouter.get("/payment/receipt/:payment_id", authMiddleware, async (req, res) => {
    try {
        const { payment_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        const payment = await Payment.findOne({ payment_id }).lean();
        if (!payment) {
            return res.status(404).json({ error: "Payment receipt record not found" });
        }

        if (userRole !== "ADMIN" && payment.student_email.toLowerCase() !== userEmail.toLowerCase()) {
            return res.status(403).json({ error: "Unauthorized access to this receipt" });
        }

        return res.status(200).json({ receipt: payment });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = paymentRouter;
