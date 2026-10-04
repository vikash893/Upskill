class MediaServerAdapter {
    async createRoom(classId) {
        throw new Error('Method createRoom() must be implemented');
    }
    async createTransport(classId, participantId, type) {
        throw new Error('Method createTransport() must be implemented');
    }
    async connectTransport(classId, participantId, transportId, dtlsParameters) {
        throw new Error('Method connectTransport() must be implemented');
    }
    async createProducer(classId, participantId, transportId, kind, rtpParameters, appData) {
        throw new Error('Method createProducer() must be implemented');
    }
    async createConsumer(classId, participantId, transportId, producerId, rtpCapabilities) {
        throw new Error('Method createConsumer() must be implemented');
    }
    async pauseProducer(classId, participantId, producerId) {
        throw new Error('Method pauseProducer() must be implemented');
    }
    async resumeProducer(classId, participantId, producerId) {
        throw new Error('Method resumeProducer() must be implemented');
    }
    async closeProducer(classId, participantId, producerId) {
        throw new Error('Method closeProducer() must be implemented');
    }
    async closeConsumer(classId, participantId, consumerId) {
        throw new Error('Method closeConsumer() must be implemented');
    }
    async removeParticipant(classId, participantId) {
        throw new Error('Method removeParticipant() must be implemented');
    }
    async getProducers(classId) {
        throw new Error('Method getProducers() must be implemented');
    }
    async closeRoom(classId) {
        throw new Error('Method closeRoom() must be implemented');
    }
}

module.exports = MediaServerAdapter;
