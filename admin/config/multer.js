const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../backend/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /\.(jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|zip|rar|ppt|pptx|xls|xlsx|csv|mp4|webm)$/i;
    const isExtAllowed = allowedExtensions.test(path.extname(file.originalname));

    if (isExtAllowed || file.mimetype) {
        cb(null, true);
    } else {
        cb(new Error("File format not supported"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB
    }
});

module.exports = upload;