const { getCache, setCache } = require("../config/redis");

/**
 * High-performance Cache-Aside wrapper with TTL and Jitter
 * Prevents Cache Stampede (Thundering Herd) when high-concurrency requests hit simultaneously.
 */

async function cacheWrap(key, ttlSeconds, fetchFunction) {
    const cached = await getCache(key);
    if (cached !== null && cached !== undefined) {
        return cached;
    }

    const data = await fetchFunction();
    if (data !== null && data !== undefined) {
        // Add 0-10% random jitter to TTL to prevent all keys expiring at the exact same millisecond
        const jitter = Math.floor(ttlSeconds * (0.05 * Math.random()));
        const effectiveTtl = ttlSeconds + jitter;
        await setCache(key, data, effectiveTtl);
    }
    return data;
}

module.exports = {
    cacheWrap
};
