const cloudinary = require("cloudinary").v2;

const isConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

console.log("========== CLOUDINARY ==========");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME || "MISSING");
console.log("API Key exists:", Boolean(process.env.CLOUDINARY_API_KEY));
console.log("API Secret exists:", Boolean(process.env.CLOUDINARY_API_SECRET));
console.log("Cloudinary configured:", isConfigured);
console.log("================================");

async function persistFile(file, folder = "uniskill") {
    if (!file) return null;

    if (!isConfigured) {
        throw new Error(
            "Cloudinary is not configured. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
        );
    }

    if (!file.buffer) {
        throw new Error(
            "Uploaded file buffer is missing. Make sure Multer uses memoryStorage()."
        );
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto"
            },
            (error, result) => {
                if (error) {
                    console.error("CLOUDINARY UPLOAD ERROR:", error);
                    return reject(error);
                }

                if (!result?.secure_url) {
                    return reject(
                        new Error("Cloudinary did not return a secure URL.")
                    );
                }

                console.log(
                    "CLOUDINARY UPLOAD SUCCESS:",
                    result.secure_url
                );

                resolve(result.secure_url);
            }
        );

        stream.end(file.buffer);
    });
}

module.exports = {
    persistFile,
    isConfigured
};