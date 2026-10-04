const Participant = require('../models/participant.model');
const RedisStore = require('../../../shared/redis/redisStore');
const { NotFoundError } = require('../../../shared/errors/AppError');

class ParticipantService {
    async joinClass(classId, user, role) {
        const userId = user._id || user.id;
        const email = user.email || 'user@uniskill.in';

        let participant = await Participant.findOne({ classId, userId });

        if (participant) {
            participant.status = 'joined';
            participant.role = role;
            participant.leftAt = null;
            participant.lastSeenAt = new Date();
            await participant.save();
        } else {
            participant = await Participant.create({
                classId,
                userId,
                email,
                role,
                status: 'joined',
                audioEnabled: false,
                videoEnabled: false,
                screenSharing: false,
                mutedByHost: false,
                cameraDisabledByHost: false,
                joinedAt: new Date(),
                lastSeenAt: new Date()
            });
        }

        // Cache presence in Redis for fast read access
        await RedisStore.setParticipantPresence(classId, userId.toString(), {
            userId: userId.toString(),
            email,
            role,
            status: 'joined',
            audioEnabled: participant.audioEnabled,
            videoEnabled: participant.videoEnabled,
            screenSharing: participant.screenSharing,
            mutedByHost: participant.mutedByHost,
            cameraDisabledByHost: participant.cameraDisabledByHost,
            lastSeenAt: Date.now()
        });

        return participant;
    }

    async updateParticipantMediaState(classId, userId, updates) {
        const participant = await Participant.findOne({ classId, userId });
        if (!participant) throw new NotFoundError('Participant not found');

        if (typeof updates.audioEnabled === 'boolean') participant.audioEnabled = updates.audioEnabled;
        if (typeof updates.videoEnabled === 'boolean') participant.videoEnabled = updates.videoEnabled;
        if (typeof updates.screenSharing === 'boolean') participant.screenSharing = updates.screenSharing;
        if (typeof updates.mutedByHost === 'boolean') participant.mutedByHost = updates.mutedByHost;
        if (typeof updates.cameraDisabledByHost === 'boolean') participant.cameraDisabledByHost = updates.cameraDisabledByHost;
        participant.lastSeenAt = new Date();

        await participant.save();

        const cached = await RedisStore.getParticipantPresence(classId, userId.toString()) || {};
        await RedisStore.setParticipantPresence(classId, userId.toString(), {
            ...cached,
            ...updates,
            lastSeenAt: Date.now()
        });

        return participant;
    }

    async leaveClass(classId, userId) {
        const participant = await Participant.findOne({ classId, userId });
        if (participant) {
            participant.status = 'left';
            participant.leftAt = new Date();
            await participant.save();
        }
        await RedisStore.removeParticipantPresence(classId, userId.toString());
        return participant;
    }

    async removeParticipant(classId, targetUserId) {
        const participant = await Participant.findOne({ classId, userId: targetUserId });
        if (participant) {
            participant.status = 'removed';
            participant.leftAt = new Date();
            await participant.save();
        }
        await RedisStore.removeParticipantPresence(classId, targetUserId.toString());
        return participant;
    }

    async getClassParticipants(classId) {
        return await Participant.find({ classId, status: { $ne: 'removed' } }).lean();
    }
}

module.exports = new ParticipantService();
