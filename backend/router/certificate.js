const crypto = require("crypto");
const express = require("express");
const upload = require("../config/multer");
const Certificate = require("../models/certificate");
const Course = require("../models/courses");
const Enrollment = require("../models/enrollment");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { persistFile } = require("../config/cloudinary");
const createCertificatePdf = require("../services/certificatePdf");

const certificateRouter = express.Router();
const signatureUpload = upload.fields([
    { name: "admin_signature", maxCount: 1 },
    { name: "teacher_signature", maxCount: 1 }
]);

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const getSignatureUrls = async (files) => {
    const adminSignature = files?.admin_signature?.[0];
    const teacherSignature = files?.teacher_signature?.[0];

    if (!adminSignature || !teacherSignature) {
        throw new Error("Upload both the admin and teacher signature images.");
    }

    if (
        !adminSignature.mimetype?.startsWith("image/") ||
        !teacherSignature.mimetype?.startsWith("image/")
    ) {
        throw new Error("Signatures must be image files.");
    }

    const [adminUrl, teacherUrl] = await Promise.all([
        persistFile(adminSignature, "uniskill/certificates/signatures"),
        persistFile(teacherSignature, "uniskill/certificates/signatures")
    ]);

    return {
        admin_signature: adminUrl,
        teacher_signature: teacherUrl
    };
};

const newCertificateId = () => `UNS-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

certificateRouter.get(
    "/certificates/mine",
    authMiddleware,
    requireRole("STUDENT"),
    async (req, res) => {
        try {
            const certificates = await Certificate.find({
                student_email: normalizeEmail(req.user.email)
            })
                .select("certificate_id student_name course_title issue_date issuance_type createdAt")
                .sort({ issue_date: -1 })
                .lean();

            return res.status(200).json({ certificates });
        } catch (error) {
            console.log("GET STUDENT CERTIFICATES ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

certificateRouter.get(
    "/certificates/:certificateId/download",
    authMiddleware,
    requireRole("STUDENT"),
    async (req, res) => {
        try {
            const certificate = await Certificate.findOne({
                _id: req.params.certificateId,
                student_email: normalizeEmail(req.user.email)
            }).lean();

            if (!certificate) {
                return res.status(404).json({ error: "Certificate not found." });
            }

            const pdf = await createCertificatePdf(certificate);
            const fileName = `${certificate.certificate_id}.pdf`;
            res.set({
                "Content-Type": "application/pdf",
                "Content-Length": pdf.length,
                "Content-Disposition": `attachment; filename="${fileName}"`
            });
            return res.send(pdf);
        } catch (error) {
            console.log("DOWNLOAD CERTIFICATE ERROR:", error);
            return res.status(500).json({ error: "Could not generate the certificate PDF." });
        }
    }
);

certificateRouter.get(
    "/certificates/admin",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const certificates = await Certificate.find({})
                .select("certificate_id student_name student_email course_title issue_date issuance_type issued_by createdAt")
                .sort({ issue_date: -1 })
                .limit(500)
                .lean();

            return res.status(200).json({ certificates });
        } catch (error) {
            console.log("GET ADMIN CERTIFICATES ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

certificateRouter.get(
    "/certificates/admin/course/:courseId/roster",
    authMiddleware,
    requireRole("ADMIN"),
    async (req, res) => {
        try {
            const course = await Course.findOne({ course_id: req.params.courseId })
                .select("course_id course_title")
                .lean();

            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }

            const enrollments = await Enrollment.find({
                course_id: course.course_id,
                status: "active"
            }).sort({ createdAt: 1 }).lean();
            const emails = enrollments.map(enrollment => normalizeEmail(enrollment.student_email));
            const [users, certificates] = await Promise.all([
                User.find({ email: { $in: emails } }).select("email name").lean(),
                Certificate.find({
                    course_id: course.course_id,
                    issuance_type: "course",
                    student_email: { $in: emails }
                }).select("student_email").lean()
            ]);
            const usersByEmail = new Map(users.map(user => [normalizeEmail(user.email), user]));
            const issuedEmails = new Set(certificates.map(certificate => normalizeEmail(certificate.student_email)));
            const students = enrollments.map(enrollment => {
                const email = normalizeEmail(enrollment.student_email);
                const user = usersByEmail.get(email);
                return {
                    email,
                    name: user?.name || enrollment.student_name,
                    already_issued: issuedEmails.has(email)
                };
            });

            return res.status(200).json({ course, students });
        } catch (error) {
            console.log("GET CERTIFICATE ROSTER ERROR:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

certificateRouter.post(
    "/certificates/admin/manual",
    authMiddleware,
    requireRole("ADMIN"),
    signatureUpload,
    async (req, res) => {
        try {
            const studentEmail = normalizeEmail(req.body.student_email);
            const studentName = String(req.body.student_name || "").trim();
            const courseTitle = String(req.body.course_title || "").trim();

            if (!studentEmail || !studentName || !courseTitle) {
                return res.status(400).json({
                    error: "Student email, student name, and course title are required."
                });
            }

            const student = await User.findOne({ email: studentEmail }).select("_id email");
            if (!student) {
                return res.status(404).json({ error: "No student account exists for that email." });
            }

            const signatures = await getSignatureUrls(req.files);
            const certificate = await Certificate.create({
                certificate_id: newCertificateId(),
                student_id: student._id,
                student_email: studentEmail,
                student_name: studentName,
                course_title: courseTitle,
                issue_date: new Date(),
                issued_by: normalizeEmail(req.user.email),
                issuance_type: "manual",
                ...signatures
            });

            return res.status(201).json({
                message: "Certificate issued successfully.",
                certificate
            });
        } catch (error) {
            console.log("ISSUE MANUAL CERTIFICATE ERROR:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
);

certificateRouter.post(
    "/certificates/admin/course/:courseId",
    authMiddleware,
    requireRole("ADMIN"),
    signatureUpload,
    async (req, res) => {
        try {
            const course = await Course.findOne({ course_id: req.params.courseId }).lean();
            if (!course) {
                return res.status(404).json({ error: "Course not found." });
            }

            const enrollments = await Enrollment.find({
                course_id: course.course_id,
                status: "active"
            }).sort({ createdAt: 1 }).lean();

            if (enrollments.length === 0) {
                return res.status(400).json({ error: "There are no active students enrolled in this course." });
            }

            const studentEmails = enrollments.map(enrollment => normalizeEmail(enrollment.student_email));
            const [users, existingCertificates] = await Promise.all([
                User.find({ email: { $in: studentEmails } }).select("_id email name").lean(),
                Certificate.find({
                    course_id: course.course_id,
                    issuance_type: "course",
                    student_email: { $in: studentEmails }
                }).select("student_email").lean()
            ]);
            const userByEmail = new Map(users.map(user => [normalizeEmail(user.email), user]));
            const alreadyIssued = new Set(existingCertificates.map(certificate => normalizeEmail(certificate.student_email)));
            const recipients = enrollments
                .map(enrollment => {
                    const email = normalizeEmail(enrollment.student_email);
                    const user = userByEmail.get(email);
                    return user && !alreadyIssued.has(email)
                        ? { enrollment, user, email }
                        : null;
                })
                .filter(Boolean);

            if (recipients.length === 0) {
                return res.status(409).json({
                    error: "Every active student in this course already has a certificate."
                });
            }

            const signatures = await getSignatureUrls(req.files);
            const distributedAt = new Date();
            const certificateRecords = recipients.map(({ enrollment, user, email }) => ({
                certificate_id: newCertificateId(),
                student_id: user._id,
                student_email: email,
                student_name: user.name || enrollment.student_name,
                course_id: course.course_id,
                course_title: course.course_title,
                issue_date: distributedAt,
                issued_by: normalizeEmail(req.user.email),
                issuance_type: "course",
                ...signatures
            }));

            const certificates = await Certificate.insertMany(certificateRecords);
            return res.status(201).json({
                message: `Certificates issued to ${certificates.length} students.`,
                issued_count: certificates.length,
                skipped_count: enrollments.length - certificates.length
            });
        } catch (error) {
            console.log("ISSUE COURSE CERTIFICATES ERROR:", error);
            if (error.code === 11000) {
                return res.status(409).json({ error: "A certificate was already issued for one or more students in this course." });
            }
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
);

module.exports = certificateRouter;