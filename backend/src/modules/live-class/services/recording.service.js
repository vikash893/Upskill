const fs = require('fs');
const path = require('path');
const LiveClass = require('../models/liveClass.model');
const Recording = require('../models/recording.model');
const RecordingChunk = require('../models/recordingChunk.model');
const permissionService = require('./permission.service');
const { generateRecordingId } = require('../utils/classId');
const { NotFoundError, ConflictError, ForbiddenError } = require('../../../shared/errors/AppError');
const envConfig = require('../../../shared/config/env.config');
const KafkaPublisher = require('../../../shared/kafka/kafkaPublisher');

class RecordingService {
    async startRecording(classId, user) {
        const classData = await LiveClass.findOne({ classId });
        if (!classData) throw new NotFoundError('Live class not found');

        // Verify ONLY HOST can start recording
        permissionService.canStartRecording(user, classData);

        if (classData.recordingStatus === 'recording') {
            throw new ConflictError('Recording is already in progress');
        }

        const recordingId = generateRecordingId(classId);
        const recording = await Recording.create({
            recordingId,
            classId,
            hostId: user._id || user.id,
            status: 'recording',
            startedAt: new Date()
        });

        classData.recordingStatus = 'recording';
        await classData.save();

        await KafkaPublisher.publishEvent('recording.started', { classId, recordingId, hostId: user._id || user.id });

        return recording;
    }

    async uploadChunk(classId, recordingId, chunkNumber, fileBuffer, metadata = {}) {
        const recording = await Recording.findOne({ recordingId, classId });
        if (!recording) throw new NotFoundError('Active recording session not found');

        // Storage directory setup
        const storageDir = path.resolve(envConfig.RECORDING_STORAGE_PATH, classId, recordingId);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        const formattedChunkNumber = String(chunkNumber).padStart(6, '0');
        const filename = `chunk-${formattedChunkNumber}.webm`;
        const filePath = path.join(storageDir, filename);

        // Save physical chunk file
        fs.writeFileSync(filePath, fileBuffer);
        const fileSize = fileBuffer.length;

        // Idempotency DB insertion
        let chunkDoc;
        try {
            chunkDoc = await RecordingChunk.create({
                recordingId,
                chunkNumber: Number(chunkNumber),
                storageKey: filePath,
                startTime: metadata.startTime ? new Date(metadata.startTime) : new Date(),
                endTime: metadata.endTime ? new Date(metadata.endTime) : new Date(),
                duration: Number(metadata.duration || envConfig.RECORDING_CHUNK_SECONDS),
                size: fileSize,
                status: 'uploaded'
            });
        } catch (err) {
            // Duplicate key error (E11000) handling for idempotency
            if (err.code === 11000) {
                console.log(`[RecordingService] Chunk ${chunkNumber} for ${recordingId} already uploaded (idempotent duplicate call). Updating file content.`);
                chunkDoc = await RecordingChunk.findOne({ recordingId, chunkNumber });
                chunkDoc.size = fileSize;
                chunkDoc.storageKey = filePath;
                await chunkDoc.save();
            } else {
                throw err;
            }
        }

        // Increment chunk count on recording
        await Recording.updateOne({ recordingId }, { $inc: { totalChunks: 1, size: fileSize } });

        await KafkaPublisher.publishEvent('recording.chunk.uploaded', { classId, recordingId, chunkNumber, size: fileSize });

        return chunkDoc;
    }

    async stopRecording(classId, user) {
        const classData = await LiveClass.findOne({ classId });
        if (!classData) throw new NotFoundError('Live class not found');

        permissionService.canStopRecording(user, classData);

        const recording = await Recording.findOne({ classId, status: 'recording' });
        if (!recording) throw new NotFoundError('No active recording session to stop');

        recording.status = 'stopped';
        recording.endedAt = new Date();
        recording.duration = Math.round((recording.endedAt - recording.startedAt) / 1000);
        await recording.save();

        classData.recordingStatus = 'stopped';
        await classData.save();

        // Queue processing job
        await this.queueFinalizationJob(recording.recordingId);

        return recording;
    }

    async queueFinalizationJob(recordingId) {
        const recording = await Recording.findOne({ recordingId });
        if (!recording) return;

        recording.status = 'processing';
        await recording.save();

        const liveClass = await LiveClass.findOne({ classId: recording.classId });
        if (liveClass) {
            liveClass.recordingStatus = 'processing';
            await liveClass.save();
        }

        // Trigger recording worker asynchronously without blocking API response
        const recordingWorker = require('./recording.worker');
        setImmediate(() => {
            recordingWorker.processRecordingJob(recordingId).catch(err => {
                console.error(`[RecordingWorker] Async job failed for ${recordingId}:`, err.message);
            });
        });
    }

    async retryRecording(classId, recordingId, user) {
        const classData = await LiveClass.findOne({ classId });
        if (!classData) throw new NotFoundError('Live class not found');

        permissionService.canStopRecording(user, classData);

        const recording = await Recording.findOne({ recordingId, classId });
        if (!recording) throw new NotFoundError('Recording not found');

        if (recording.status !== 'failed') {
            throw new ConflictError(`Recording status is '${recording.status}', retry is only allowed for failed status.`);
        }

        await this.queueFinalizationJob(recordingId);
        return recording;
    }

    async getRecordingsByClassId(classId) {
        return await Recording.find({ classId }).sort({ createdAt: -1 }).lean();
    }

    async getRecordingById(recordingId) {
        return await Recording.findOne({ recordingId }).lean();
    }
}

module.exports = new RecordingService();
