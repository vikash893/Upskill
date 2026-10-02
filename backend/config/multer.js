const multer = require("multer");
const path = require("path");

const fileFilter = (req, file, cb) => {
    const allowedExtensions = /\.(jpeg|jpg|png|webp|gif|pdf|doc|docx|txt|zip|rar|ppt|pptx|xls|xlsx|csv|mp4|webm)$/i;
    const isExtAllowed = allowedExtensions.test(path.extname(file.originalname || ""));

    if (isExtAllowed || file.mimetype) {
        cb(null, true);
    } else {
        cb(new Error("File format not supported"), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

module.exports = upload;
