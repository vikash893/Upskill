const { getRedisClient, isRedisConnected } = require('../../../config/redis');
const logger = require('../../../middleware/logger');

// Fallback in-memory store if Redis is unavailable
const memoryStore = new Map();

class RedisStore {
    static async get(key) {
        if (isRedisConnected()) {
            const client = getRedisClient();
            if (client) {
                const val = await client.get(key);
                return val ? JSON.parse(val) : null;
            }
        }
        const item = memoryStore.get(key);
        if (!item) return null;
        if (item.expiresAt && item.expiresAt < Date.now()) {
            memoryStore.delete(key);
            return null;
        }
        return item.value;
    }

    static async set(key, value, ttlSeconds = null) {
        if (isRedisConnected()) {
            const client = getRedisClient();
            if (client) {
                const payload = JSON.stringify(value);
                if (ttlSeconds) {
                    await client.set(key, payload, 'EX', ttlSeconds);
                } else {
                    await client.set(key, payload);
                }
                return true;
            }
        }
        memoryStore.set(key, {
            value,
            expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
        });
        return true;
    }

    static async del(key) {
        if (isRedisConnected()) {
            const client = getRedisClient();
            if (client) {
                await client.del(key);
                return true;
            }
        }
        memoryStore.delete(key);
        return true;
    }

    // Presence management
    static async setParticipantPresence(classId, userId, presenceData, ttlSeconds = 300) {
        const key = `presence:${classId}:${userId}`;
        await this.set(key, presenceData, ttlSeconds);
    }

    static async getParticipantPresence(classId, userId) {
        const key = `presence:${classId}:${userId}`;
        return await this.get(key);
    }

    static async removeParticipantPresence(classId, userId) {
        const key = `presence:${classId}:${userId}`;
        await this.del(key);
    }

    // Distributed Locking for class operations
    static async acquireLock(lockKey, ttlMs = 5000) {
        if (isRedisConnected()) {
            const client = getRedisClient();
            if (client) {
                const result = await client.set(`lock:${lockKey}`, process.pid, 'NX', 'PX', ttlMs);
                return result === 'OK';
            }
        }
        // In-memory simple lock
        const lock = memoryStore.get(`lock:${lockKey}`);
        if (lock && lock.expiresAt > Date.now()) {
            return false;
        }
        memoryStore.set(`lock:${lockKey}`, { value: process.pid, expiresAt: Date.now() + ttlMs });
        return true;
    }

    static async releaseLock(lockKey) {
        if (isRedisConnected()) {
            const client = getRedisClient();
            if (client) {
                await client.del(`lock:${lockKey}`);
                return true;
            }
        }
        memoryStore.delete(`lock:${lockKey}`);
        return true;
    }
}

module.exports = RedisStore;
