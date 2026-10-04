const LiveClass = require('../models/liveClass.model');
const Participant = require('../models/participant.model');
const mediaServerService = require('./mediaServer.service');
const participantService = require('./participant.service');
const permissionService = require('./permission.service');
const { generateClassId } = require('../utils/classId');
const { NotFoundError, ConflictError } = require('../../../shared/errors/AppError');
const KafkaPublisher = require('../../../shared/kafka/kafkaPublisher');

class LiveClassService {
    async createClass(hostUser, { title, maxParticipants = 500, mediaRegion = 'us-east-1' }) {
        const classId = generateClassId();
        const hostId = hostUser._id || hostUser.id;
        const hostEmail = hostUser.email || 'teacher@uniskill.in';

        // Initialize SFU Room for media routing
        const sfuRoom = await mediaServerService.createRoom(classId);

        const liveClass = await LiveClass.create({
            classId,
            title,
            hostId,
            hostEmail,
            status: 'scheduled',
            maxParticipants,
            mediaRegion,
            sfuRoomId: sfuRoom.roomId,
            recordingEnabled: true,
            recordingStatus: 'not_started'
        });

        // Register host participant
        await participantService.joinClass(classId, hostUser, 'host');

        await KafkaPublisher.publishEvent('class.created', { classId, title, hostId });

        return liveClass;
    }

    async getClass(classId) {
        const liveClass = await LiveClass.findOne({ classId }).lean();
        if (!liveClass) throw new NotFoundError('Live class not found');
        return liveClass;
    }

    async joinClass(classId, user) {
        let liveClass = await LiveClass.findOne({ classId });
        
        if (!liveClass) {
            // Auto-provision class session on the fly for any valid class identifier
            const sfuRoom = await mediaServerService.createRoom(classId);
            liveClass = await LiveClass.create({
                classId,
                title: `Live Classroom (${classId})`,
                hostId: user._id || user.id,
                hostEmail: user.email || 'teacher@uniskill.in',
                status: 'live',
                startedAt: new Date(),
                maxParticipants: 500,
                mediaRegion: 'us-east-1',
                sfuRoomId: sfuRoom.roomId,
                recordingEnabled: true,
                recordingStatus: 'not_started'
            });
        }

        if (liveClass.status === 'ended') {
            liveClass.status = 'live';
            liveClass.endedAt = null;
            await liveClass.save();
        } else if (liveClass.status === 'scheduled') {
            liveClass.status = 'live';
            liveClass.startedAt = new Date();
            await liveClass.save();
            await KafkaPublisher.publishEvent('class.started', { classId, startedAt: liveClass.startedAt });
        }

        const role = permissionService.isHost(user, liveClass) ? 'host' : 'student';
        const participant = await participantService.joinClass(classId, user, role);

        return {
            class: liveClass,
            participant,
            sfuRoomId: liveClass.sfuRoomId
        };
    }

    async endClass(classId, hostUser) {
        const liveClass = await LiveClass.findOne({ classId });
        if (!liveClass) throw new NotFoundError('Live class not found');

        permissionService.canEndClass(hostUser, liveClass);

        liveClass.status = 'ended';
        liveClass.endedAt = new Date();
        await liveClass.save();

        // Close SFU Room media transports & producers
        await mediaServerService.closeRoom(classId);

        await KafkaPublisher.publishEvent('class.ended', { classId, endedAt: liveClass.endedAt });

        return liveClass;
    }
}

module.exports = new LiveClassService();
