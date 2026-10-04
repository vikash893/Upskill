const MediaServerAdapter = require('./MediaServerAdapter');

class MediasoupAdapter extends MediaServerAdapter {
    constructor() {
        super();
        this.rooms = new Map(); // In-memory active room tracks per SFU instance
    }

    async createRoom(classId) {
        if (!this.rooms.has(classId)) {
            this.rooms.set(classId, {
                classId,
                routerId: `router_${classId}_${Date.now()}`,
                participants: new Map(), // participantId -> { sendTransports, recvTransports, producers, consumers }
                producers: new Map(), // producerId -> { participantId, kind, paused, appData }
                createdAt: new Date()
            });
        }
        return {
            roomId: classId,
            routerId: this.rooms.get(classId).routerId,
            rtpCapabilities: {
                codecs: [
                    { mimeType: 'audio/opus', kind: 'audio', clockRate: 48000, channels: 2 },
                    { mimeType: 'video/VP8', kind: 'video', clockRate: 90000 },
                    { mimeType: 'video/H264', kind: 'video', clockRate: 90000, parameters: { 'packetization-mode': 1 } }
                ]
            }
        };
    }

    async createTransport(classId, participantId, type = 'send') {
        const room = await this.createRoom(classId);
        if (!room) throw new Error(`Room ${classId} not initialized`);
        
        let participant = this.rooms.get(classId).participants.get(participantId);
        if (!participant) {
            participant = { sendTransports: new Map(), recvTransports: new Map(), producers: new Map(), consumers: new Map() };
            this.rooms.get(classId).participants.set(participantId, participant);
        }

        const transportId = `tr_${participantId}_${type}_${Date.now()}`;
        const transportParams = {
            id: transportId,
            iceParameters: { usernameFragment: `ice_${Date.now()}`, password: `pwd_${Date.now()}` },
            iceCandidates: [{ foundation: 'udpcandidate', ip: '127.0.0.1', port: 10000 + Math.floor(Math.random() * 1000), protocol: 'udp', type: 'host' }],
            dtlsParameters: { role: 'auto', fingerprints: [{ algorithm: 'sha-256', value: '00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF' }] }
        };

        if (type === 'send') {
            participant.sendTransports.set(transportId, transportParams);
        } else {
            participant.recvTransports.set(transportId, transportParams);
        }

        return transportParams;
    }

    async connectTransport(classId, participantId, transportId, dtlsParameters) {
        const room = this.rooms.get(classId);
        if (!room) return false;
        return { connected: true, transportId };
    }

    async createProducer(classId, participantId, transportId, kind, rtpParameters, appData = {}) {
        const room = this.rooms.get(classId);
        if (!room) throw new Error(`Room ${classId} not found`);

        const producerId = `prod_${participantId}_${kind}_${Date.now()}`;
        const producerInfo = {
            id: producerId,
            participantId,
            kind, // 'audio' | 'video' | 'screen'
            paused: false,
            appData,
            createdAt: new Date()
        };

        room.producers.set(producerId, producerInfo);

        const participant = room.participants.get(participantId);
        if (participant) {
            participant.producers.set(producerId, producerInfo);
        }

        return producerInfo;
    }

    async createConsumer(classId, participantId, transportId, producerId, rtpCapabilities) {
        const room = this.rooms.get(classId);
        if (!room) throw new Error(`Room ${classId} not found`);

        const producer = room.producers.get(producerId);
        if (!producer) throw new Error(`Producer ${producerId} not found`);

        const consumerId = `cons_${participantId}_${producerId}_${Date.now()}`;
        const consumerInfo = {
            id: consumerId,
            producerId,
            participantId,
            kind: producer.kind,
            paused: producer.paused
        };

        const participant = room.participants.get(participantId);
        if (participant) {
            participant.consumers.set(consumerId, consumerInfo);
        }

        return consumerInfo;
    }

    async pauseProducer(classId, participantId, producerId) {
        const room = this.rooms.get(classId);
        if (!room) return false;

        const producer = room.producers.get(producerId);
        if (producer) {
            producer.paused = true;
            return true;
        }
        return false;
    }

    async resumeProducer(classId, participantId, producerId) {
        const room = this.rooms.get(classId);
        if (!room) return false;

        const producer = room.producers.get(producerId);
        if (producer) {
            producer.paused = false;
            return true;
        }
        return false;
    }

    async closeProducer(classId, participantId, producerId) {
        const room = this.rooms.get(classId);
        if (!room) return false;

        room.producers.delete(producerId);
        const participant = room.participants.get(participantId);
        if (participant) {
            participant.producers.delete(producerId);
        }
        return true;
    }

    async closeConsumer(classId, participantId, consumerId) {
        const room = this.rooms.get(classId);
        if (!room) return false;

        const participant = room.participants.get(participantId);
        if (participant) {
            participant.consumers.delete(consumerId);
        }
        return true;
    }

    async removeParticipant(classId, participantId) {
        const room = this.rooms.get(classId);
        if (!room) return false;

        const participant = room.participants.get(participantId);
        if (participant) {
            // Close all producers for this participant
            for (const producerId of participant.producers.keys()) {
                room.producers.delete(producerId);
            }
            room.participants.delete(participantId);
        }
        return true;
    }

    async getProducers(classId) {
        const room = this.rooms.get(classId);
        if (!room) return [];
        return Array.from(room.producers.values()).map(p => ({
            producerId: p.id,
            participantId: p.participantId,
            kind: p.kind,
            paused: p.paused,
            appData: p.appData
        }));
    }

    async closeRoom(classId) {
        if (this.rooms.has(classId)) {
            this.rooms.delete(classId);
            return true;
        }
        return false;
    }
}

module.exports = MediasoupAdapter;
