const sharp = require("sharp");

/**
 * Processes an uploaded handwritten signature image to remove the paper/scanner background
 * and make it a clean, transparent PNG that looks like real pen ink written directly on the certificate.
 *
 * @param {Buffer} inputBuffer - The raw image buffer (JPG, PNG, WebP, etc.)
 * @returns {Promise<Buffer>} - Cleaned transparent PNG buffer
 */
async function processSignature(inputBuffer) {
    if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
        throw new Error("Invalid image buffer provided to processSignature.");
    }

    try {
        // Normalize rotation from EXIF orientation, convert to standard RGBA
        const pipeline = sharp(inputBuffer).rotate();
        const { data, info } = await pipeline
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;
        const channels = info.channels; // 4 (RGBA)

        // Find the average background color from the 4 corners of the image
        // (Paper corners are almost always pure background)
        const corners = [
            0, // top-left
            (width - 1) * 4, // top-right
            ((height - 1) * width) * 4, // bottom-left
            ((height - 1) * width + (width - 1)) * 4 // bottom-right
        ];

        let cornerLuminanceSum = 0;
        let validCorners = 0;
        for (const idx of corners) {
            if (idx >= 0 && idx + 2 < data.length) {
                const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                cornerLuminanceSum += lum;
                validCorners++;
            }
        }
        const avgCornerLum = validCorners > 0 ? cornerLuminanceSum / validCorners : 240;

        // Adaptive thresholds based on paper tone
        const paperThreshold = Math.max(180, Math.min(235, avgCornerLum - 15));
        const inkThreshold = Math.max(90, Math.min(145, paperThreshold - 70));

        for (let i = 0; i < data.length; i += channels) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue; // Already transparent

            // Perceptual luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (lum >= paperThreshold) {
                // Background paper: completely transparent
                data[i + 3] = 0;
            } else if (lum <= inkThreshold) {
                // Pure ink: keep full opacity, enhance ink to rich deep ink tone
                data[i + 3] = a;
                // Subtle darkening of ink strokes for high-contrast crisp readability
                data[i] = Math.round(r * 0.75);
                data[i + 1] = Math.round(g * 0.75);
                data[i + 2] = Math.round(b * 0.85); // Preserve deep blue/black ink character
            } else {
                // Edge anti-aliasing gradient
                const factor = (paperThreshold - lum) / (paperThreshold - inkThreshold);
                const smoothAlpha = Math.round(factor * factor * 255); // Quadratic falloff for sharp ink strokes
                data[i + 3] = Math.min(a, smoothAlpha);
                data[i] = Math.round(r * 0.85);
                data[i + 1] = Math.round(g * 0.85);
                data[i + 2] = Math.round(b * 0.90);
            }
        }

        // Reconstruct PNG with alpha, and trim surrounding blank margins
        let outputImage = sharp(data, {
            raw: {
                width,
                height,
                channels: 4
            }
        });

        // Trim empty transparent space around the signature so it doesn't have huge wasted borders
        try {
            outputImage = outputImage.trim({ threshold: 5 });
        } catch {
            // If trim fails (e.g. edge case), keep original framing
        }

        return await outputImage.png({ quality: 95, compressionLevel: 8 }).toBuffer();
    } catch (err) {
        console.error("processSignature error, falling back to original buffer:", err.message);
        // Fallback: return input as PNG
        try {
            return await sharp(inputBuffer).png().toBuffer();
        } catch {
            return inputBuffer;
        }
    }
}

module.exports = processSignature;
