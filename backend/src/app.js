const express = require('express');
const cors = require('cors');
const compression = require('compression');
const mongoose = require('mongoose');
const liveClassRoutes = require('./modules/live-class/routes/liveClass.routes');
const errorHandler = require('./shared/middleware/errorHandler.middleware');
const { isRedisConnected } = require('../config/redis');
const { isKafkaConnected } = require('../config/kafka');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'Scalable Live Classroom Meeting System', pid: process.pid }));
app.get('/health/live', (req, res) => res.status(200).json({ status: 'ok', pid: process.pid }));
app.get('/health/ready', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = isRedisConnected();
    const ready = mongoReady;

    return res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        pid: process.pid,
        dependencies: {
            mongo: mongoReady ? 'ready' : 'unavailable',
            redis: redisReady ? 'ready' : 'fallback',
            kafka: isKafkaConnected() ? 'ready' : 'optional'
        }
    });
});

// Mount Scalable Live Class Subsystem
app.use('/api/scalable-live-class', liveClassRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
