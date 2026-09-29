const { RateLimiterMemory, RateLimiterRedis } = require("rate-limiter-flexible");
const { getRedisClient } = require("../config/redis");

function createRateLimit({ keyPrefix, points, duration, keyGenerator, customMessage }) {
    const memoryLimiter = new RateLimiterMemory({ keyPrefix, points, duration });
    let redisLimiter = null;
    let currentStoreClient = null;

    return async (req, res, next) => {
        try {
            const redis = getRedisClient();
            let limiter = memoryLimiter;

            if (redis) {
                if (currentStoreClient !== redis) {
                    currentStoreClient = redis;
                    redisLimiter = new RateLimiterRedis({
                        storeClient: redis,
                        keyPrefix,
                        points,
                        duration,
                        insuranceLimiter: memoryLimiter
                    });
                }
                limiter = redisLimiter || memoryLimiter;
            }

            const rawKey = keyGenerator ? keyGenerator(req) : (req.ip || req.socket.remoteAddress || "unknown");
            const key = String(rawKey);

            await limiter.consume(key);
            return next();
        } catch (error) {
            if (error && typeof error.msBeforeNext === "number") {
                const retryAfterSecs = Math.ceil(error.msBeforeNext / 1000);
                res.set("Retry-After", String(retryAfterSecs));
                return res.status(429).json({
                    error: customMessage || "Too many requests. Please slow down and try again shortly.",
                    retry_after_seconds: retryAfterSecs
                });
            }

            // Fallback gracefully on unforeseen limiter store error
            console.warn(`Rate limiter error for ${keyPrefix}:`, error?.message || error);
            return next();
        }
    };
}

// Global API rate limit (1200 requests / min per IP)
const apiRateLimit = createRateLimit({
    keyPrefix: "rl:api",
    points: Number(process.env.API_RATE_LIMIT_POINTS) || 1200,
    duration: Number(process.env.API_RATE_LIMIT_DURATION) || 60,
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown"
});

// Authentication rate limit to prevent brute-force attacks (30 attempts / min per IP)
const authRateLimit = createRateLimit({
    keyPrefix: "rl:auth",
    points: Number(process.env.AUTH_RATE_LIMIT_POINTS) || 30,
    duration: 60,
    keyGenerator: (req) => `${req.ip || req.socket.remoteAddress || "unknown"}_${req.body?.email || ""}`,
    customMessage: "Too many login or registration attempts. Please wait a minute before trying again."
});

// Payment & checkout rate limit (20 orders / min)
const paymentRateLimit = createRateLimit({
    keyPrefix: "rl:payment",
    points: Number(process.env.PAYMENT_RATE_LIMIT_POINTS) || 20,
    duration: 60,
    keyGenerator: (req) => req.user?.email || req.ip || req.socket.remoteAddress || "unknown",
    customMessage: "Too many payment checkout requests. Please wait a moment before trying again."
});

// Live Class join/leave rate limit (30 actions / min)
const liveClassRateLimit = createRateLimit({
    keyPrefix: "rl:live-class",
    points: Number(process.env.LIVE_CLASS_RATE_LIMIT_POINTS) || 30,
    duration: 60,
    keyGenerator: (req) => req.user?.email || req.ip || "unknown"
});

// Contact query submission rate limit (10 inquiries / min)
const contactRateLimit = createRateLimit({
    keyPrefix: "rl:contact",
    points: 10,
    duration: 60,
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
    customMessage: "Too many contact messages submitted. Please try again later."
});

module.exports = {
    createRateLimit,
    apiRateLimit,
    authRateLimit,
    paymentRateLimit,
    liveClassRateLimit,
    contactRateLimit
};