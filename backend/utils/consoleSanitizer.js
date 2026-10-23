/**
 * Production Console Sanitizer & Privacy Filter
 * Strips tokens, authorization headers, passwords, and sensitive keys from all stdout/stderr logs.
 */

const SENSITIVE_PATTERNS = [
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, // JWT regex
    /(["']?(?:password|token|secret|authorization|razorpay_signature|key_secret)["']?\s*[:=]\s*["']?)([^"',\s\}]+)/gi
];

function sanitize(message) {
    if (typeof message !== "string") {
        try {
            message = JSON.stringify(message);
        } catch {
            return message;
        }
    }
    let clean = message;
    for (const pattern of SENSITIVE_PATTERNS) {
        clean = clean.replace(pattern, (match, prefix, val) => {
            if (prefix && val) {
                return `${prefix}***REDACTED***`;
            }
            return "[TOKEN REDACTED]";
        });
    }
    return clean;
}

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function (...args) {
    const sanitizedArgs = args.map(arg => typeof arg === "string" ? sanitize(arg) : arg);
    originalLog.apply(console, sanitizedArgs);
};

console.warn = function (...args) {
    const sanitizedArgs = args.map(arg => typeof arg === "string" ? sanitize(arg) : arg);
    originalWarn.apply(console, sanitizedArgs);
};

console.error = function (...args) {
    const sanitizedArgs = args.map(arg => typeof arg === "string" ? sanitize(arg) : arg);
    originalError.apply(console, sanitizedArgs);
};

module.exports = { sanitize };
