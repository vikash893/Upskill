const express = require('express');
const multer = require('multer');
const liveClassController = require('../controllers/liveClass.controller');
const recordingController = require('../controllers/recording.controller');
const authMiddleware = require('../../../shared/middleware/auth.middleware');
const rateLimiter = require('../../../shared/middleware/rateLimiter.middleware');

const router = express.Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB per chunk limit

// Apply global rate limiting and auth middleware to class routes
router.use(rateLimiter({ windowMs: 60000, max: 200 }));
router.use(authMiddleware);

// Class Lifecycle APIs
router.post('/create', liveClassController.createClass);
router.get('/:classId', liveClassController.getClass);
router.post('/:classId/join', liveClassController.joinClass);
router.post('/:classId/leave', liveClassController.leaveClass);
router.get('/:classId/participants', liveClassController.getParticipants);
router.post('/:classId/end', liveClassController.endClass);

// Recording & Chunk APIs
router.post('/:classId/recording/start', recordingController.startRecording);
router.post('/:classId/recording/stop', recordingController.stopRecording);
router.post('/:classId/recording/:recordingId/chunk', upload.single('chunk'), recordingController.uploadChunk);
router.get('/:classId/recordings', recordingController.getRecordings);
router.get('/:classId/recording/:recordingId', recordingController.getRecordingById);
router.post('/:classId/recording/:recordingId/retry', recordingController.retryRecording);

module.exports = router;
