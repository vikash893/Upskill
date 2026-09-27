const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/payment");
const Enrollment = require("../models/enrollment");
const Course = require("../models/courses");
const Admin = require("../models/admin");
const User = require("../models/user");
const upload = require("../config/multer");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const paymentRouter = express.Router();

// Helper to initialize Razorpay instance lazily with env vars
const getRazorpayInstance = () => {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
        throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.");
    }
    return new Razorpay({ key_id, key_secret });
};

// ======================================================
// GET ADMIN QR CODE & PAYMENT SETTINGS
// ======================================================
paymentRouter.get("/payment/qr", async (req, res) => {
    try {
        const adminDoc = await Admin.findOne({ qr_code: { $ne: null } }).sort({ updatedAt: -1 });
        const fallbackAdmin = adminDoc || await Admin.findOne();

        return res.status(200).json({
            qr_code: fallbackAdmin?.qr_code ? fallbackAdmin.qr_code.replace(/\\/g, "/") : null,
            upi_id: fallbackAdmin?.upi_id || "uniskill@upi",
            account_name: fallbackAdmin?.account_name || fallbackAdmin?.name || "UniSkill Payments"
        });
    } catch (error) {
        console.log("GET QR ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// ADMIN UPDATE PAYMENT SETTINGS & QR CODE
// ======================================================
paymentRouter.post(
    "/admin/payment-settings",
    authMiddleware,
    requireRole("ADMIN"),
    upload.single("qr_code"),
    async (req, res) => {
        try {
            const adminEmail = req.user.email;
            const { upi_id, account_name } = req.body;

            const adminDoc = await Admin.findOne({ email: adminEmail });
            if (!adminDoc) {
                return res.status(404).json({ error: "Admin not found" });
            }

            if (upi_id) adminDoc.upi_id = upi_id;
            if (account_name) adminDoc.account_name = account_name;
            if (req.file) {
                adminDoc.qr_code = req.file.path.replace(/\\/g, "/");
            }

            await adminDoc.save();

            return res.status(200).json({
                message: "Payment settings and QR Code updated successfully",
                qr_code: adminDoc.qr_code,
                upi_id: adminDoc.upi_id,
                account_name: adminDoc.account_name
            });
        } catch (error) {
            console.log("UPDATE PAYMENT SETTINGS ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// ======================================================
// STUDENT SUBMIT PAYMENT RECEIPT
// ======================================================
paymentRouter.post(
    "/payment/submit-receipt",
    authMiddleware,
    upload.single("receipt"),
    async (req, res) => {
        try {
            const studentEmail = req.user.email;
            const { course_id, plan_type = "monthly", coupon_code, transaction_id } = req.body;

            if (!course_id) {
                return res.status(400).json({ error: "Course ID is required" });
            }

            if (!req.file) {
                return res.status(400).json({ error: "Payment receipt image is required" });
            }

            const user = await User.findOne({ email: studentEmail });
            if (!user) {
                return res.status(404).json({ error: "User account not found" });
            }

            const course = await Course.findOne({ course_id });
            if (!course) {
                return res.status(404).json({ error: "Course not found" });
            }

            // Check if already active
            const existingEnrollment = await Enrollment.findOne({ student_email: studentEmail, course_id, status: "active" });
            if (existingEnrollment) {
                return res.status(400).json({ error: "You are already actively enrolled in this course" });
            }

            // Check if pending payment exists
            const existingPending = await Payment.findOne({ student_email: studentEmail, course_id, status: "pending" });
            if (existingPending) {
                return res.status(400).json({
                    error: "You already have a pending payment request for this course. Please wait for admin approval.",
                    payment_id: existingPending.payment_id
                });
            }

            // Determine base price according to selected plan
            const selectedPlan = plan_type === "yearly" ? "yearly" : "monthly";
            let actualAmount = course.course_amount || 0;
            if (selectedPlan === "yearly") {
                actualAmount = course.yearly_amount > 0 ? course.yearly_amount : (actualAmount > 0 ? actualAmount * 10 : 0);
            } else {
                actualAmount = course.monthly_amount > 0 ? course.monthly_amount : actualAmount;
            }

            // Calculate discounts
            const currentDate = new Date();
            let discountApplied = 0;
            let currentPrice = actualAmount;

            if (course.discount > 0 && course.discount_time && currentDate < new Date(course.discount_time)) {
                discountApplied = course.discount;
                const discAmt = (actualAmount * course.discount) / 100;
                currentPrice = actualAmount - discAmt;
            }

            let couponDiscount = 0;
            let appliedCouponCode = null;

            if (coupon_code) {
                if (
                    course.coupon_code &&
                    course.coupon_code.trim().toUpperCase() === coupon_code.trim().toUpperCase() &&
                    (!course.coupon_code_time || currentDate <= new Date(course.coupon_code_time))
                ) {
                    appliedCouponCode = course.coupon_code;
                    couponDiscount = course.coupon_discount || 0;
                    const coupAmt = (actualAmount * couponDiscount) / 100;
                    currentPrice = Math.max(0, currentPrice - coupAmt);
                }
            }

            const finalAmount = Math.round(currentPrice);
            const randomCode = crypto.randomUUID ? crypto.randomUUID().substring(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 10).toUpperCase();
            const payment_id = `PAY-${Date.now().toString().slice(-6)}-${randomCode}`;

            const receiptPath = req.file ? `uploads/${req.file.filename}`.replace(/\\/g, "/") : null;

            // Plan expiry estimate (monthly = 30 days, yearly = 365 days)
            const expiryDays = selectedPlan === "yearly" ? 365 : 30;
            const planExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

            const newPayment = new Payment({
                payment_id,
                student_id: user._id,
                student_name: user.name,
                student_email: user.email,
                course_id: course.course_id,
                course_title: course.course_title,
                plan_type: selectedPlan,
                plan_expiry: planExpiry,
                actual_amount: actualAmount,
                discount_applied: discountApplied,
                coupon_code: appliedCouponCode,
                coupon_discount: couponDiscount,
                final_amount: finalAmount,
                receipt_photo: receiptPath,
                transaction_id: transaction_id || "",
                status: "pending"
            });

            await newPayment.save();

            return res.status(201).json({
                message: "Payment receipt submitted successfully! Admin will review and approve shortly.",
                payment: newPayment
            });

        } catch (error) {
            console.log("SUBMIT RECEIPT ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// ======================================================
// STUDENT LOG PAYMENT CANCELLATION
// ======================================================
paymentRouter.post(
    "/payment/cancel-checkout",
    authMiddleware,
    async (req, res) => {
        try {
            const studentEmail = req.user.email;
            const { course_id, plan_type = "monthly", reason } = req.body;

            if (!course_id) {
                return res.status(400).json({ error: "Course ID is required" });
            }

            const user = await User.findOne({ email: studentEmail });
            if (!user) {
                return res.status(404).json({ error: "User account not found" });
            }

            const course = await Course.findOne({ course_id });
            if (!course) {
                return res.status(404).json({ error: "Course not found" });
            }

            const selectedPlan = plan_type === "yearly" ? "yearly" : "monthly";
            let actualAmount = course.course_amount || 0;
            if (selectedPlan === "yearly") {
                actualAmount = course.yearly_amount > 0 ? course.yearly_amount : (actualAmount > 0 ? actualAmount * 10 : 0);
            } else {
                actualAmount = course.monthly_amount > 0 ? course.monthly_amount : actualAmount;
            }

            const randomCode = crypto.randomUUID ? crypto.randomUUID().substring(0, 6).toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();
            const payment_id = `CANC-${Date.now().toString().slice(-6)}-${randomCode}`;

            const cancelledPayment = new Payment({
                payment_id,
                student_id: user._id,
                student_name: user.name,
                student_email: user.email,
                course_id: course.course_id,
                course_title: course.course_title,
                plan_type: selectedPlan,
                actual_amount: actualAmount,
                discount_applied: course.discount || 0,
                final_amount: actualAmount,
                receipt_photo: null,
                transaction_id: "CANCELLED_CHECKOUT",
                status: "cancelled",
                cancellation_reason: reason || "Student cancelled checkout before submitting receipt"
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
    }
);

// ======================================================
// STUDENT PAYMENT HISTORY
// ======================================================
paymentRouter.get("/payment/student-history", authMiddleware, async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const payments = await Payment.find({ student_email: studentEmail }).sort({ createdAt: -1 });

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
// ADMIN GET ALL PAYMENTS (WITH FILTER)
// ======================================================
paymentRouter.get("/payment/all", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && ["pending", "approved", "rejected", "cancelled"].includes(status)) {
            filter.status = status;
        }

        const payments = await Payment.find(filter).sort({ createdAt: -1 });

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
// ADMIN APPROVE PAYMENT RECEIPT (CREATES ENROLLMENT WITH PLAN DURATION)
// ======================================================
paymentRouter.patch("/payment/approve/:payment_id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { payment_id } = req.params;
        const adminEmail = req.user.email;

        const payment = await Payment.findOne({ payment_id });
        if (!payment) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        if (payment.status === "approved") {
            return res.status(400).json({ error: "Payment is already approved" });
        }

        const approvedAt = new Date();
        const selectedPlan = payment.plan_type === "yearly" ? "yearly" : "monthly";
        const expiryDays = selectedPlan === "yearly" ? 365 : 30;
        const planExpiry = new Date(approvedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000);

        payment.status = "approved";
        payment.approved_by = adminEmail;
        payment.approved_at = approvedAt;
        payment.plan_expiry = planExpiry;
        payment.rejection_reason = null;
        await payment.save();

        // Create or activate enrollment with exact plan expiry
        const existingEnrollment = await Enrollment.findOne({
            student_email: payment.student_email,
            course_id: payment.course_id
        });

        if (existingEnrollment) {
            existingEnrollment.status = "active";
            existingEnrollment.payment_id = payment.payment_id;
            existingEnrollment.plan_type = selectedPlan;
            existingEnrollment.plan_expiry = planExpiry;
            existingEnrollment.enrolled_at = approvedAt;
            await existingEnrollment.save();
        } else {
            const newEnrollment = new Enrollment({
                student_id: payment.student_id,
                student_name: payment.student_name,
                student_email: payment.student_email,
                course_id: payment.course_id,
                course_title: payment.course_title,
                plan_type: selectedPlan,
                plan_expiry: planExpiry,
                status: "active",
                payment_id: payment.payment_id,
                enrolled_at: approvedAt
            });
            await newEnrollment.save();
        }

        return res.status(200).json({
            message: "Payment approved and student enrolled successfully in the course!",
            payment
        });
    } catch (error) {
        console.log("APPROVE PAYMENT ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// ADMIN REJECT PAYMENT RECEIPT
// ======================================================
paymentRouter.patch("/payment/reject/:payment_id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
        const { payment_id } = req.params;
        const { reason } = req.body;
        const adminEmail = req.user.email;

        const payment = await Payment.findOne({ payment_id });
        if (!payment) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        payment.status = "rejected";
        payment.rejection_reason = reason || "Payment verification failed or invalid receipt";
        payment.approved_by = adminEmail;
        payment.approved_at = new Date();
        await payment.save();

        return res.status(200).json({
            message: "Payment rejected",
            payment
        });
    } catch (error) {
        console.log("REJECT PAYMENT ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ======================================================
// RAZORPAY - CREATE ORDER (STEP 1)
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

            // Check if already actively enrolled
            const existingEnrollment = await Enrollment.findOne({ student_email: studentEmail, course_id, status: "active" });
            if (existingEnrollment) {
                return res.status(400).json({ error: "You are already actively enrolled in this course" });
            }

            // Calculate base amount
            let actualAmount = course.course_amount || 0;
            if (selectedPlan === "yearly") {
                actualAmount = course.yearly_amount > 0 ? course.yearly_amount : (actualAmount > 0 ? actualAmount * 10 : 0);
            } else {
                actualAmount = course.monthly_amount > 0 ? course.monthly_amount : actualAmount;
            }

            // Apply flash discount
            const currentDate = new Date();
            let currentPrice = actualAmount;
            if (course.discount > 0 && course.discount_time && currentDate < new Date(course.discount_time)) {
                const discAmt = (actualAmount * course.discount) / 100;
                currentPrice = actualAmount - discAmt;
            }

            // Apply coupon discount
            if (coupon_code) {
                if (
                    course.coupon_code &&
                    course.coupon_code.trim().toUpperCase() === coupon_code.trim().toUpperCase() &&
                    (!course.coupon_code_time || currentDate <= new Date(course.coupon_code_time))
                ) {
                    const coupAmt = (actualAmount * (course.coupon_discount || 0)) / 100;
                    currentPrice = Math.max(0, currentPrice - coupAmt);
                }
            }

            const finalPriceInRupees = Math.round(currentPrice);
            amountInPaise = finalPriceInRupees * 100;
        } else if (amount) {
            // Direct amount passed in paise or INR
            amountInPaise = parseInt(amount, 10);
        }

        // Validate minimum amount (Minimum 100 paise = 1 INR)
        if (!amountInPaise || amountInPaise < 100) {
            return res.status(400).json({ error: "Payment amount must be at least 100 paise (₹1.00)" });
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
                error: "Razorpay Gateway Authentication Failed: Your RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is invalid/expired. Please verify your Razorpay API keys in backend/.env or use the Manual UPI QR payment method."
            });
        }
        return res.status(500).json({
            error: error?.error?.description || error?.message || "Failed to create Razorpay order"
        });
    }
};

paymentRouter.post("/create-order", authMiddleware, handleCreateOrder);
paymentRouter.post("/payment/create-order", authMiddleware, handleCreateOrder);

// ======================================================
// RAZORPAY - VERIFY PAYMENT SIGNATURE (STEP 3)
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

        // Step 3 validation: verify required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                error: "Missing required verification fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required."
            });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({ error: "Razorpay secret key is not configured on the server." });
        }

        // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: "Payment verification failed: Invalid signature. Transaction cannot be verified."
            });
        }

        // Signature verified successfully! Now grant course access and record payment.
        let savedPayment = null;
        let savedEnrollment = null;

        if (course_id) {
            const course = await Course.findOne({ course_id });
            const user = await User.findOne({ email: studentEmail });
            const selectedPlan = plan_type === "yearly" ? "yearly" : "monthly";
            const expiryDays = selectedPlan === "yearly" ? 365 : 30;
            const now = new Date();
            const planExpiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

            let actualAmount = course ? (selectedPlan === "yearly" ? (course.yearly_amount > 0 ? course.yearly_amount : (course.course_amount > 0 ? course.course_amount * 10 : 0)) : (course.monthly_amount > 0 ? course.monthly_amount : course.course_amount || 0)) : 0;
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
                if (
                    course.coupon_code &&
                    course.coupon_code.trim().toUpperCase() === coupon_code.trim().toUpperCase() &&
                    (!course.coupon_code_time || now <= new Date(course.coupon_code_time))
                ) {
                    appliedCouponCode = course.coupon_code;
                    couponDiscount = course.coupon_discount || 0;
                    const coupAmt = (actualAmount * couponDiscount) / 100;
                    currentPrice = Math.max(0, currentPrice - coupAmt);
                }
            }
            const finalAmount = Math.round(currentPrice);

            // Record verified payment
            savedPayment = new Payment({
                payment_id: `PAY-RZP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
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
                receipt_photo: null,
                transaction_id: razorpay_payment_id,
                status: "approved",
                approved_by: "RAZORPAY_GATEWAY",
                approved_at: now
            });
            await savedPayment.save();

            // Create or update active enrollment
            let existingEnrollment = await Enrollment.findOne({ student_email: studentEmail, course_id });
            if (existingEnrollment) {
                existingEnrollment.status = "active";
                existingEnrollment.plan_type = selectedPlan;
                existingEnrollment.plan_expiry = planExpiry;
                existingEnrollment.enrolled_at = now;
                existingEnrollment.payment_id = savedPayment.payment_id;
                savedEnrollment = await existingEnrollment.save();
            } else {
                savedEnrollment = new Enrollment({
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
                });
                await savedEnrollment.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully! You have been granted instant access to the course.",
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

paymentRouter.post("/verify-payment", authMiddleware, handleVerifyPayment);
paymentRouter.post("/payment/verify-payment", authMiddleware, handleVerifyPayment);

// ======================================================
// GET PAYMENT RECEIPT DETAILS (FOR DOWNLOAD / INVOICE)
// ======================================================
paymentRouter.get("/payment/receipt/:payment_id", authMiddleware, async (req, res) => {
    try {
        const { payment_id } = req.params;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        const payment = await Payment.findOne({ payment_id });
        if (!payment) {
            return res.status(404).json({ error: "Payment receipt not found" });
        }

        // Students can only access their own receipts; Admins can access all
        if (userRole !== "ADMIN" && payment.student_email !== userEmail) {
            return res.status(403).json({ error: "Unauthorized access to this receipt" });
        }

        return res.status(200).json({
            receipt: payment
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = paymentRouter;


