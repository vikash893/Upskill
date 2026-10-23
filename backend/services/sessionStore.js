const crypto = require("crypto");
const { getCache, setCache, delCache } = require("../config/redis");

/**
 * High-performance Distributed Session Store
 * Fast retrieval via Redis with fallback to local memory cache.
 */

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function createSession(userId, userDetails) {
    const sessionId = `sess_${crypto.randomBytes(24).toString("hex")}`;
    const sessionData = {
        sessionId,
        userId: String(userId),
        email: userDetails.email,
        name: userDetails.name,
        role: userDetails.role,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
    };

    await setCache(`session:${sessionId}`, sessionData, SESSION_TTL_SECONDS);
    return sessionData;
}

async function getSession(sessionId) {
    if (!sessionId) return null;
    const session = await getCache(`session:${sessionId}`);
    if (session) {
        // Touch session asynchronously to extend TTL without blocking response
        setCache(`session:${sessionId}`, { ...session, lastActiveAt: new Date().toISOString() }, SESSION_TTL_SECONDS).catch(() => {});
    }
    return session;
}

async function destroySession(sessionId) {
    if (!sessionId) return;
    await delCache(`session:${sessionId}`);
}

module.exports = {
    createSession,
    getSession,
    destroySession,
    SESSION_TTL_SECONDS
};
