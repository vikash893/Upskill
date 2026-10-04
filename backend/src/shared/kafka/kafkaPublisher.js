const { getKafkaProducer, isKafkaConnected } = require('../../../config/kafka');
const logger = require('../../../middleware/logger');

class KafkaPublisher {
    static async publishEvent(topic, payload) {
        if (!isKafkaConnected()) {
            // Log silently or handle graceful fallback when Kafka is optional
            return false;
        }
        try {
            const producer = getKafkaProducer();
            if (producer) {
                await producer.send({
                    topic,
                    messages: [
                        {
                            key: payload.classId || payload.recordingId || String(Date.now()),
                            value: JSON.stringify({
                                ...payload,
                                timestamp: new Date().toISOString()
                            })
                        }
                    ]
                });
                return true;
            }
        } catch (err) {
            console.error(`[KafkaPublisher] Error publishing event to topic ${topic}:`, err.message);
        }
        return false;
    }
}

module.exports = KafkaPublisher;
