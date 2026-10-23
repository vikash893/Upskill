const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const processSignature = require("../utils/processSignature");

const colors = {
    navy: "#092C4C",
    deepNavy: "#051A2E",
    gold: "#C69A4A",
    lightGold: "#DFBA6E",
    ink: "#17253A",
    muted: "#647084",
    paper: "#FFFEFB",
    cardBg: "#FBFAF7",
    cardBorder: "#E8E4DC"
};

async function fetchSignature(url) {
    if (!url) {
        throw new Error("Missing signature URL.");
    }

    try {
        // Prefer PNG high-res if on Cloudinary
        const pngUrl = url.includes("/upload/")
            ? url.replace("/upload/", "/upload/f_png,w_800/")
            : url;

        const response = await fetch(pngUrl);
        if (!response.ok) {
            throw new Error(`Failed to download signature (HTTP ${response.status}).`);
        }

        const rawBuffer = Buffer.from(await response.arrayBuffer());
        // Clean paper background and make transparent
        return await processSignature(rawBuffer);
    } catch (err) {
        console.error("fetchSignature error for URL:", url, err.message);
        throw new Error("Could not load and process a certificate signature image.");
    }
}

async function createCertificatePdf(certificate) {
    const [adminSignature, teacherSignature] = await Promise.all([
        fetchSignature(certificate.admin_signature),
        fetchSignature(certificate.teacher_signature)
    ]);

    // Generate unique verification URL & QR Code
    const baseUrl = process.env.LANDING_URL || process.env.FRONTEND_URL || "https://uniskill.in";
    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const verifyUrl = `${cleanBaseUrl}/verify-certificate?id=${encodeURIComponent(certificate.certificate_id)}`;

    const qrCodeBuffer = await QRCode.toBuffer(verifyUrl, {
        width: 220,
        margin: 1,
        color: {
            dark: "#092C4C",
            light: "#00000000" // Transparent background
        }
    });

    // Check for official logo
    const logoCandidates = [
        path.join(__dirname, "../assets/logo.png"),
        path.join(__dirname, "../../frontend/public/logo.png"),
        path.join(__dirname, "../../landing/public/logo.png")
    ];
    let officialLogoPath = null;
    for (const candidate of logoCandidates) {
        if (fs.existsSync(candidate)) {
            officialLogoPath = candidate;
            break;
        }
    }

    return new Promise((resolve, reject) => {
        const document = new PDFDocument({
            size: "A4",
            layout: "landscape",
            margin: 0,
            info: {
                Title: `${certificate.course_title} Certificate - ${certificate.student_name}`,
                Author: "UniSkill Learning Academy",
                Subject: `Certificate of Completion for ${certificate.student_name}`,
                Keywords: `UniSkill, Certificate, ${certificate.certificate_id}`
            }
        });

        const chunks = [];
        const width = 841.89;
        const height = 595.28;

        document.on("data", chunk => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));

        // 1. Parchment Background
        document.rect(0, 0, width, height).fill(colors.paper);

        // 2. Ornate Border System
        document.lineWidth(2).strokeColor(colors.gold).rect(12, 12, width - 24, height - 24).stroke();
        document.lineWidth(5).strokeColor(colors.navy).rect(20, 20, width - 40, height - 40).stroke();
        document.lineWidth(1).strokeColor(colors.gold).rect(28, 28, width - 56, height - 56).stroke();

        // Corner Ornaments
        const cornerSize = 16;
        // Top-left
        document.rect(29, 29, cornerSize, cornerSize).fill(colors.gold);
        // Top-right
        document.rect(width - 29 - cornerSize, 29, cornerSize, cornerSize).fill(colors.gold);
        // Bottom-left
        document.rect(29, height - 29 - cornerSize, cornerSize, cornerSize).fill(colors.gold);
        // Bottom-right
        document.rect(width - 29 - cornerSize, height - 29 - cornerSize, cornerSize, cornerSize).fill(colors.gold);

        // 3. Official Logo & Wordmark
        if (officialLogoPath) {
            try {
                document.image(officialLogoPath, width / 2 - 28, 42, { fit: [56, 56], align: "center", valign: "center" });
            } catch (err) {
                console.error("Could not render logo image onto certificate:", err);
                document.circle(width / 2, 68, 22).fill(colors.navy);
                document.font("Times-Bold").fontSize(24).fillColor(colors.gold).text("U", width / 2 - 8, 54, { width: 16, align: "center" });
            }
        } else {
            document.circle(width / 2, 68, 22).fill(colors.navy);
            document.font("Times-Bold").fontSize(24).fillColor(colors.gold).text("U", width / 2 - 8, 54, { width: 16, align: "center" });
        }

        // Header Typography
        document.font("Helvetica-Bold").fontSize(21).fillColor(colors.navy).text("UniSkill", width / 2 - 60, 102, { width: 120, align: "center" });
        document.font("Helvetica").fontSize(7.5).fillColor(colors.muted).text("DIGITAL LEARNING & ACADEMIC CERTIFICATION", width / 2 - 120, 126, { width: 240, align: "center", characterSpacing: 1.2 });

        // 4. Main Title
        document.font("Times-Bold").fontSize(34).fillColor(colors.navy).text("CERTIFICATE", 90, 148, { width: width - 180, align: "center", characterSpacing: 2 });
        document.moveTo(230, 192).lineTo(330, 192).lineWidth(1.2).strokeColor(colors.gold).stroke();
        document.moveTo(512, 192).lineTo(612, 192).lineWidth(1.2).strokeColor(colors.gold).stroke();
        document.font("Times-Roman").fontSize(15).fillColor(colors.gold).text("O F   C O M P L E T I O N", 330, 184, { width: 182, align: "center" });

        // 5. Recipient Section
        document.font("Helvetica").fontSize(9).fillColor(colors.muted).text("THIS RECOGNITION IS PROUDLY CONFERRED UPON", 0, 214, { width, align: "center", characterSpacing: 1.8 });
        document.font("Times-Italic").fontSize(32).fillColor(colors.ink).text(certificate.student_name, 80, 232, { width: width - 160, align: "center", lineBreak: false });
        document.moveTo(220, 274).lineTo(622, 274).lineWidth(0.8).strokeColor(colors.gold).stroke();

        document.font("Helvetica").fontSize(9.5).fillColor(colors.muted).text("for successfully mastering all modules and practical requirements of the program", 0, 285, { width, align: "center" });
        document.font("Helvetica-Bold").fontSize(18).fillColor(colors.navy).text(certificate.course_title, 70, 301, { width: width - 140, align: "center", lineBreak: false });
        document.font("Helvetica").fontSize(8.5).fillColor(colors.muted).text("demonstrating dedicated pursuit of excellence, professional competence, and continuous skill advancement.", 80, 327, { width: width - 160, align: "center" });

        // 6. Metadata Badge Bar
        document.roundedRect(160, 350, 522, 40, 6).lineWidth(0.6).strokeColor(colors.cardBorder).fillAndStroke(colors.cardBg, colors.cardBorder);

        // Issue Date Column
        document.font("Helvetica").fontSize(7.5).fillColor(colors.muted).text("DATE OF ISSUANCE", 180, 358, { width: 150 });
        const formattedDate = new Date(certificate.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
        document.font("Helvetica-Bold").fontSize(9.5).fillColor(colors.ink).text(formattedDate, 180, 370, { width: 150 });

        // Vertical divider 1
        document.moveTo(350, 356).lineTo(350, 384).lineWidth(0.5).strokeColor("#D5D0C6").stroke();

        // Certificate ID Column
        document.font("Helvetica").fontSize(7.5).fillColor(colors.muted).text("UNIQUE CERTIFICATE ID", 370, 358, { width: 160 });
        document.font("Helvetica-Bold").fontSize(9.5).fillColor(colors.navy).text(certificate.certificate_id, 370, 370, { width: 160 });

        // Vertical divider 2
        document.moveTo(540, 356).lineTo(540, 384).lineWidth(0.5).strokeColor("#D5D0C6").stroke();

        // Status Column
        document.font("Helvetica").fontSize(7.5).fillColor(colors.muted).text("VERIFICATION STATUS", 555, 358, { width: 120 });
        document.font("Helvetica-Bold").fontSize(9.5).fillColor("#166534").text("GENUINE / VERIFIED", 555, 370, { width: 120 });

        // 7. Signatures & Verification QR Seal
        // Left: Administrator Signature
        document.image(adminSignature, 160, 412, { fit: [160, 48], align: "center", valign: "bottom" });
        document.moveTo(150, 464).lineTo(330, 464).lineWidth(1).strokeColor(colors.gold).stroke();
        document.font("Helvetica-Bold").fontSize(9).fillColor(colors.ink).text("ADMINISTRATOR", 150, 470, { width: 180, align: "center" });
        document.font("Helvetica").fontSize(7.5).fillColor(colors.muted).text("UNISKILL GOVERNANCE", 150, 482, { width: 180, align: "center", characterSpacing: 0.8 });

        // Center: Official QR Code Verification Seal
        document.roundedRect(width / 2 - 38, 404, 76, 94, 6).lineWidth(0.8).strokeColor(colors.gold).fillAndStroke(colors.cardBg, colors.gold);
        document.image(qrCodeBuffer, width / 2 - 27, 409, { fit: [54, 54], align: "center", valign: "center" });
        document.font("Helvetica-Bold").fontSize(6.5).fillColor(colors.navy).text("SCAN TO VERIFY", width / 2 - 36, 467, { width: 72, align: "center", characterSpacing: 0.6 });
        document.font("Helvetica").fontSize(5.5).fillColor(colors.muted).text("uniskill.in", width / 2 - 36, 477, { width: 72, align: "center" });
        document.font("Helvetica-Bold").fontSize(5.5).fillColor(colors.gold).text("AUTHENTIC", width / 2 - 36, 486, { width: 72, align: "center", characterSpacing: 0.5 });

        // Right: Course Instructor Signature
        document.image(teacherSignature, 512, 412, { fit: [160, 48], align: "center", valign: "bottom" });
        document.moveTo(502, 464).lineTo(682, 464).lineWidth(1).strokeColor(colors.gold).stroke();
        document.font("Helvetica-Bold").fontSize(9).fillColor(colors.ink).text("COURSE INSTRUCTOR", 502, 470, { width: 180, align: "center" });
        document.font("Helvetica").fontSize(7.5).fillColor(colors.muted).text("ACADEMIC FACULTY", 502, 482, { width: 180, align: "center", characterSpacing: 0.8 });

        // Footer Security Notice
        document.font("Helvetica").fontSize(7).fillColor(colors.muted).text(
            `Secure Verification URL: ${verifyUrl}  •  Tamper-proof UniSkill Credential Registry`,
            0,
            528,
            { width, align: "center" }
        );

        document.end();
    });
}

module.exports = createCertificatePdf;
