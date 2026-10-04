const express = require("express");
const crypto = require("crypto");
const LiveClass = require("../models/liveClass");
const Enrollment = require("../models/enrollment");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const liveStreamRouter = express.Router();
const sessions = new Map();
const VIEWER_TTL_MS = 30000;
const SESSION_TTL_MS = 120000;

function makeId(prefix) {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${id.replace(/-/g, "").slice(0, 16)}`;
}

function getSession(classId) {
    let session = sessions.get(classId);
    if (!session) {
        session = {
            host: null,
            viewers: new Map(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        sessions.set(classId, session);
    }
    session.updatedAt = Date.now();
    return session;
}

function cleanupSession(session) {
    const now = Date.now();
    for (const [viewerId, viewer] of session.viewers.entries()) {
        if (now - viewer.lastSeen > VIEWER_TTL_MS) {
            session.viewers.delete(viewerId);
        }
    }
}

setInterval(() => {
    const now = Date.now();
    for (const [classId, session] of sessions.entries()) {
        cleanupSession(session);
        const hostExpired = !session.host || now - session.host.lastSeen > SESSION_TTL_MS;
        if (hostExpired && session.viewers.size === 0 && now - session.updatedAt > SESSION_TTL_MS) {
            sessions.delete(classId);
        }
    }
}, 30000).unref();

async function getAuthorizedLiveClass(req, res, { teacherOnly = false } = {}) {
    const liveClass = await LiveClass.findOne({ class_id: req.params.class_id }).lean();
    if (!liveClass) {
        res.status(404).json({ error: "Live class not found" });
        return null;
    }

    const role = req.user.role;
    const email = req.user.email;
    if (teacherOnly && role !== "ADMIN" && role !== "TEACHER") {
        res.status(403).json({ error: "Teacher access required" });
        return null;
    }

    if (role === "STUDENT") {
        const enrollment = await Enrollment.findOne({
            student_email: email,
            course_id: liveClass.course_id,
            status: "active"
        }).lean();
        if (!enrollment) {
            res.status(403).json({ error: "You must be enrolled in this course to join this live stream" });
            return null;
        }
    }

    if (role === "TEACHER" && liveClass.teacher_email !== email) {
        res.status(403).json({ error: "You are not assigned to host this live stream" });
        return null;
    }

    return liveClass;
}

function serializeViewer(viewer) {
    return {
        viewer_id: viewer.viewerId,
        display_name: viewer.displayName,
        role: viewer.role,
        joined_at: viewer.joinedAt,
        last_seen: viewer.lastSeen,
        has_offer: Boolean(viewer.offer),
        has_answer: Boolean(viewer.answer)
    };
}

liveStreamRouter.get("/live-stream/session/:class_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = sessions.get(req.params.class_id);
        if (session) cleanupSession(session);

        return res.status(200).json({
            provider: "uniskill-webrtc",
            class_id: liveClass.class_id,
            room_name: liveClass.room_name,
            status: liveClass.status,
            host_online: Boolean(session?.host && Date.now() - session.host.lastSeen <= SESSION_TTL_MS),
            viewer_count: session ? session.viewers.size : 0,
            ice_servers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
    } catch (error) {
        console.log("LIVE STREAM SESSION ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.post("/live-stream/host/:class_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res, { teacherOnly: true });
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        cleanupSession(session);
        session.host = {
            email: req.user.email,
            name: req.user.name || liveClass.teacher_name,
            lastSeen: Date.now()
        };

        return res.status(200).json({
            message: "Host heartbeat accepted",
            viewer_count: session.viewers.size,
            viewers: Array.from(session.viewers.values()).map(serializeViewer)
        });
    } catch (error) {
        console.log("LIVE STREAM HOST ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.post("/live-stream/viewer/:class_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        cleanupSession(session);
        const viewerId = req.body.viewer_id || makeId("viewer");
        const displayName = req.user.name || req.user.email?.split("@")[0] || "Learner";
        const existing = session.viewers.get(viewerId);
        if (existing && existing.email !== req.user.email && req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You cannot reuse another viewer session" });
        }

        session.viewers.set(viewerId, {
            viewerId,
            email: req.user.email,
            displayName,
            role: req.user.role,
            joinedAt: existing?.joinedAt || new Date().toISOString(),
            lastSeen: Date.now(),
            offer: existing?.offer || null,
            answer: existing?.answer || null,
            hostCandidates: existing?.hostCandidates || [],
            viewerCandidates: existing?.viewerCandidates || []
        });

        return res.status(200).json({
            viewer_id: viewerId,
            host_online: Boolean(session.host && Date.now() - session.host.lastSeen <= SESSION_TTL_MS),
            ice_servers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
    } catch (error) {
        console.log("LIVE STREAM VIEWER ERROR:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.get("/live-stream/viewers/:class_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res, { teacherOnly: true });
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        cleanupSession(session);
        return res.status(200).json({ viewers: Array.from(session.viewers.values()).map(serializeViewer) });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.post("/live-stream/offer/:class_id/:viewer_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res, { teacherOnly: true });
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        const viewer = session.viewers.get(req.params.viewer_id);
        if (!viewer) return res.status(404).json({ error: "Viewer is no longer waiting for this stream" });

        viewer.offer = req.body.offer;
        viewer.answer = null;
        viewer.hostCandidates = [];
        viewer.viewerCandidates = [];
        viewer.lastSeen = Date.now();
        return res.status(200).json({ message: "Offer saved" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.get("/live-stream/offer/:class_id/:viewer_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        const viewer = session.viewers.get(req.params.viewer_id);
        if (!viewer) return res.status(404).json({ error: "Viewer session expired" });
        const fromHost = req.user.role === "ADMIN" || (req.user.role === "TEACHER" && liveClass.teacher_email === req.user.email);
        if (!fromHost && viewer.email !== req.user.email) {
            return res.status(403).json({ error: "You cannot read another viewer offer" });
        }

        viewer.lastSeen = Date.now();
        return res.status(200).json({ offer: viewer.offer || null });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.post("/live-stream/answer/:class_id/:viewer_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        const viewer = session.viewers.get(req.params.viewer_id);
        if (!viewer) return res.status(404).json({ error: "Viewer session expired" });
        if (viewer.email !== req.user.email && req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You cannot answer for another viewer" });
        }

        viewer.answer = req.body.answer;
        viewer.lastSeen = Date.now();
        return res.status(200).json({ message: "Answer saved" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.get("/live-stream/answer/:class_id/:viewer_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res, { teacherOnly: true });
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        const viewer = session.viewers.get(req.params.viewer_id);
        if (!viewer) return res.status(404).json({ error: "Viewer session expired" });

        return res.status(200).json({ answer: viewer.answer || null });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.post("/live-stream/ice/:class_id/:viewer_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        const viewer = session.viewers.get(req.params.viewer_id);
        if (!viewer) return res.status(404).json({ error: "Viewer session expired" });

        const fromHost = req.user.role === "ADMIN" || (req.user.role === "TEACHER" && liveClass.teacher_email === req.user.email);
        if (!fromHost && viewer.email !== req.user.email) {
            return res.status(403).json({ error: "You cannot signal for another viewer" });
        }

        const candidate = req.body.candidate;
        if (candidate) {
            const payload = { id: makeId("ice"), candidate, created_at: Date.now() };
            if (fromHost) viewer.hostCandidates.push(payload);
            else viewer.viewerCandidates.push(payload);
        }
        viewer.lastSeen = Date.now();
        return res.status(200).json({ message: "ICE candidate saved" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.get("/live-stream/ice/:class_id/:viewer_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = getSession(req.params.class_id);
        const viewer = session.viewers.get(req.params.viewer_id);
        if (!viewer) return res.status(404).json({ error: "Viewer session expired" });
        const fromHost = req.user.role === "ADMIN" || (req.user.role === "TEACHER" && liveClass.teacher_email === req.user.email);
        const target = req.query.target === "host" ? "host" : "viewer";
        if (target === "host" && !fromHost) {
            return res.status(403).json({ error: "Only the stream host can read host-bound candidates" });
        }
        if (target === "viewer" && !fromHost && viewer.email !== req.user.email) {
            return res.status(403).json({ error: "You cannot read another viewer candidates" });
        }

        const since = String(req.query.since || "");
        const list = target === "host" ? viewer.viewerCandidates : viewer.hostCandidates;
        const startIndex = since ? list.findIndex(item => item.id === since) + 1 : 0;
        const candidates = list.slice(Math.max(0, startIndex));
        return res.status(200).json({
            candidates,
            cursor: candidates.length ? candidates[candidates.length - 1].id : since
        });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.delete("/live-stream/viewer/:class_id/:viewer_id", authMiddleware, async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res);
        if (!liveClass) return;

        const session = sessions.get(req.params.class_id);
        const viewer = session?.viewers.get(req.params.viewer_id);
        const fromHost = req.user.role === "ADMIN" || (req.user.role === "TEACHER" && liveClass.teacher_email === req.user.email);
        if (viewer && !fromHost && viewer.email !== req.user.email) {
            return res.status(403).json({ error: "You cannot close another viewer session" });
        }

        if (session) session.viewers.delete(req.params.viewer_id);
        return res.status(200).json({ message: "Viewer left stream" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

liveStreamRouter.delete("/live-stream/host/:class_id", authMiddleware, requireRole("TEACHER", "ADMIN"), async (req, res) => {
    try {
        const liveClass = await getAuthorizedLiveClass(req, res, { teacherOnly: true });
        if (!liveClass) return;

        sessions.delete(req.params.class_id);
        return res.status(200).json({ message: "Live stream closed" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = liveStreamRouter;
