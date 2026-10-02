const Redis = require("ioredis");

let redisClient = null;
let isConnected = false;
const memoryCache = new Map();

function getMemoryValue(key) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        memoryCache.delete(key);
        return null;
    }
    return entry.value;
}

function setMemoryValue(key, value, ttlSeconds) {
    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000
    });
}

async function connectRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.log("ℹ️  REDIS_URL is not set. Running in-memory caching & rate-limiting fallback mode.");
        return null;
    }

    try {
        redisClient = new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            connectTimeout: 5000,
            retryStrategy(times) {
                if (times > 5) {
                    console.warn("⚠️ Redis reconnection limit reached. Falling back to local in-memory store.");
                    return null;
                }
                return Math.min(times * 200, 2000);
            }
        });

        redisClient.on("connect", () => {
            isConnected = true;
            console.log("Redis client connected successfully.");
        });

        redisClient.on("ready", () => {
            isConnected = true;
        });

        redisClient.on("error", (error) => {
            isConnected = false;
            console.error("⚠️ Redis connection error:", error.message);
        });

        redisClient.on("close", () => {
            isConnected = false;
        });

        await redisClient.connect();
        await redisClient.ping();
        isConnected = true;
        console.log("Redis ping successful.");
        return redisClient;
    } catch (error) {
        console.warn("⚠️ Could not establish initial connection to Redis:", error.message);
        console.log("ℹ️  System will continue operating with in-memory caching fallback.");
        redisClient = null;
        isConnected = false;
        return null;
    }
}

function getRedisClient() {
    return isConnected ? redisClient : null;
}

// Fast cache getter
async function getCache(key) {
    try {
        const client = getRedisClient();
        if (client) {
            const data = await client.get(key);
            if (data) return JSON.parse(data);
        }
    } catch (err) {
        console.error(`Redis get error for key "${key}":`, err.message);
    }
    return getMemoryValue(key);
}

// Fast cache setter with TTL in seconds
async function setCache(key, value, ttlSeconds = 300) {
    try {
        const client = getRedisClient();
        if (client) {
            await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
            return true;
        }
    } catch (err) {
        console.error(`Redis set error for key "${key}":`, err.message);
    }
    setMemoryValue(key, value, ttlSeconds);
    return true;
}

// Cache deletion
async function delCache(key) {
    try {
        const client = getRedisClient();
        if (client) await client.del(key);
    } catch (err) {
        console.error(`Redis del error for key "${key}":`, err.message);
    }
    memoryCache.delete(key);
    return true;
}

// Cache deletion by prefix pattern (e.g. "courses:*")
async function delByPrefix(prefix) {
    try {
        const client = getRedisClient();
        if (client) {
            const stream = client.scanStream({ match: `${prefix}*`, count: 250 });
            for await (const keys of stream) {
                if (keys.length) await client.unlink(...keys);
            }
        }
    } catch (err) {
        console.error(`Redis delByPrefix error for prefix "${prefix}":`, err.message);
    }
    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) memoryCache.delete(key);
    }
    return true;
}

function isRedisConnected() {
    return isConnected;
}

async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {}
        redisClient = null;
        isConnected = false;
    }
    memoryCache.clear();
}

module.exports = {
    connectRedis,
    getRedisClient,
    isRedisConnected,
    getCache,
    setCache,
    delCache,
    delByPrefix,
    closeRedis
};