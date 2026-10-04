const envConfig = require('../../../shared/config/env.config');
const MediasoupAdapter = require('../media/mediasoupAdapter');

class MediaServerService {
    constructor() {
        this.adapter = new MediasoupAdapter();
    }

    getAdapter() {
        return this.adapter;
    }

    async createRoom(classId) {
        return await this.adapter.createRoom(classId);
    }

    async createTransport(classId, participantId, type) {
        return await this.adapter.createTransport(classId, participantId, type);
    }

    async connectTransport(classId, participantId, transportId, dtlsParameters) {
        return await this.adapter.connectTransport(classId, participantId, transportId, dtlsParameters);
    }

    async createProducer(classId, participantId, transportId, kind, rtpParameters, appData) {
        return await this.adapter.createProducer(classId, participantId, transportId, kind, rtpParameters, appData);
    }

    async createConsumer(classId, participantId, transportId, producerId, rtpCapabilities) {
        return await this.adapter.createConsumer(classId, participantId, transportId, producerId, rtpCapabilities);
    }

    async pauseProducer(classId, participantId, producerId) {
        return await this.adapter.pauseProducer(classId, participantId, producerId);
    }

    async resumeProducer(classId, participantId, producerId) {
        return await this.adapter.resumeProducer(classId, participantId, producerId);
    }

    async closeProducer(classId, participantId, producerId) {
        return await this.adapter.closeProducer(classId, participantId, producerId);
    }

    async closeConsumer(classId, participantId, consumerId) {
        return await this.adapter.closeConsumer(classId, participantId, consumerId);
    }

    async removeParticipant(classId, participantId) {
        return await this.adapter.removeParticipant(classId, participantId);
    }

    async getProducers(classId) {
        return await this.adapter.getProducers(classId);
    }

    async closeRoom(classId) {
        return await this.adapter.closeRoom(classId);
    }
}

module.exports = new MediaServerService();
