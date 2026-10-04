const jwt = require('jsonwebtoken');
const envConfig = require('../../../shared/config/env.config');
const liveClassService = require('../services/liveClass.service');
const participantService = require('../services/participant.service');
const signalingService = require('../services/signaling.service');
const recordingService = require('../services/recording.service');
const RedisStore = require('../../../shared/redis/redisStore');

const { verifyTokenWithFallbacks } = require('../../../shared/middleware/auth.middleware');

function registerLiveClassSocketHandlers(io) {
    const liveNamespace = io.of('/live-class');

    // Socket JWT Authentication Middleware
    liveNamespace.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication error: Missing token'));
            }

            const decoded = verifyTokenWithFallbacks(token);
            socket.user = {
                _id: decoded._id || decoded.id || decoded.userId || 'user_anon',
                id: decoded.id || decoded._id || decoded.userId || 'user_anon',
                email: decoded.email || 'user@uniskill.in',
                role: decoded.role || 'STUDENT'
            };

            next();
        } catch (err) {
            next(new Error(`Authentication failed: ${err.message}`));
        }
    });

    liveNamespace.on('connection', (socket) => {
        const user = socket.user;
        const userId = (user._id || user.id).toString();

        console.log(`[Socket] User connected: ${userId} (${user.email})`);

        // Join Class Room
        socket.on('class:join', async ({ classId }) => {
            try {
                if (!classId) return socket.emit('error', { message: 'classId is required' });

                const { class: liveClass, participant, sfuRoomId } = await liveClassService.joinClass(classId, user);
                
                socket.classId = classId;
                socket.join(classId);

                // Notify room of participant joined
                liveNamespace.to(classId).emit('participant:joined', {
                    participant,
                    userId,
                    role: participant.role
                });

                // Send current room state, participant list & active media producers to joining client
                const participants = await participantService.getClassParticipants(classId);
                const producers = await mediaServerService.getProducers(classId);
                socket.emit('class:joined', {
                    class: liveClass,
                    sfuRoomId,
                    participant,
                    participants,
                    producers
                });

            } catch (err) {
                socket.emit('error', { code: err.code || 'JOIN_FAILED', message: err.message });
            }
        });

        // WebRTC Transport Creation
        socket.on('webrtc:create-transport', async ({ type }, callback) => {
            try {
                const params = await signalingService.handleCreateTransport(socket.classId, user, { type });
                if (typeof callback === 'function') callback({ status: 'ok', params });
            } catch (err) {
                if (typeof callback === 'function') callback({ status: 'error', message: err.message });
            }
        });

        // WebRTC Connect Transport
        socket.on('webrtc:connect-transport', async ({ transportId, dtlsParameters }, callback) => {
            try {
                const res = await signalingService.handleConnectTransport(socket.classId, user, { transportId, dtlsParameters });
                if (typeof callback === 'function') callback({ status: 'ok', ...res });
            } catch (err) {
                if (typeof callback === 'function') callback({ status: 'error', message: err.message });
            }
        });

        // WebRTC Produce Track
        socket.on('webrtc:produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
            try {
                const producer = await signalingService.handleProduce(socket.classId, user, { transportId, kind, rtpParameters, appData });

                // Notify class participants of new producer
                socket.to(socket.classId).emit('webrtc:new-producer', {
                    producerId: producer.id,
                    participantId: userId,
                    kind,
                    appData
                });

                if (typeof callback === 'function') callback({ status: 'ok', id: producer.id });
            } catch (err) {
                if (typeof callback === 'function') callback({ status: 'error', message: err.message });
            }
        });

        // WebRTC Consume Track
        socket.on('webrtc:consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
            try {
                const consumer = await signalingService.handleConsume(socket.classId, user, { transportId, producerId, rtpCapabilities });
                if (typeof callback === 'function') callback({ status: 'ok', consumer });
            } catch (err) {
                if (typeof callback === 'function') callback({ status: 'error', message: err.message });
            }
        });

        // Media Toggle Events
        socket.on('participant:audio-state', async ({ enabled }) => {
            if (!socket.classId) return;
            const p = await participantService.updateParticipantMediaState(socket.classId, userId, { audioEnabled: Boolean(enabled) });
            liveNamespace.to(socket.classId).emit('participant:updated', { userId, audioEnabled: p.audioEnabled });
        });

        socket.on('participant:video-state', async ({ enabled }) => {
            if (!socket.classId) return;
            const p = await participantService.updateParticipantMediaState(socket.classId, userId, { videoEnabled: Boolean(enabled) });
            liveNamespace.to(socket.classId).emit('participant:updated', { userId, videoEnabled: p.videoEnabled });
        });

        // Host Actions: Mute Student
        socket.on('host:mute-participant', async ({ targetParticipantId }) => {
            try {
                const res = await signalingService.handleHostMuteParticipant(socket.classId, user, targetParticipantId);
                liveNamespace.to(socket.classId).emit('participant:muted-by-host', res);
            } catch (err) {
                socket.emit('error', { code: 'FORBIDDEN', message: err.message });
            }
        });

        // Host Actions: Disable Camera
        socket.on('host:disable-camera', async ({ targetParticipantId }) => {
            try {
                const res = await signalingService.handleHostDisableCamera(socket.classId, user, targetParticipantId);
                liveNamespace.to(socket.classId).emit('participant:camera-disabled-by-host', res);
            } catch (err) {
                socket.emit('error', { code: 'FORBIDDEN', message: err.message });
            }
        });

        // Host Actions: Remove Student
        socket.on('host:remove-participant', async ({ targetParticipantId }) => {
            try {
                const res = await signalingService.handleHostRemoveParticipant(socket.classId, user, targetParticipantId);
                liveNamespace.to(socket.classId).emit('participant:removed-by-host', res);

                // Find target socket, force leave room, and notify
                for (const [, s] of liveNamespace.adapter.nsp.sockets) {
                    const targetIdStr = (s.user?._id || s.user?.id)?.toString();
                    if (targetIdStr === targetParticipantId.toString() && s.classId === socket.classId) {
                        s.leave(socket.classId);
                        s.emit('participant:removed-by-host', {
                            targetParticipantId,
                            message: 'You have been removed from the class by the teacher.'
                        });
                        break;
                    }
                }
            } catch (err) {
                socket.emit('error', { code: 'FORBIDDEN', message: err.message });
            }
        });

        // Host Actions: Mute All
        socket.on('host:mute-all', async () => {
            try {
                const res = await signalingService.handleHostMuteAll(socket.classId, user);
                liveNamespace.to(socket.classId).emit('class:mute-all', res);
            } catch (err) {
                socket.emit('error', { code: 'FORBIDDEN', message: err.message });
            }
        });

        // Host Actions: Disable All Cameras
        socket.on('host:disable-all-cameras', async () => {
            try {
                const res = await signalingService.handleHostDisableAllCameras(socket.classId, user);
                liveNamespace.to(socket.classId).emit('class:disable-all-cameras', res);
            } catch (err) {
                socket.emit('error', { code: 'FORBIDDEN', message: err.message });
            }
        });

        // Screen Share Events
        socket.on('screen:start', async () => {
            if (!socket.classId) return;
            await participantService.updateParticipantMediaState(socket.classId, userId, { screenSharing: true });
            socket.to(socket.classId).emit('screen:started', { userId });
        });

        socket.on('screen:stop', async () => {
            if (!socket.classId) return;
            await participantService.updateParticipantMediaState(socket.classId, userId, { screenSharing: false });
            socket.to(socket.classId).emit('screen:stopped', { userId });
        });

        // Chat Message Handling
        socket.on('chat:message', async ({ text }) => {
            if (!socket.classId || !text) return;
            const messageObj = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                userId,
                senderEmail: user.email,
                text,
                timestamp: new Date().toISOString()
            };

            // Fast ephemeral publish in Redis for recent chat retrieval
            const chatKey = `chat:${socket.classId}`;
            const client = require('../../../shared/redis/redisStore');
            await client.set(`${chatKey}:${messageObj.id}`, messageObj, 86400);

            liveNamespace.to(socket.classId).emit('chat:message', messageObj);
        });

        // Host Recording Actions
        socket.on('recording:start', async () => {
            try {
                const recording = await recordingService.startRecording(socket.classId, user);
                liveNamespace.to(socket.classId).emit('recording:started', { recordingId: recording.recordingId });
            } catch (err) {
                socket.emit('error', { code: 'RECORDING_FAILED', message: err.message });
            }
        });

        socket.on('recording:stop', async () => {
            try {
                const recording = await recordingService.stopRecording(socket.classId, user);
                liveNamespace.to(socket.classId).emit('recording:stopped', { recordingId: recording.recordingId, status: 'processing' });
            } catch (err) {
                socket.emit('error', { code: 'RECORDING_FAILED', message: err.message });
            }
        });

        // WebRTC Direct Signaling Relay (Bidirectional Audio/Video track exchange)
        socket.on('webrtc:signal', ({ targetUserId, signal }) => {
            if (!socket.classId || !targetUserId) return;
            for (const [, s] of liveNamespace.adapter.nsp.sockets) {
                const targetIdStr = (s.user?._id || s.user?.id)?.toString();
                if (targetIdStr === targetUserId.toString() && s.classId === socket.classId) {
                    s.emit('webrtc:signal', {
                        fromUserId: userId,
                        fromRole: socket.user.role,
                        signal
                    });
                    break;
                }
            }
        });

        // Host End Class (Forces all participants to leave automatically)
        socket.on('class:end', async () => {
            try {
                await liveClassService.endClass(socket.classId, user);
                // Broadcast to everyone in room to immediately terminate media and exit
                liveNamespace.to(socket.classId).emit('class:ended', {
                    classId: socket.classId,
                    message: 'The teacher has ended this live class for all participants.'
                });
            } catch (err) {
                socket.emit('error', { code: 'END_CLASS_FAILED', message: err.message });
            }
        });

        // Graceful Disconnect Handling
        socket.on('disconnect', async () => {
            console.log(`[Socket] User disconnected: ${userId}`);
            if (socket.classId) {
                // Grace period: allow 15s reconnect before marking left
                setTimeout(async () => {
                    const presence = await RedisStore.getParticipantPresence(socket.classId, userId);
                    if (!presence || Date.now() - presence.lastSeenAt > 15000) {
                        await participantService.leaveClass(socket.classId, userId);
                        liveNamespace.to(socket.classId).emit('participant:left', { userId });
                    }
                }, 15000);
            }
        });
    });
}

module.exports = registerLiveClassSocketHandlers;
