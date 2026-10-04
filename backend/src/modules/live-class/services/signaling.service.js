const mediaServerService = require('./mediaServer.service');
const participantService = require('./participant.service');
const liveClassService = require('./liveClass.service');
const permissionService = require('./permission.service');
const { UnauthorizedError, ForbiddenError, NotFoundError } = require('../../../shared/errors/AppError');

class SignalingService {
    async handleCreateTransport(classId, user, { type }) {
        const userId = (user._id || user.id).toString();
        const transportParams = await mediaServerService.createTransport(classId, userId, type);
        return transportParams;
    }

    async handleConnectTransport(classId, user, { transportId, dtlsParameters }) {
        const userId = (user._id || user.id).toString();
        return await mediaServerService.connectTransport(classId, userId, transportId, dtlsParameters);
    }

    async handleProduce(classId, user, { transportId, kind, rtpParameters, appData }) {
        const userId = (user._id || user.id).toString();
        const producer = await mediaServerService.createProducer(classId, userId, transportId, kind, rtpParameters, appData);

        // Update participant media state flags
        const updateFlags = {};
        if (kind === 'audio') updateFlags.audioEnabled = true;
        if (kind === 'video') updateFlags.videoEnabled = true;
        if (kind === 'screen') updateFlags.screenSharing = true;

        await participantService.updateParticipantMediaState(classId, userId, updateFlags);

        return producer;
    }

    async handleConsume(classId, user, { transportId, producerId, rtpCapabilities }) {
        const userId = (user._id || user.id).toString();
        return await mediaServerService.createConsumer(classId, userId, transportId, producerId, rtpCapabilities);
    }

    async handleHostMuteParticipant(classId, hostUser, targetParticipantId) {
        const liveClass = await liveClassService.getClass(classId);
        permissionService.canControlParticipant(hostUser, liveClass, targetParticipantId);

        await participantService.updateParticipantMediaState(classId, targetParticipantId, {
            mutedByHost: true,
            audioEnabled: false
        });

        return { classId, targetParticipantId, action: 'muted' };
    }

    async handleHostDisableCamera(classId, hostUser, targetParticipantId) {
        const liveClass = await liveClassService.getClass(classId);
        permissionService.canControlParticipant(hostUser, liveClass, targetParticipantId);

        await participantService.updateParticipantMediaState(classId, targetParticipantId, {
            cameraDisabledByHost: true,
            videoEnabled: false
        });

        return { classId, targetParticipantId, action: 'camera_disabled' };
    }

    async handleHostRemoveParticipant(classId, hostUser, targetParticipantId) {
        const liveClass = await liveClassService.getClass(classId);
        permissionService.canControlParticipant(hostUser, liveClass, targetParticipantId);

        await mediaServerService.removeParticipant(classId, targetParticipantId);
        await participantService.removeParticipant(classId, targetParticipantId);

        return { classId, targetParticipantId, action: 'removed' };
    }

    async handleHostMuteAll(classId, hostUser) {
        const liveClass = await liveClassService.getClass(classId);
        permissionService.canControlParticipant(hostUser, liveClass, 'all');

        const participants = await participantService.getClassParticipants(classId);
        const hostId = liveClass.hostId.toString();

        for (const p of participants) {
            if (p.userId.toString() !== hostId && p.role !== 'host') {
                await participantService.updateParticipantMediaState(classId, p.userId.toString(), {
                    mutedByHost: true,
                    audioEnabled: false
                });
            }
        }

        return { classId, action: 'mute_all' };
    }

    async handleHostDisableAllCameras(classId, hostUser) {
        const liveClass = await liveClassService.getClass(classId);
        permissionService.canControlParticipant(hostUser, liveClass, 'all');

        const participants = await participantService.getClassParticipants(classId);
        const hostId = liveClass.hostId.toString();

        for (const p of participants) {
            if (p.userId.toString() !== hostId && p.role !== 'host') {
                await participantService.updateParticipantMediaState(classId, p.userId.toString(), {
                    cameraDisabledByHost: true,
                    videoEnabled: false
                });
            }
        }

        return { classId, action: 'disable_all_cameras' };
    }
}

module.exports = new SignalingService();
