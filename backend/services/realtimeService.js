const jwt = require("jsonwebtoken");

let globalIo = null;

function setGlobalSocketIo(io) {
    globalIo = io;
}

function getGlobalSocketIo() {
    return globalIo;
}

function registerRealtimeSocketHandlers(io) {
    globalIo = io;

    // Use default namespace '/' or dedicated '/realtime'
    const realtimeNamespace = io.of("/realtime");

    realtimeNamespace.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || 
                          socket.handshake.headers?.authorization?.replace("Bearer ", "");
            if (!token) {
                return next(new Error("Missing authentication token"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || "uniskill_2026_secret");
            socket.user = {
                id: decoded.id || decoded.userId || decoded._id,
                email: (decoded.email || "").toLowerCase(),
                role: (decoded.role || "STUDENT").toUpperCase(),
                name: decoded.name || "User"
            };

            next();
        } catch (err) {
            next(new Error(`Authentication failed: ${err.message}`));
        }
    });

    realtimeNamespace.on("connection", (socket) => {
        const user = socket.user;
        if (!user) return;

        // 1. Join user-specific room
        socket.join(`user:${user.email}`);

        // 2. Join role-specific room (e.g. "role:ADMIN", "role:TEACHER", "role:STUDENT")
        socket.join(`role:${user.role}`);

        // 3. If Admin, join the dedicated audit logs channel
        if (user.role === "ADMIN") {
            socket.join("channel:audit_logs");
        }

        // 4. Client channel join requests (e.g., enrolled course announcements)
        socket.on("join:course", ({ course_id }) => {
            if (course_id) {
                socket.join(`course:${course_id}`);
            }
        });

        socket.on("leave:course", ({ course_id }) => {
            if (course_id) {
                socket.leave(`course:${course_id}`);
            }
        });
    });
}

/**
 * Broadcast an announcement event in real-time to relevant users
 */
function emitRealtimeAnnouncement(announcement) {
    if (!globalIo) return;
    const ns = globalIo.of("/realtime");

    // target_type: 'course' | 'audience'
    if (announcement.target_type === "course" && announcement.course_id) {
        ns.to(`course:${announcement.course_id}`).emit("announcement:new", announcement);
        // Also send to all admins so they see all broadcasts
        ns.to("role:ADMIN").emit("announcement:new", announcement);
    } else if (announcement.target_type === "audience") {
        if (announcement.audience === "everyone") {
            ns.emit("announcement:new", announcement);
        } else if (announcement.audience === "teachers") {
            ns.to("role:TEACHER").to("role:ADMIN").emit("announcement:new", announcement);
        } else if (announcement.audience === "students") {
            ns.to("role:STUDENT").to("role:ADMIN").emit("announcement:new", announcement);
        }
    } else {
        ns.emit("announcement:new", announcement);
    }
}

/**
 * Broadcast a new audit log event in real-time to active admin dashboards
 */
function emitRealtimeAuditLog(logEntry) {
    if (!globalIo) return;
    const ns = globalIo.of("/realtime");
    ns.to("channel:audit_logs").emit("audit:new_log", logEntry);
}

module.exports = {
    setGlobalSocketIo,
    getGlobalSocketIo,
    registerRealtimeSocketHandlers,
    emitRealtimeAnnouncement,
    emitRealtimeAuditLog
};
