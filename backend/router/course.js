const express = require("express");
const upload = require("../config/multer");
const crypto = require("crypto");
const Course = require("../models/courses");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { delCache, delByPrefix } = require("../config/redis");
const {
    persistFile,
    isConfigured
} = require("../config/cloudinary");

const courseRouter = express.Router();


// ======================================================
// CLOUDINARY CHECK
// ======================================================

const checkCloudinary = (req, res, next) => {
    if (!isConfigured) {
        return res.status(500).json({
            error: "Cloudinary is not configured on the server."
        });
    }

    next();
};


// ======================================================
// CACHE INVALIDATOR HELPER
// ======================================================

const invalidateCourseCaches = async (courseId) => {
    try {
        await delCache("cache:courses:explore:all");
        await delCache("cache:platform:stats");

        if (courseId) {
            await delCache(
                `cache:course:${encodeURIComponent(courseId)}`
            );
        }

        await delByPrefix("cache:courses:");
    } catch (error) {
        console.log("CACHE INVALIDATION ERROR:", error);
    }
};


// ======================================================
// ADD COURSE
// ======================================================

courseRouter.post(
    "/add-course",

    // Store uploaded file in memory only
    upload.single("photo"),

    authMiddleware,
    requireRole("ADMIN"),

    // Cloudinary must be configured
    checkCloudinary,

    async (req, res) => {
        try {
            const {
                course_title,
                course_description,
                course_amount,
                monthly_amount,
                yearly_amount,
                pricing_period,
                course_type
            } = req.body;


            // -------------------------------
            // VALIDATION
            // -------------------------------

            if (
                !course_title ||
                !course_description ||
                !course_type
            ) {
                return res.status(400).json({
                    error:
                        "Title, description, and course type are required"
                });
            }


            if (!["free", "paid"].includes(course_type)) {
                return res.status(400).json({
                    error:
                        "Course type must be free or paid"
                });
            }


            // -------------------------------
            // PRICE CALCULATION
            // -------------------------------

            let amount = Number(course_amount) || 0;
            let mAmount = Number(monthly_amount) || 0;
            let yAmount = Number(yearly_amount) || 0;


            if (course_type === "paid") {

                if (
                    mAmount <= 0 &&
                    yAmount <= 0 &&
                    amount <= 0
                ) {
                    return res.status(400).json({
                        error:
                            "Paid course must have a valid monthly, yearly, or base amount"
                    });
                }


                if (
                    mAmount <= 0 &&
                    amount > 0
                ) {
                    mAmount = amount;
                }


                if (
                    yAmount <= 0 &&
                    mAmount > 0
                ) {
                    yAmount = mAmount * 10;
                }


                if (
                    amount <= 0 &&
                    mAmount > 0
                ) {
                    amount = mAmount;
                }

            } else {

                amount = 0;
                mAmount = 0;
                yAmount = 0;

            }


            // -------------------------------
            // PHOTO REQUIRED
            // -------------------------------

            if (!req.file) {
                return res.status(400).json({
                    error: "Course photo is required"
                });
            }


            // -------------------------------
            // UPLOAD TO CLOUDINARY
            // -------------------------------

            console.log("========== COURSE IMAGE DEBUG ==========");
console.log("FILE NAME:", req.file?.originalname);
console.log("FILE MIME:", req.file?.mimetype);
console.log("BUFFER:", !!req.file?.buffer);
console.log("BUFFER SIZE:", req.file?.buffer?.length);

const photoPath = await persistFile(
    req.file,
    "uniskill/courses"
);

console.log("PHOTO PATH RETURNED:", photoPath);
console.log("PHOTO PATH TYPE:", typeof photoPath);
console.log("========================================");


            // -------------------------------
            // CREATE COURSE
            // -------------------------------

            const newCourse = new Course({

                course_id:
                    `crs_${
                        crypto.randomUUID
                            ? crypto
                                .randomUUID()
                                .replace(/-/g, "")
                                .substring(0, 12)
                            : Date.now().toString(36)
                    }`,

                course_title,

                course_description,

                course_amount: amount,

                monthly_amount: mAmount,

                yearly_amount: yAmount,

                pricing_period:
                    pricing_period || "both",

                course_type,

                // Cloudinary URL stored in MongoDB
                photo: photoPath,

                discount: 0,

                discount_time: null,

                coupons: []
            });


            await newCourse.save();


            await invalidateCourseCaches(
                newCourse.course_id
            );


            return res.status(201).json({
                message:
                    "Course added successfully",

                course: newCourse
            });

        } catch (error) {

            console.log(
                "ADD COURSE ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Internal server error"
            });
        }
    }
);


// ======================================================
// ADD / UPDATE DISCOUNT
// ======================================================

courseRouter.post(
    "/add-discount/:course_id",

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {

            const { course_id } = req.params;

            const {
                discount,
                discount_time
            } = req.body;


            const discountValue =
                Number(discount);


            if (
                isNaN(discountValue) ||
                discountValue <= 0 ||
                discountValue > 100
            ) {
                return res.status(400).json({
                    error:
                        "Discount must be between 1 and 100"
                });
            }


            if (!discount_time) {
                return res.status(400).json({
                    error:
                        "Discount expiry time is required"
                });
            }


            const expiryTime =
                new Date(discount_time);


            if (
                isNaN(expiryTime.getTime()) ||
                expiryTime <= new Date()
            ) {
                return res.status(400).json({
                    error:
                        "Discount expiry time must be a valid future date"
                });
            }


            const course =
                await Course.findOne({ course_id });


            if (!course) {
                return res.status(404).json({
                    error:
                        "Course not found"
                });
            }


            course.discount =
                discountValue;

            course.discount_time =
                expiryTime;


            await course.save();


            await invalidateCourseCaches(
                course_id
            );


            return res.status(200).json({
                message:
                    "Discount added successfully",

                course: {
                    course_id:
                        course.course_id,

                    course_title:
                        course.course_title,

                    course_amount:
                        course.course_amount,

                    discount:
                        course.discount,

                    discount_time:
                        course.discount_time
                }
            });

        } catch (error) {

            console.log(
                "ADD DISCOUNT ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    "Internal server error"
            });
        }
    }
);


// ======================================================
// ADD COUPON (pushes to coupons array)
// ======================================================

courseRouter.post(
    "/add-coupon/:course_id",

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {

            const { course_id } =
                req.params;

            const {
                person_name,
                coupon_discount,
                coupon_code_time
            } = req.body;


            if (!person_name) {
                return res.status(400).json({
                    error:
                        "Person name is required"
                });
            }


            const discountValue =
                Number(coupon_discount);


            if (
                isNaN(discountValue) ||
                discountValue <= 0 ||
                discountValue > 100
            ) {
                return res.status(400).json({
                    error:
                        "Coupon discount must be between 1 and 100"
                });
            }


            if (!coupon_code_time) {
                return res.status(400).json({
                    error:
                        "Coupon expiry time is required"
                });
            }


            const expiryTime =
                new Date(coupon_code_time);


            if (
                isNaN(expiryTime.getTime()) ||
                expiryTime <= new Date()
            ) {
                return res.status(400).json({
                    error:
                        "Coupon expiry time must be a valid future date"
                });
            }


            const course =
                await Course.findOne({ course_id });


            if (!course) {
                return res.status(404).json({
                    error:
                        "Course not found"
                });
            }


            const namePart =
                person_name
                    .replace(/[^a-zA-Z]/g, "")
                    .substring(0, 4)
                    .toUpperCase();


            const uniquePart =
                crypto.randomUUID
                    ? crypto
                        .randomUUID()
                        .replace(/-/g, "")
                        .substring(0, 6)
                        .toUpperCase()
                    : Math.random()
                        .toString(36)
                        .substring(2, 8)
                        .toUpperCase();


            const coupon_code =
                `${namePart}-${uniquePart}`;


            course.coupons.push({
                code: coupon_code,
                discount: discountValue,
                expires_at: expiryTime,
                person_name: person_name,
                created_at: new Date()
            });

            await course.save();


            await invalidateCourseCaches(
                course_id
            );


            return res.status(200).json({
                message:
                    "Coupon added successfully",

                coupon: {
                    course_id:
                        course.course_id,

                    course_title:
                        course.course_title,

                    coupon_code,

                    coupon_discount:
                        discountValue,

                    coupon_code_time:
                        expiryTime
                }
            });

        } catch (error) {

            console.log(
                "ADD COUPON ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    "Internal server error"
            });
        }
    }
);


// ======================================================
// DELETE COUPON (remove a specific coupon from the array)
// ======================================================

courseRouter.delete(
    "/delete-coupon/:course_id/:coupon_id",

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {
            const { course_id, coupon_id } = req.params;

            const course = await Course.findOne({ course_id });

            if (!course) {
                return res.status(404).json({
                    error: "Course not found"
                });
            }

            const couponIndex = course.coupons.findIndex(
                (c) => c._id.toString() === coupon_id
            );

            if (couponIndex === -1) {
                return res.status(404).json({
                    error: "Coupon not found"
                });
            }

            course.coupons.splice(couponIndex, 1);
            await course.save();

            await invalidateCourseCaches(course_id);

            return res.status(200).json({
                message: "Coupon deleted successfully",
                course_id
            });

        } catch (error) {
            console.log("DELETE COUPON ERROR:", error);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ======================================================
// GET COUPONS FOR A COURSE (admin only)
// ======================================================

courseRouter.get(
    "/coupons/:course_id",

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {
            const { course_id } = req.params;

            const course = await Course.findOne({ course_id }).lean();

            if (!course) {
                return res.status(404).json({
                    error: "Course not found"
                });
            }

            return res.status(200).json({
                course_id,
                course_title: course.course_title,
                coupons: course.coupons || []
            });

        } catch (error) {
            console.log("GET COUPONS ERROR:", error);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);


// ======================================================
// GET ALL COURSES - ADMIN
// ======================================================

courseRouter.get(
    "/admin/all-courses",

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {

            const allCourses =
                await Course
                    .find({})
                    .sort({ createdAt: -1 })
                    .lean();


            return res.status(200).json({
                message:
                    "Courses fetched successfully",

                total:
                    allCourses.length,

                courses:
                    allCourses
            });

        } catch (error) {

            console.log(
                "ADMIN GET COURSES ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    "Internal server error"
            });
        }
    }
);


// ======================================================
// UPDATE COURSE
// ======================================================

courseRouter.put(
    "/update-course/:course_id",

    upload.single("photo"),

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {

            const { course_id } =
                req.params;


            const {
                course_title,
                course_description,
                course_amount,
                monthly_amount,
                yearly_amount,
                pricing_period,
                course_type
            } = req.body;


            const course =
                await Course.findOne({
                    course_id
                });


            if (!course) {
                return res.status(404).json({
                    error:
                        "Course not found"
                });
            }


            // -------------------------------
            // COURSE TYPE VALIDATION
            // -------------------------------

            if (
                course_type &&
                !["free", "paid"]
                    .includes(course_type)
            ) {
                return res.status(400).json({
                    error:
                        "Course type must be free or paid"
                });
            }


            // -------------------------------
            // UPDATE BASIC FIELDS
            // -------------------------------

            if (course_type) {
                course.course_type =
                    course_type;
            }


            if (course_title) {
                course.course_title =
                    course_title;
            }


            if (course_description) {
                course.course_description =
                    course_description;
            }


            if (pricing_period) {
                course.pricing_period =
                    pricing_period;
            }


            // -------------------------------
            // UPDATE AMOUNTS
            // -------------------------------

            if (
                course_amount !== undefined
            ) {

                const amount =
                    Number(course_amount);

                if (
                    !isNaN(amount) &&
                    amount >= 0
                ) {
                    course.course_amount =
                        amount;
                }
            }


            if (
                monthly_amount !== undefined
            ) {

                const mAmount =
                    Number(monthly_amount);

                if (
                    !isNaN(mAmount) &&
                    mAmount >= 0
                ) {
                    course.monthly_amount =
                        mAmount;
                }
            }


            if (
                yearly_amount !== undefined
            ) {

                const yAmount =
                    Number(yearly_amount);

                if (
                    !isNaN(yAmount) &&
                    yAmount >= 0
                ) {
                    course.yearly_amount =
                        yAmount;
                }
            }


            // -------------------------------
            // FREE COURSE
            // -------------------------------

            if (
                course.course_type === "free"
            ) {

                course.course_amount = 0;

                course.monthly_amount = 0;

                course.yearly_amount = 0;
            }


            // -------------------------------
            // UPDATE PHOTO
            // -------------------------------

            if (req.file) {

                // Make sure Cloudinary is configured
                if (!isConfigured) {
                    return res.status(500).json({
                        error:
                            "Cloudinary is not configured on the server."
                    });
                }


                const photoPath =
                    await persistFile(
                        req.file,
                        "uniskill/courses"
                    );


                // Store Cloudinary URL
                course.photo =
                    photoPath;
            }


            await course.save();


            await invalidateCourseCaches(
                course_id
            );


            return res.status(200).json({
                message:
                    "Course updated successfully",

                course
            });

        } catch (error) {

            console.log(
                "UPDATE COURSE ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Internal server error"
            });
        }
    }
);


// ======================================================
// DELETE COURSE
// ======================================================

courseRouter.delete(
    "/delete-course/:course_id",

    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {
        try {

            const { course_id } =
                req.params;


            const course =
                await Course.findOne({
                    course_id
                });


            if (!course) {
                return res.status(404).json({
                    error:
                        "Course not found"
                });
            }


            await Course.findOneAndDelete({
                course_id
            });


            await invalidateCourseCaches(
                course_id
            );


            return res.status(200).json({
                message:
                    "Course deleted successfully",

                course_id
            });

        } catch (error) {

            console.log(
                "DELETE COURSE ERROR:",
                error
            );

            return res.status(500).json({
                error:
                    "Internal server error"
            });
        }
    }
);


module.exports = courseRouter;