require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const cluster = require('node:cluster');
const os = require('node:os');
const mongoose = require('mongoose');
const connectDb = require('./config/db');
const { getGoogleOAuthConfig } = require('./config/google');
const compression = require('compression');
const cors = require('cors');
const logger = require('./middleware/logger');
const authRouter = require('./router/auth');
const getUserRouter = require('./router/userinfo');
const adminAuth = require('./router/adminAuth');
const adminUserRouter = require('./router/user');
const courseRouter = require('./router/course');
const getCourseROuter = require('./router/getCourse');
const teacherRouter = require('./router/teacher');
const enrollmentRouter = require('./router/enrollment');
const paymentRouter = require('./router/payment');
const assignmentRouter = require('./router/assignment');
const lectureRouter = require('./router/lecture');
const liveClassRouter = require('./router/liveClass');
const liveStreamRouter = require('./router/liveStream');
const { connectRedis, isRedisConnected, closeRedis } = require('./config/redis');
const { connectKafka, isKafkaConnected, closeKafka } = require('./config/kafka');
const logsRouter = require('./router/logs');
const termsRouter = require('./router/terms');
const contactRouter = require('./router/contact');
const certificateRouter = require('./router/certificate');
const adminDashboardRouter = require('./router/adminDashboard');
const formsRouter = require('./router/forms');
const announcementRouter = require('./router/announcement');
const activityRouter = require('./router/activity');
const jobRouter = require('./router/job');
const mentorRouter = require('./router/mentor');

const app = express();
const port = Number(process.env.PORT) || 8000;
const workerCount = Math.max(1, Number.parseInt(process.env.WEB_CONCURRENCY, 10) || 1);

function validateProductionConfig() {
    if (process.env.NODE_ENV !== 'production') return;

    const missing = [];
    if (!process.env.MONGO_URL) missing.push('MONGO_URL');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /replace_with|your_|placeholder|changeme/i.test(process.env.JWT_SECRET)) {
        missing.push('JWT_SECRET (non-placeholder, minimum 32 characters)');
    }

    let frontendUrl;
    try {
        frontendUrl = new URL(process.env.FRONTEND_URL || '');
    } catch {}
    if (!frontendUrl || frontendUrl.protocol !== 'https:') missing.push('FRONTEND_URL (HTTPS origin)');

    if (process.env.GOOGLE_MEET_ENABLED === 'true' && !getGoogleOAuthConfig()) {
        missing.push('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and HTTPS GOOGLE_REDIRECT_URI ending in /api/auth/google/meet/callback');
    }

    if (missing.length) {
        console.error(`Production configuration invalid: ${missing.join('; ')}`);
        process.exit(1);
    }
}

validateProductionConfig();

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

// Load balancer & Worker telemetry headers + COOP for Google Sign-In popups
app.use((req, res, next) => {
    res.setHeader('X-Worker-PID', String(process.pid));
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
});

app.use(compression());
app.use(express.json({
    limit: '5mb',
    verify(req, res, buffer) {
        if (req.originalUrl.includes('/payment/webhook')) req.rawBody = Buffer.from(buffer);
    }
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d', etag: true }));

// Health check endpoints for load balancers (AWS ALB, NGINX, PM2)
app.get('/api/health/live', (req, res) => res.status(200).json({ status: 'ok', pid: process.pid }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', message: 'UniSkill Backend is active', pid: process.pid }));
app.get('/api/health/ready', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisConfigured = Boolean(process.env.REDIS_URL);
    const redisReady = isRedisConnected();
    const redisRequired = process.env.REDIS_REQUIRED === 'true' || workerCount > 1;
    const kafkaConfigured = Boolean(process.env.KAFKA_BROKERS);
    const kafkaReady = isKafkaConnected();
    const ready = mongoReady && (!redisRequired || redisReady);

    return res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        pid: process.pid,
        dependencies: {
            mongo: mongoReady ? 'ready' : 'unavailable',
            redis: redisReady ? 'ready' : redisConfigured ? 'unavailable_fallback' : 'in_memory_fallback',
            redis_required: redisRequired,
            kafka: kafkaReady ? 'ready' : kafkaConfigured ? 'unavailable_optional' : 'disabled'
        }
    });
});

app.use(logger);

// Registered API Routers
app.use('/api/auth', authRouter);
app.use('/api/get', getUserRouter);
app.use('/api', adminAuth);
app.use('/api', adminUserRouter);
app.use('/api', courseRouter);
app.use('/api', getCourseROuter);
app.use('/api', teacherRouter);
app.use('/api', enrollmentRouter);
app.use('/api', paymentRouter);
app.use('/api', assignmentRouter);
app.use('/api', lectureRouter);
app.use('/api', liveClassRouter);
app.use('/api', liveStreamRouter);
app.use('/api', logsRouter);
app.use('/api', termsRouter);
app.use('/api', contactRouter);
app.use('/api', certificateRouter);
const http = require('node:http');
const { Server } = require('socket.io');
const scalableLiveClassRouter = require('./src/modules/live-class/routes/liveClass.routes');
const registerLiveClassSocketHandlers = require('./src/modules/live-class/sockets/liveClass.socket');

app.use('/api', adminDashboardRouter);
app.use('/api', formsRouter);
app.use('/api', announcementRouter);
app.use('/api', activityRouter);
app.use('/api', jobRouter);
app.use('/api', mentorRouter);
app.use('/api/scalable-live-class', scalableLiveClassRouter);
app.use(announcementRouter);
app.use(activityRouter);
app.use(jobRouter);
app.use(mentorRouter);

async function startWorker() {
    await connectDb();
    await connectRedis();
    await connectKafka();
    
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });
    registerLiveClassSocketHandlers(io);

    server.listen(port, () => {
        console.log(`UniSkill API worker ${process.pid} listening on port ${port} with Scalable Live Classroom system.`);
    });
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.requestTimeout = 120000;


    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`${signal} received by worker ${process.pid}; draining requests.`);
        await new Promise(resolve => server.close(resolve));
        await Promise.allSettled([closeKafka(), closeRedis(), mongoose.disconnect()]);
        process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
}

function startCluster() {
    if (!process.env.REDIS_URL) {
        console.error('WEB_CONCURRENCY > 1 requires REDIS_URL so cache, presence, and rate limits are shared across workers.');
        process.exitCode = 1;
        return;
    }

    let shuttingDown = false;
    let restartAttempts = 0;
    const workerStartedAt = new Map();
    const spawnWorker = () => cluster.fork();
    for (let index = 0; index < workerCount; index += 1) spawnWorker();

    cluster.on('online', worker => workerStartedAt.set(worker.id, Date.now()));
    cluster.on('exit', (worker, code, signal) => {
        const uptime = Date.now() - (workerStartedAt.get(worker.id) || Date.now());
        workerStartedAt.delete(worker.id);
        if (shuttingDown) return;
        restartAttempts = uptime > 60000 ? 0 : restartAttempts + 1;
        const delay = Math.min(30000, 500 * (2 ** Math.min(restartAttempts, 6)));
        console.error(`Worker ${worker.process.pid} exited (${signal || code}); replacement in ${delay}ms.`);
        const restartTimer = setTimeout(() => {
            if (!shuttingDown) spawnWorker();
        }, delay);
        restartTimer.unref();
    });

    const shutdownPrimary = (signal) => {
        shuttingDown = true;
        console.log(`${signal} received by primary ${process.pid}; stopping workers.`);
        for (const worker of Object.values(cluster.workers || {})) {
            if (worker?.isConnected()) worker.disconnect();
        }
        const timeout = setTimeout(() => {
            for (const worker of Object.values(cluster.workers || {})) worker?.kill();
            process.exit(0);
        }, 10000);
        timeout.unref();
    };

    process.once('SIGINT', () => shutdownPrimary('SIGINT'));
    process.once('SIGTERM', () => shutdownPrimary('SIGTERM'));
}

if (cluster.isPrimary && workerCount > 1) {
    startCluster();
} else {
    startWorker().catch(error => {
        console.error('Backend startup failed:', error.message);
        process.exit(1);
    });
}
