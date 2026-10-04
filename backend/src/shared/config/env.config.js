require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 8000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'uniskill_2026_secret',
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    KAFKA_BROKERS: (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean),
    RECORDING_CHUNK_SECONDS: Number(process.env.RECORDING_CHUNK_SECONDS || 60),
    RECORDING_STORAGE_PATH: process.env.RECORDING_STORAGE_PATH || './uploads/recordings',
    MEDIA_SERVER_TYPE: process.env.MEDIA_SERVER_TYPE || 'mediasoup', // mediasoup | mock | janus | livekit
    SFU_LISTEN_IP: process.env.SFU_LISTEN_IP || '0.0.0.0',
    SFU_ANNOUNCED_IP: process.env.SFU_ANNOUNCED_IP || '127.0.0.1',
    SFU_MIN_PORT: Number(process.env.SFU_MIN_PORT || 10000),
    SFU_MAX_PORT: Number(process.env.SFU_MAX_PORT || 10100),
};
