const express = require("express");
const Course = require("../models/courses");
const { getCache, setCache } = require("../config/redis");

const getCourseRouter = express.Router();

// ======================================================
// EXPLORE ALL COURSES (HIGH-SPEED REDIS CACHED)
// ======================================================
getCourseRouter.get(
    "/explore-courses",
    async (req, res) => {
        try {
            const cacheKey = "cache:courses:explore:all";
            const cachedData = await getCache(cacheKey);

            if (cachedData) {
                return res.status(200).json(cachedData);
            }

            const allCourses = await Course.find({})
                .select(
                    "course_id course_title course_description course_amount monthly_amount yearly_amount pricing_period course_type photo discount discount_time coupon_code coupon_code_time coupon_discount createdAt"
                )
                .sort({ createdAt: -1 })
                .lean();

            const currentDate = new Date();

            const courseData = allCourses.map((course) => {
                let actualAmount = course.course_amount || 0;
                let monthlyAmount = course.monthly_amount || (actualAmount > 0 ? actualAmount : 0);
                let yearlyAmount = course.yearly_amount || (monthlyAmount > 0 ? monthlyAmount * 10 : 0);

                let discountAmount = 0;
                let finalAmount = actualAmount;
                let finalMonthlyAmount = monthlyAmount;
                let finalYearlyAmount = yearlyAmount;

                let discountActive = false;

                if (
                    course.discount > 0 &&
                    course.discount_time &&
                    currentDate < new Date(course.discount_time)
                ) {
                    discountActive = true;
                    discountAmount = (actualAmount * course.discount) / 100;
                    finalAmount = Math.max(0, actualAmount - discountAmount);
                    finalMonthlyAmount = Math.max(0, monthlyAmount - (monthlyAmount * course.discount) / 100);
                    finalYearlyAmount = Math.max(0, yearlyAmount - (yearlyAmount * course.discount) / 100);
                }

                return {
                    course_id: course.course_id,
                    course_title: course.course_title,
                    course_description: course.course_description,
                    course_type: course.course_type,
                    pricing_period: course.pricing_period || "both",
                    photo: course.photo ? course.photo.replace(/\\/g, "/") : null,
                    actual_amount: actualAmount,
                    monthly_amount: monthlyAmount,
                    yearly_amount: yearlyAmount,
                    final_monthly_amount: Math.round(finalMonthlyAmount),
                    final_yearly_amount: Math.round(finalYearlyAmount),
                    discount: discountActive ? course.discount : 0,
                    discount_amount: Math.round(discountAmount),
                    final_amount: Math.round(finalAmount)
                };
            });

            const responsePayload = {
                message: "Courses fetched successfully",
                total_courses: courseData.length,
                courses: courseData
            };

            // Cache in Redis for 120 seconds
            await setCache(cacheKey, responsePayload, 120);

            return res.status(200).json(responsePayload);
        } catch (error) {
            console.log("EXPLORE COURSE ERROR:", error);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

// ======================================================
// GET SINGLE COURSE DETAILS (REDIS CACHED)
// ======================================================
getCourseRouter.get(
    "/course/:course_id",
    async (req, res) => {
        try {
            const { course_id } = req.params;
            const cacheKey = `cache:course:${encodeURIComponent(course_id)}`;
            const cached = await getCache(cacheKey);

            if (cached) {
                return res.status(200).json(cached);
            }

            const course = await Course.findOne({ course_id }).lean();

            if (!course) {
                return res.status(404).json({
                    error: "Course not found"
                });
            }

            const currentDate = new Date();
            let discountActive = false;
            let actualAmount = course.course_amount || 0;
            let monthlyAmount = course.monthly_amount || (actualAmount > 0 ? actualAmount : 0);
            let yearlyAmount = course.yearly_amount || (monthlyAmount > 0 ? monthlyAmount * 10 : 0);

            let discountAmount = 0;
            let finalAmount = actualAmount;
            let finalMonthlyAmount = monthlyAmount;
            let finalYearlyAmount = yearlyAmount;

            if (
                course.discount > 0 &&
                course.discount_time &&
                currentDate < new Date(course.discount_time)
            ) {
                discountActive = true;
                discountAmount = (actualAmount * course.discount) / 100;
                finalAmount = Math.max(0, actualAmount - discountAmount);
                finalMonthlyAmount = Math.max(0, monthlyAmount - (monthlyAmount * course.discount) / 100);
                finalYearlyAmount = Math.max(0, yearlyAmount - (yearlyAmount * course.discount) / 100);
            }

            const responsePayload = {
                message: "Course fetched successfully",
                course: {
                    course_id: course.course_id,
                    course_title: course.course_title,
                    course_description: course.course_description,
                    course_type: course.course_type,
                    pricing_period: course.pricing_period || "both",
                    photo: course.photo ? course.photo.replace(/\\/g, "/") : null,
                    actual_amount: actualAmount,
                    monthly_amount: monthlyAmount,
                    yearly_amount: yearlyAmount,
                    final_monthly_amount: Math.round(finalMonthlyAmount),
                    final_yearly_amount: Math.round(finalYearlyAmount),
                    discount: discountActive ? course.discount : 0,
                    discount_amount: Math.round(discountAmount),
                    final_amount: Math.round(finalAmount),
                    has_active_coupon: Boolean(
                        course.coupon_code &&
                        course.coupon_code_time &&
                        currentDate < new Date(course.coupon_code_time)
                    )
                }
            };

            // Cache in Redis for 120 seconds
            await setCache(cacheKey, responsePayload, 120);

            return res.status(200).json(responsePayload);
        } catch (error) {
            console.log("GET COURSE ERROR:", error);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

// ======================================================
// VERIFY COUPON CODE
// ======================================================
getCourseRouter.post(
    "/verify-coupon/:course_id",
    async (req, res) => {
        try {
            const { course_id } = req.params;
            const { coupon_code } = req.body;

            if (!coupon_code) {
                return res.status(400).json({
                    error: "Coupon code is required"
                });
            }

            const course = await Course.findOne({ course_id });

            if (!course) {
                return res.status(404).json({
                    error: "Course not found"
                });
            }

            const currentDate = new Date();

            if (
                !course.coupon_code ||
                course.coupon_code.trim().toUpperCase() !== coupon_code.trim().toUpperCase()
            ) {
                return res.status(400).json({
                    error: "Invalid coupon code"
                });
            }

            if (
                course.coupon_code_time &&
                currentDate > new Date(course.coupon_code_time)
            ) {
                return res.status(400).json({
                    error: "Coupon code has expired"
                });
            }

            const couponDiscount = course.coupon_discount || 0;
            const couponDiscountAmount = (course.course_amount * couponDiscount) / 100;
            const finalAmountWithCoupon = Math.max(0, course.course_amount - couponDiscountAmount);

            return res.status(200).json({
                message: "Coupon applied successfully!",
                valid: true,
                coupon_code: course.coupon_code,
                coupon_discount: couponDiscount,
                discount_amount: Math.round(couponDiscountAmount),
                final_amount: Math.round(finalAmountWithCoupon)
            });
        } catch (error) {
            console.log("VERIFY COUPON ERROR:", error);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

module.exports = getCourseRouter;