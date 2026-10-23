const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/payment");
const PaymentOrder = require("../models/paymentOrder");
const BulkDiscount = require("../models/bulkDiscount");
const Enrollment = require("../models/enrollment");
const Course = require("../models/courses");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { paymentRateLimit } = require("../middleware/rateLimit");
const { delCache, delByPrefix } = require("../config/redis");
const { publishKafkaEvent, getPaymentTopic } = require("../config/kafka");
const { buildPaymentQuote } = require("../services/paymentQuote");
const { getPaginationParams, buildPaginationMetadata } = require("../utils/pagination");
const { verifyCheckoutSignature, verifyWebhookSignature, settlePaymentOrder } = require("../services/paymentSettlement");

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
const handleLegacyCreateOrder = async (req, res) => {
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

const handleCreateOrder = async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const requestedItems = Array.isArray(req.body.items)
            ? req.body.items
            : req.body.course_id
                ? [{ course_id: req.body.course_id, plan_type: req.body.plan_type, coupon_code: req.body.coupon_code }]
                : null;

        if (!requestedItems) {
            return res.status(400).json({ error: "Cart items are required; client-supplied payment amounts are not accepted." });
        }

        const quote = await buildPaymentQuote(requestedItems, studentEmail);
        const amountInPaise = Math.round(quote.final_amount * 100);
        if (amountInPaise < 100) {
            return res.status(400).json({ error: "The final cart amount must be at least ₹1.00." });
        }

        const razorpay = getRazorpayInstance();
        const user = await User.findOne({ email: studentEmail });
        if (!user) return res.status(404).json({ error: "Student account not found." });

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `cart_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
            notes: {
                student_email: studentEmail,
                student_name: user.name || req.user.name || "Student",
                cart_course_count: String(quote.course_count),
            },
        });

        const paymentOrder = await PaymentOrder.create({
            razorpay_order_id: order.id,
            student_id: user._id,
            student_name: user.name || req.user.name || "Student",
            student_email: studentEmail,
            items: quote.items,
            subtotal_before_bulk: quote.subtotal_before_bulk,
            bulk_discount_percent: quote.bulk_discount_percent,
            bulk_discount_amount: quote.bulk_discount_amount,
            total_discount_amount: quote.total_discount_amount,
            final_amount: quote.final_amount,
            currency: "INR",
            status: "created",
        });

        publishKafkaEvent(getPaymentTopic(), order.id, {
            event_type: "ORDER_CREATED",
            order_id: order.id,
            amount: order.amount,
            student_email: studentEmail,
            course_count: quote.course_count,
            created_at: new Date().toISOString(),
        });

        return res.status(201).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            key_id: process.env.RAZORPAY_KEY_ID,
            final_amount: paymentOrder.final_amount,
            quote,
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) console.error("RAZORPAY CREATE ORDER ERROR:", error?.statusCode || error?.code || error?.message);
        return res.status(statusCode).json({
            error: statusCode < 500 ? error.message : "Unable to create the Razorpay order. Please retry.",
        });
    }
};

const handleCartQuote = async (req, res) => {
    try {
        const quote = await buildPaymentQuote(req.body.items, req.user.email);
        return res.status(200).json({ quote });
    } catch (error) {
        return res.status(error.statusCode || 400).json({ error: error.message || "Unable to quote this cart." });
    }
};
paymentRouter.post("/quote", authMiddleware, requireRole("STUDENT"), paymentRateLimit, handleCartQuote);
paymentRouter.post("/payment/quote", authMiddleware, requireRole("STUDENT"), paymentRateLimit, handleCartQuote);

const handleGetBulkDiscounts = async (req, res) => {
    try {
        const settings = await BulkDiscount.findOne({ setting_key: "global" }).lean();
        return res.status(200).json({ tiers: settings?.tiers || [] });
    } catch (error) {
        return res.status(500).json({ error: "Unable to load bulk discount tiers." });
    }
};
paymentRouter.get("/admin/bulk-discounts", authMiddleware, requireRole("ADMIN"), handleGetBulkDiscounts);
paymentRouter.get("/payment/admin/bulk-discounts", authMiddleware, requireRole("ADMIN"), handleGetBulkDiscounts);

const handleSaveBulkDiscounts = async (req, res) => {
    try {
        const submittedTiers = req.body.tiers;
        if (!Array.isArray(submittedTiers) || submittedTiers.length > 20) {
            return res.status(400).json({ error: "Provide between 0 and 20 discount tiers." });
        }

        const tiers = submittedTiers.map((tier) => ({
            minimum_courses: Number(tier.minimum_courses),
            discount_percent: Number(tier.discount_percent),
        })).sort((left, right) => left.minimum_courses - right.minimum_courses);

        for (let index = 0; index < tiers.length; index += 1) {
            const tier = tiers[index];
            if (!Number.isInteger(tier.minimum_courses) || tier.minimum_courses < 2 || tier.minimum_courses > 100 ||
                !Number.isFinite(tier.discount_percent) || tier.discount_percent <= 0 || tier.discount_percent > 100) {
                return res.status(400).json({ error: "Each tier needs a unique course threshold (2-100) and discount (greater than 0 and at most 100%)." });
            }
            if (index && tier.minimum_courses === tiers[index - 1].minimum_courses) {
                return res.status(400).json({ error: "Course thresholds must be unique." });
            }
        }

        const settings = await BulkDiscount.findOneAndUpdate(
            { setting_key: "global" },
            { $set: { tiers, updated_by: req.user.email } },
            { upsert: true, new: true, runValidators: true }
        ).lean();
        return res.status(200).json({ tiers: settings.tiers, message: "Bulk discount tiers saved." });
    } catch (error) {
        return res.status(500).json({ error: "Unable to save bulk discount tiers." });
    }
};
paymentRouter.put("/admin/bulk-discounts", authMiddleware, requireRole("ADMIN"), handleSaveBulkDiscounts);
paymentRouter.put("/payment/admin/bulk-discounts", authMiddleware, requireRole("ADMIN"), handleSaveBulkDiscounts);

paymentRouter.post("/create-order", authMiddleware, requireRole("STUDENT"), paymentRateLimit, handleCreateOrder);
paymentRouter.post("/payment/create-order", authMiddleware, requireRole("STUDENT"), paymentRateLimit, handleCreateOrder);

// ======================================================
// 2. RAZORPAY - VERIFY PAYMENT SIGNATURE
// ======================================================
const handleLegacyVerifyPayment = async (req, res) => {
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
            const selectedPlan = plan_type === "yearly" ? "yearly" : (plan_type === "monthly" ? "monthly" : "custom");
            // Calculate expiry from course duration fields
            const durMonths = Math.max(0, parseInt(course?.duration_months, 10) || 0);
            const durDays = Math.max(0, parseInt(course?.duration_days, 10) || 0);
            let expiryDays = (durMonths * 30) + durDays;
            if (expiryDays <= 0) expiryDays = selectedPlan === "yearly" ? 365 : 30;
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

const handleVerifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Razorpay order, payment, and signature are required." });
        }

        const order = await PaymentOrder.findOne({
            razorpay_order_id,
            student_email: req.user.email,
        });
        if (!order) return res.status(404).json({ error: "Payment order not found for this student." });

        if (order.status === "paid") {
            return res.status(200).json({
                success: true,
                message: "Payment was already verified.",
                order_id: order.razorpay_order_id,
                payments: await Payment.find({ razorpay_order_id: order.razorpay_order_id }).lean(),
            });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
            return res.status(400).json({ success: false, error: "Payment verification failed: invalid signature." });
        }

        const razorpay = getRazorpayInstance();
        const expectedAmount = Math.round(order.final_amount * 100);
        const [gatewayOrder, fetchedPayment] = await Promise.all([
            razorpay.orders.fetch(razorpay_order_id),
            razorpay.payments.fetch(razorpay_payment_id),
        ]);

        if (gatewayOrder.amount !== expectedAmount || gatewayOrder.currency !== order.currency ||
            fetchedPayment.order_id !== razorpay_order_id || fetchedPayment.amount !== expectedAmount ||
            fetchedPayment.currency !== order.currency) {
            return res.status(400).json({ success: false, error: "Razorpay amount or order does not match the saved cart quote." });
        }

        let gatewayPayment = fetchedPayment;
        if (gatewayPayment.status === "authorized") {
            gatewayPayment = await razorpay.payments.capture(razorpay_payment_id, expectedAmount, order.currency);
        }
        if (gatewayPayment.status !== "captured") {
            return res.status(409).json({ success: false, pending: true, error: "Payment is not captured yet. Course access will activate after Razorpay confirms capture." });
        }

        const settled = await settlePaymentOrder(order, {
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            paidAt: new Date(),
        });

        await Promise.all(order.items.map((item) =>
            delCache(`enrollment:${encodeURIComponent(order.student_email.toLowerCase())}:${encodeURIComponent(item.course_id)}`)
        ));
        await delByPrefix(`cache:student:${encodeURIComponent(order.student_email.toLowerCase())}`);

        publishKafkaEvent(getPaymentTopic(), razorpay_payment_id, {
            event_type: "PAYMENT_VERIFIED",
            razorpay_payment_id,
            razorpay_order_id,
            student_email: order.student_email,
            course_ids: order.items.map((item) => item.course_id),
            final_amount: order.final_amount,
            enrolled_at: new Date().toISOString(),
        });

        return res.status(200).json({
            success: true,
            message: "Payment verified and all cart courses activated.",
            order_id: order.razorpay_order_id,
            payments: settled.payments,
            quote: {
                course_count: order.items.length,
                final_amount: order.final_amount,
                bulk_discount_percent: order.bulk_discount_percent,
                bulk_discount_amount: order.bulk_discount_amount,
            },
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) console.error("RAZORPAY VERIFY PAYMENT ERROR:", error?.statusCode || error?.code || error?.message);
        return res.status(statusCode).json({ error: statusCode < 500 ? error.message : "Payment could not be verified. Please retry shortly." });
    }
};

paymentRouter.post("/verify-payment", authMiddleware, requireRole("STUDENT"), paymentRateLimit, handleVerifyPayment);
paymentRouter.post("/payment/verify-payment", authMiddleware, requireRole("STUDENT"), paymentRateLimit, handleVerifyPayment);

// ======================================================
// 3. RAZORPAY WEBHOOK HANDLER
// ======================================================
paymentRouter.post("/payment/webhook", async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        if (!webhookSecret) return res.status(503).json({ error: "Razorpay webhook secret is not configured." });
        if (!verifyWebhookSignature(req.rawBody, signature, webhookSecret)) {
            return res.status(400).json({ error: "Invalid webhook signature" });
        }

        const event = req.body?.event;
        const payload = req.body?.payload;

        if (event === "payment.captured" || event === "order.paid") {
            const paymentEntity = payload?.payment?.entity;
            const orderEntity = payload?.order?.entity;
            const orderId = paymentEntity?.order_id || orderEntity?.id;
            const paymentId = paymentEntity?.id;
            if (orderId && paymentId) {
                const order = await PaymentOrder.findOne({ razorpay_order_id: orderId });
                if (order && paymentEntity.amount === Math.round(order.final_amount * 100) &&
                    paymentEntity.currency === order.currency && paymentEntity.status === "captured") {
                    await settlePaymentOrder(order, { paymentId, paidAt: new Date() });
                    await Promise.all(order.items.map((item) =>
                        delCache(`enrollment:${encodeURIComponent(order.student_email.toLowerCase())}:${encodeURIComponent(item.course_id)}`)
                    ));
                    await delByPrefix(`cache:student:${encodeURIComponent(order.student_email.toLowerCase())}`);
                }
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
paymentRouter.post("/payment/cancel-checkout", authMiddleware, requireRole("STUDENT"), async (req, res) => {
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

paymentRouter.get("/payment/order/:order_id", authMiddleware, paymentRateLimit, async (req, res) => {
    try {
        const order = await PaymentOrder.findOne({ razorpay_order_id: req.params.order_id });
        if (!order) return res.status(404).json({ error: "Payment order not found." });
        if (req.user.role !== "ADMIN" && order.student_email.toLowerCase() !== String(req.user.email || "").toLowerCase()) {
            return res.status(403).json({ error: "You are not allowed to view this payment order." });
        }

        if (order.status === "created") {
            try {
                const razorpay = getRazorpayInstance();
                const gatewayResult = await razorpay.orders.fetchPayments(order.razorpay_order_id);
                const gatewayPayments = gatewayResult.items || [];
                let capturedPayment = gatewayPayments.find((payment) => payment.status === "captured");
                const authorizedPayment = gatewayPayments.find((payment) => payment.status === "authorized");

                if (!capturedPayment && authorizedPayment) {
                    const expectedAmount = Math.round(order.final_amount * 100);
                    if (authorizedPayment.amount === expectedAmount && authorizedPayment.currency === order.currency) {
                        const captureResult = await razorpay.payments.capture(
                            authorizedPayment.id,
                            expectedAmount,
                            order.currency
                        );
                        if (captureResult.status === "captured") capturedPayment = captureResult;
                    }
                }

                const expectedAmount = Math.round(order.final_amount * 100);
                if (capturedPayment && capturedPayment.order_id === order.razorpay_order_id &&
                    capturedPayment.amount === expectedAmount && capturedPayment.currency === order.currency) {
                    await settlePaymentOrder(order, { paymentId: capturedPayment.id, paidAt: new Date() });
                    await Promise.all(order.items.map((item) =>
                        delCache(`enrollment:${encodeURIComponent(order.student_email.toLowerCase())}:${encodeURIComponent(item.course_id)}`)
                    ));
                    await delByPrefix(`cache:student:${encodeURIComponent(order.student_email.toLowerCase())}`);
                }
            } catch (gatewayError) {
                console.error("RAZORPAY ORDER STATUS CHECK ERROR:", gatewayError?.statusCode || gatewayError?.code || "gateway_unavailable");
            }
        }

        return res.status(200).json({
            order_id: order.razorpay_order_id,
            status: order.status,
            payment_id: order.razorpay_payment_id,
            items: order.items,
            course_count: order.items.length,
            final_amount: order.final_amount,
            bulk_discount_percent: order.bulk_discount_percent,
            bulk_discount_amount: order.bulk_discount_amount,
        });
    } catch (error) {
        return res.status(500).json({ error: "Unable to check payment status." });
    }
});

// ======================================================
// 5. STUDENT PAYMENT HISTORY
// ======================================================
paymentRouter.get("/payment/student-history", authMiddleware, requireRole("STUDENT"), async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const filter = { student_email: studentEmail };

        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
        const { page, limit, skip } = getPaginationParams(req, 10, 100);

        let query = Payment.find(filter).sort({ createdAt: -1 });
        if (isPaginated) {
            query = query.skip(skip).limit(limit);
        }

        const [payments, totalCount] = await Promise.all([
            query.lean(),
            Payment.countDocuments(filter)
        ]);

        return res.status(200).json({
            total: totalCount,
            payments,
            pagination: buildPaginationMetadata(totalCount, page, isPaginated ? limit : (totalCount || 1))
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

        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
        const { page, limit, skip } = getPaginationParams(req, 10, 100);

        let query = Payment.find(filter).sort({ createdAt: -1 });
        if (isPaginated) {
            query = query.skip(skip).limit(limit);
        }

        const [payments, totalCount] = await Promise.all([
            query.lean(),
            Payment.countDocuments(filter)
        ]);

        return res.status(200).json({
            total: totalCount,
            payments,
            pagination: buildPaginationMetadata(totalCount, page, isPaginated ? limit : (totalCount || 1))
        });
    } catch (error) {
        console.log("ADMIN GET PAYMENTS ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

paymentRouter.patch("/payment/approve/:payment_id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const payment = await Payment.findOne({ payment_id: req.params.payment_id });
        if (!payment) return res.status(404).json({ error: "Payment record not found." });
        if (payment.status !== "pending" || payment.razorpay_order_id || payment.payment_gateway === "RAZORPAY") {
            return res.status(409).json({ error: "Only pending manual payment records can be approved by an admin." });
        }

        const user = await User.findOne({ email: payment.student_email });
        if (!user) return res.status(404).json({ error: "Student account not found." });
        const now = new Date();
        const durationDays = payment.plan_type === "yearly" ? 365 : 30;
        payment.status = "approved";
        payment.approved_by = req.user.email;
        payment.approved_at = now;
        payment.plan_expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        await payment.save();

        await Enrollment.findOneAndUpdate(
            { student_email: payment.student_email, course_id: payment.course_id },
            {
                $set: {
                    student_id: user._id,
                    student_name: payment.student_name,
                    student_email: payment.student_email,
                    course_id: payment.course_id,
                    course_title: payment.course_title,
                    plan_type: payment.plan_type,
                    plan_expiry: payment.plan_expiry,
                    status: "active",
                    payment_id: payment.payment_id,
                    enrolled_at: now,
                },
            },
            { upsert: true, new: true }
        );
        await delCache(`enrollment:${encodeURIComponent(payment.student_email.toLowerCase())}:${encodeURIComponent(payment.course_id)}`);
        await delByPrefix(`cache:student:${encodeURIComponent(payment.student_email.toLowerCase())}`);

        return res.status(200).json({ message: "Manual payment approved and course access activated.", payment });
    } catch (error) {
        console.error("ADMIN APPROVE PAYMENT ERROR:", error?.message || error);
        return res.status(500).json({ error: "Unable to approve this payment." });
    }
});

paymentRouter.patch("/payment/reject/:payment_id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const payment = await Payment.findOne({ payment_id: req.params.payment_id });
        if (!payment) return res.status(404).json({ error: "Payment record not found." });
        if (payment.status !== "pending" || payment.razorpay_order_id || payment.payment_gateway === "RAZORPAY") {
            return res.status(409).json({ error: "Only pending manual payment records can be rejected by an admin." });
        }

        payment.status = "rejected";
        payment.rejection_reason = String(req.body.reason || "").trim().slice(0, 500);
        payment.approved_by = req.user.email;
        await payment.save();
        return res.status(200).json({ message: "Manual payment rejected.", payment });
    } catch (error) {
        console.error("ADMIN REJECT PAYMENT ERROR:", error?.message || error);
        return res.status(500).json({ error: "Unable to reject this payment." });
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
