const memoryHits = new Map();

function rateLimiter({ windowMs = 60000, max = 120, message = 'Too many requests, please try again later.' } = {}) {
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
        const now = Date.now();
        const record = memoryHits.get(ip) || { count: 0, resetTime: now + windowMs };

        if (now > record.resetTime) {
            record.count = 1;
            record.resetTime = now + windowMs;
        } else {
            record.count += 1;
        }

        memoryHits.set(ip, record);

        if (record.count > max) {
            return res.status(429).json({
                status: 'error',
                code: 'TOO_MANY_REQUESTS',
                message
            });
        }

        next();
    };
}

module.exports = rateLimiter;
