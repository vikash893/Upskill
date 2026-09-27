const express = require("express");
const upload = require("../config/multer");
const crypto = require("crypto");
const courses = require("../../backend/models/courses");
const authMiddleware = require("../../backend/middleware/authMiddleware");
const requireRole = require("../../backend/middleware/roleMiddleware");

const courseRouter = express.Router();


// ======================================================
// ADD COURSE
// ======================================================

courseRouter.post(
    "/add-course",
    upload.single("photo"),
    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {

        try {

            console.log("BODY:", req.body);
            console.log("FILE:", req.file);


            const {
                course_title,
                course_description,
                course_amount,
                monthly_amount,
                yearly_amount,
                pricing_period,
                course_type
            } = req.body;


            // ==================================================
            // REQUIRED FIELDS
            // ==================================================

            if (
                !course_title ||
                !course_description ||
                !course_type
            ) {
                return res.status(400).json({
                    error: "Title, description, and course type are required"
                });
            }


            // ==================================================
            // COURSE TYPE
            // ==================================================

            if (!["free", "paid"].includes(course_type)) {

                return res.status(400).json({
                    error: "Course type must be free or paid"
                });

            }


            // ==================================================
            // COURSE AMOUNT
            // ==================================================

            let amount = Number(course_amount) || 0;
            let mAmount = Number(monthly_amount) || 0;
            let yAmount = Number(yearly_amount) || 0;


            if (course_type === "paid") {
                if (mAmount <= 0 && yAmount <= 0 && amount <= 0) {
                    return res.status(400).json({
                        error: "Paid course must have a valid monthly, yearly, or base amount"
                    });
                }
                if (mAmount <= 0 && amount > 0) mAmount = amount;
                if (yAmount <= 0 && mAmount > 0) yAmount = mAmount * 10; // default 10-month discount for yearly
                if (amount <= 0 && mAmount > 0) amount = mAmount;
            } else {
                // Free course
                amount = 0;
                mAmount = 0;
                yAmount = 0;
            }


            // ==================================================
            // PHOTO
            // ==================================================

            if (!req.file) {

                return res.status(400).json({
                    error: "Course photo is required"
                });

            }


            // ==================================================
            // CREATE COURSE
            // ==================================================

           const photoPath = req.file? `uploads/${req.file.filename}`: "";

            const newCourse = new courses({

                course_id: `crs_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").substring(0, 12) : Date.now().toString(36)}`,

                course_title: course_title,

                course_description: course_description,

                course_amount: amount,

                monthly_amount: mAmount,

                yearly_amount: yAmount,

                pricing_period: pricing_period || "both",

                course_type: course_type,

                photo: photoPath,

                // Discount will be added later
                discount: 0,

                discount_time: null,

                // Coupon will be added later
                coupon_code: null,

                coupon_discount: 0,

                coupon_code_time: null
            });


            console.log("COURSE BEFORE SAVE:", newCourse);


            await newCourse.save();


            // ==================================================
            // SUCCESS
            // ==================================================

            return res.status(201).json({

                message: "Course added successfully",

                course: newCourse

            });


        } catch (error) {

            console.log("ADD COURSE ERROR:", error);

            return res.status(500).json({
                error: "Internal server error"
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


            // ==================================================
            // VALIDATE DISCOUNT
            // ==================================================

            const discountValue = Number(discount);


            if (
                isNaN(discountValue) ||
                discountValue <= 0 ||
                discountValue > 100
            ) {

                return res.status(400).json({
                    error: "Discount must be between 1 and 100"
                });

            }


            // ==================================================
            // VALIDATE TIME
            // ==================================================

            if (!discount_time) {

                return res.status(400).json({
                    error: "Discount expiry time is required"
                });

            }


            const expiryTime = new Date(discount_time);


            if (isNaN(expiryTime.getTime())) {

                return res.status(400).json({
                    error: "Invalid discount expiry time"
                });

            }


            if (expiryTime <= new Date()) {

                return res.status(400).json({
                    error: "Discount expiry time must be in the future"
                });

            }


            // ==================================================
            // FIND COURSE
            // ==================================================

            const course = await courses.findOne({
                course_id
            });


            if (!course) {

                return res.status(404).json({
                    error: "Course not found"
                });

            }


            // ==================================================
            // ADD / UPDATE DISCOUNT
            // ==================================================

            course.discount = discountValue;

            course.discount_time = expiryTime;


            await course.save();


            return res.status(200).json({

                message: "Discount added successfully",

                course: {
                    course_id: course.course_id,
                    course_title: course.course_title,
                    course_amount: course.course_amount,

                    discount: course.discount,
                    discount_time: course.discount_time
                }

            });


        } catch (error) {

            console.log("ADD DISCOUNT ERROR:", error);

            return res.status(500).json({
                error: "Internal server error"
            });

        }

    }
);



// ======================================================
// ADD / UPDATE COUPON
// ======================================================

courseRouter.post(
    "/add-coupon/:course_id",
    authMiddleware,
    requireRole("ADMIN"),

    async (req, res) => {

        try {

            const { course_id } = req.params;


            const {
                person_name,
                coupon_discount,
                coupon_code_time
            } = req.body;


            // ==================================================
            // PERSON NAME
            // ==================================================

            if (!person_name) {

                return res.status(400).json({
                    error: "Person name is required"
                });

            }


            // ==================================================
            // COUPON DISCOUNT
            // ==================================================

            const discountValue = Number(coupon_discount);


            if (
                isNaN(discountValue) ||
                discountValue <= 0 ||
                discountValue > 100
            ) {

                return res.status(400).json({
                    error: "Coupon discount must be between 1 and 100"
                });

            }


            // ==================================================
            // COUPON EXPIRY
            // ==================================================

            if (!coupon_code_time) {

                return res.status(400).json({
                    error: "Coupon expiry time is required"
                });

            }


            const expiryTime = new Date(coupon_code_time);


            if (isNaN(expiryTime.getTime())) {

                return res.status(400).json({
                    error: "Invalid coupon expiry time"
                });

            }


            if (expiryTime <= new Date()) {

                return res.status(400).json({
                    error: "Coupon expiry time must be in the future"
                });

            }


            // ==================================================
            // FIND COURSE
            // ==================================================

            const course = await courses.findOne({
                course_id
            });


            if (!course) {

                return res.status(404).json({
                    error: "Course not found"
                });

            }


            // ==================================================
            // GENERATE COUPON
            // ==================================================

            const namePart = person_name
                .replace(/[^a-zA-Z]/g, "")
                .substring(0, 4)
                .toUpperCase();


            const uniquePart = crypto.randomUUID 
                ? crypto.randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase()
                : Math.random().toString(36).substring(2, 8).toUpperCase();


            const coupon_code =
                `${namePart}-${uniquePart}`;


            // ==================================================
            // SAVE COUPON
            // ==================================================

            course.coupon_code = coupon_code;

            course.coupon_discount = discountValue;

            course.coupon_code_time = expiryTime;


            await course.save();


            return res.status(200).json({

                message: "Coupon added successfully",

                coupon: {

                    course_id: course.course_id,

                    course_title: course.course_title,

                    coupon_code: course.coupon_code,

                    coupon_discount: course.coupon_discount,

                    coupon_code_time: course.coupon_code_time

                }

            });


        } catch (error) {

            console.log("ADD COUPON ERROR:", error);

            return res.status(500).json({
                error: "Internal server error"
            });

        }

    }
);

// ======================================================
// GET ALL COURSES (ADMIN VIEW WITH ALL DETAILS)
// ======================================================

courseRouter.get(
    "/admin/all-courses",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const allCourses = await courses.find({}).sort({ createdAt: -1 });
            return res.status(200).json({
                message: "Courses fetched successfully",
                total: allCourses.length,
                courses: allCourses
            });
        } catch (error) {
            console.log("ADMIN GET COURSES ERROR:", error);
            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

// ======================================================
// UPDATE COURSE
// ======================================================

courseRouter.put(
    "/update-course/:course_id",
    authMiddleware,
    requireRole("ADMIN"),
    upload.single("photo"),

    async (req, res) => {

        try {

            const { course_id } = req.params;

            const {
                course_title,
                course_description,
                course_amount,
                monthly_amount,
                yearly_amount,
                pricing_period,
                course_type
            } = req.body;


            // ==================================================
            // FIND COURSE
            // ==================================================

            const course = await courses.findOne({
                course_id
            });

            if (!course) {
                return res.status(404).json({
                    error: "Course not found"
                });
            }


            // ==================================================
            // COURSE TYPE
            // ==================================================

            if (
                course_type &&
                !["free", "paid"].includes(course_type)
            ) {
                return res.status(400).json({
                    error: "Course type must be free or paid"
                });
            }


            // ==================================================
            // UPDATE COURSE TYPE
            // ==================================================

            if (course_type) {
                course.course_type = course_type;
            }


            // ==================================================
            // UPDATE TITLE & DESCRIPTION
            // ==================================================

            if (course_title) {
                course.course_title = course_title;
            }

            if (course_description) {
                course.course_description = course_description;
            }

            if (pricing_period) {
                course.pricing_period = pricing_period;
            }


            // ==================================================
            // UPDATE AMOUNTS
            // ==================================================

            if (course_amount !== undefined) {
                const amount = Number(course_amount);
                if (!isNaN(amount) && amount >= 0) {
                    course.course_amount = amount;
                }
            }

            if (monthly_amount !== undefined) {
                const mAmount = Number(monthly_amount);
                if (!isNaN(mAmount) && mAmount >= 0) {
                    course.monthly_amount = mAmount;
                }
            }

            if (yearly_amount !== undefined) {
                const yAmount = Number(yearly_amount);
                if (!isNaN(yAmount) && yAmount >= 0) {
                    course.yearly_amount = yAmount;
                }
            }


            // ==================================================
            // FREE COURSE
            // ==================================================

            if (course.course_type === "free") {
                course.course_amount = 0;
                course.monthly_amount = 0;
                course.yearly_amount = 0;
            }


            // ==================================================
            // UPDATE PHOTO
            // ==================================================

            if (req.file) {
                course.photo = req.file.path.replace(/\\/g, "/");
            }


            // ==================================================
            // SAVE
            // ==================================================

            await course.save();


            return res.status(200).json({

                message: "Course updated successfully",

                course: course

            });


        } catch (error) {

            console.log("UPDATE COURSE ERROR:", error);

            return res.status(500).json({
                error: "Internal server error"
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

            const { course_id } = req.params;


            // ==================================================
            // FIND COURSE
            // ==================================================

            const course = await courses.findOne({
                course_id
            });


            if (!course) {

                return res.status(404).json({
                    error: "Course not found"
                });

            }


            // ==================================================
            // DELETE COURSE
            // ==================================================

            await courses.findOneAndDelete({
                course_id
            });


            return res.status(200).json({

                message: "Course deleted successfully",

                course_id: course_id

            });


        } catch (error) {

            console.log("DELETE COURSE ERROR:", error);

            return res.status(500).json({
                error: "Internal server error"
            });

        }

    }
);


module.exports = courseRouter;