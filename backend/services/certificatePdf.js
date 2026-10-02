const PDFDocument = require("pdfkit");

const colors = {
    navy: "#092C4C",
    gold: "#C69A4A",
    ink: "#17253A",
    muted: "#647084",
    paper: "#FFFEFB"
};

async function fetchSignature(url) {
    const pngUrl = url.replace("/upload/", "/upload/f_png,w_800/");
    const response = await fetch(pngUrl);

    if (!response.ok) {
        throw new Error("Could not load a certificate signature image.");
    }

    return Buffer.from(await response.arrayBuffer());
}

async function createCertificatePdf(certificate) {
    const [adminSignature, teacherSignature] = await Promise.all([
        fetchSignature(certificate.admin_signature),
        fetchSignature(certificate.teacher_signature)
    ]);

    return new Promise((resolve, reject) => {
        const document = new PDFDocument({
            size: "A4",
            layout: "landscape",
            margin: 0,
            info: {
                Title: `${certificate.course_title} Certificate`,
                Author: "UniSkill"
            }
        });
        const chunks = [];
        const width = 841.89;
        const height = 595.28;

        document.on("data", chunk => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));

        document.rect(0, 0, width, height).fill(colors.paper);
        document.lineWidth(2).strokeColor(colors.gold).rect(12, 12, width - 24, height - 24).stroke();
        document.lineWidth(5).strokeColor(colors.navy).rect(20, 20, width - 40, height - 40).stroke();
        document.lineWidth(1).strokeColor(colors.gold).rect(28, 28, width - 56, height - 56).stroke();

        document.circle(width / 2, 67, 23).fill(colors.navy);
        document.font("Times-Bold").fontSize(25).fillColor(colors.gold).text("U", width / 2 - 9, 51, { width: 18, align: "center" });
        document.font("Helvetica-Bold").fontSize(22).fillColor(colors.navy).text("UniSkill", width / 2 - 52, 92, { width: 104, align: "center" });
        document.font("Helvetica").fontSize(7).fillColor(colors.muted).text("LEARN  |  BUILD  |  GROW", width / 2 - 70, 119, { width: 140, align: "center", characterSpacing: 1.2 });

        document.font("Times-Bold").fontSize(37).fillColor(colors.navy).text("CERTIFICATE", 90, 151, { width: width - 180, align: "center", characterSpacing: 1.5 });
        document.moveTo(225, 202).lineTo(326, 202).lineWidth(1.2).strokeColor(colors.gold).stroke();
        document.moveTo(516, 202).lineTo(617, 202).lineWidth(1.2).strokeColor(colors.gold).stroke();
        document.font("Times-Roman").fontSize(16).fillColor(colors.gold).text("O F   C O M P L E T I O N", 326, 193, { width: 190, align: "center" });

        document.font("Helvetica").fontSize(9).fillColor(colors.muted).text("THIS CERTIFIES THAT", 0, 229, { width, align: "center", characterSpacing: 2.2 });
        document.font("Times-Italic").fontSize(34).fillColor(colors.ink).text(certificate.student_name, 92, 249, { width: width - 184, align: "center", lineBreak: false });
        document.moveTo(235, 294).lineTo(607, 294).lineWidth(0.7).strokeColor(colors.gold).stroke();
        document.font("Helvetica").fontSize(10).fillColor(colors.muted).text("has successfully completed the online course", 0, 307, { width, align: "center" });
        document.font("Helvetica-Bold").fontSize(19).fillColor(colors.navy).text(certificate.course_title, 72, 325, { width: width - 144, align: "center", lineBreak: false });
        document.font("Helvetica").fontSize(9).fillColor(colors.muted).text("in recognition of dedication, hard work, and commitment to continuous learning with UniSkill.", 80, 353, { width: width - 160, align: "center" });

        document.roundedRect(174, 383, 494, 42, 7).lineWidth(0.6).strokeColor("#E4E0D8").fillAndStroke("#FBFAF7", "#E4E0D8");
        document.font("Helvetica").fontSize(8).fillColor(colors.muted).text("CERTIFICATE DISTRIBUTED", 194, 393, { width: 182 });
        document.font("Helvetica-Bold").fontSize(10).fillColor(colors.ink).text(new Date(certificate.issue_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }), 194, 406, { width: 205 });
        document.moveTo(420, 391).lineTo(420, 417).lineWidth(0.6).strokeColor("#D6D0C5").stroke();
        document.font("Helvetica").fontSize(8).fillColor(colors.muted).text("CERTIFICATE ID", 441, 393, { width: 195 });
        document.font("Helvetica-Bold").fontSize(10).fillColor(colors.ink).text(certificate.certificate_id, 441, 406, { width: 205 });

        document.image(adminSignature, 202, 443, { fit: [130, 42], align: "center", valign: "center" });
        document.image(teacherSignature, 509, 443, { fit: [130, 42], align: "center", valign: "center" });
        document.moveTo(170, 489).lineTo(362, 489).lineWidth(1).strokeColor(colors.gold).stroke();
        document.moveTo(478, 489).lineTo(670, 489).lineWidth(1).strokeColor(colors.gold).stroke();
        document.font("Helvetica-Bold").fontSize(9).fillColor(colors.ink).text("ADMINISTRATOR", 170, 496, { width: 192, align: "center" });
        document.font("Helvetica").fontSize(7).fillColor(colors.muted).text("UNISKILL", 170, 509, { width: 192, align: "center", characterSpacing: 1.1 });
        document.font("Helvetica-Bold").fontSize(9).fillColor(colors.ink).text("COURSE INSTRUCTOR", 478, 496, { width: 192, align: "center" });
        document.font("Helvetica").fontSize(7).fillColor(colors.muted).text("UNISKILL", 478, 509, { width: 192, align: "center", characterSpacing: 1.1 });

        document.end();
    });
}

module.exports = createCertificatePdf;