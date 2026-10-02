const { Kafka, logLevel } = require("kafkajs");

let kafkaProducer = null;
let kafkaConsumer = null;
let isKafkaReady = false;

const attendanceTopic = process.env.KAFKA_LIVE_CLASS_TOPIC || "uniskill.live-class.attendance";
const paymentTopic = process.env.KAFKA_PAYMENT_TOPIC || "uniskill.payments";
const auditLogTopic = process.env.KAFKA_AUDIT_LOG_TOPIC || "uniskill.audit.logs";

async function connectKafka() {
    const brokers = (process.env.KAFKA_BROKERS || "")
        .split(",")
        .map(broker => broker.trim())
        .filter(Boolean);

    if (brokers.length === 0) {
        console.log("ℹ️  KAFKA_BROKERS not configured. Using direct asynchronous in-process event pipelines.");
        return null;
    }

    try {
        const sasl = process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
            ? {
                mechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
                username: process.env.KAFKA_USERNAME,
                password: process.env.KAFKA_PASSWORD
            }
            : undefined;

        const kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || "uniskill-backend",
            brokers,
            ssl: process.env.KAFKA_SSL !== "false",
            sasl,
            connectionTimeout: 5000,
            requestTimeout: 10000,
            retry: {
                initialRetryTime: 300,
                retries: 5
            },
            logLevel: logLevel.NOTHING
        });

        kafkaProducer = kafka.producer({
            idempotent: true,
            maxInFlightRequests: 1
        });

        kafkaConsumer = kafka.consumer({
            groupId: process.env.KAFKA_GROUP_ID || "uniskill-event-processors"
        });

        await kafkaProducer.connect();
        await kafkaConsumer.connect();

        // The in-process consumer currently persists live attendance events.
        await kafkaConsumer.subscribe({ topic: attendanceTopic, fromBeginning: false });

        isKafkaReady = true;
        console.log("Kafka producer and consumer connected successfully.");
        return { producer: kafkaProducer, consumer: kafkaConsumer };
    } catch (error) {
        console.warn("⚠️ Kafka connection failed:", error.message);
        console.log("ℹ️  System will continue with direct asynchronous event processing.");
        kafkaProducer = null;
        kafkaConsumer = null;
        isKafkaReady = false;
        return null;
    }
}

function getKafkaProducer() {
    return isKafkaReady ? kafkaProducer : null;
}

function getKafkaConsumer() {
    return isKafkaReady ? kafkaConsumer : null;
}

function isKafkaConnected() {
    return isKafkaReady;
}

function getAttendanceTopic() {
    return attendanceTopic;
}

function getPaymentTopic() {
    return paymentTopic;
}

function getAuditLogTopic() {
    return auditLogTopic;
}

async function publishKafkaEvent(topic, key, payload) {
    const producer = getKafkaProducer();
    if (!producer) return false;
    try {
        await producer.send({
            topic,
            messages: [{
                key: String(key || Date.now()),
                value: typeof payload === "string" ? payload : JSON.stringify(payload),
                timestamp: String(Date.now())
            }]
        });
        return true;
    } catch (error) {
        console.error(`Error publishing Kafka event to ${topic}:`, error.message);
        return false;
    }
}

async function closeKafka() {
    try {
        if (kafkaProducer) await kafkaProducer.disconnect();
        if (kafkaConsumer) await kafkaConsumer.disconnect();
    } catch {}
    kafkaProducer = null;
    kafkaConsumer = null;
    isKafkaReady = false;
}

module.exports = {
    connectKafka,
    getKafkaProducer,
    getKafkaConsumer,
    isKafkaConnected,
    getAttendanceTopic,
    getPaymentTopic,
    getAuditLogTopic,
    publishKafkaEvent,
    closeKafka
};