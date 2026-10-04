const fs = require('fs');
const path = require('path');
const Recording = require('../models/recording.model');
const RecordingChunk = require('../models/recordingChunk.model');
const LiveClass = require('../models/liveClass.model');
const envConfig = require('../../../shared/config/env.config');
const KafkaPublisher = require('../../../shared/kafka/kafkaPublisher');

class RecordingWorker {
    async processRecordingJob(recordingId) {
        console.log(`[RecordingWorker] Starting processing job for recording: ${recordingId}`);
        const recording = await Recording.findOne({ recordingId });
        if (!recording) throw new Error(`Recording ${recordingId} not found`);

        try {
            // Find all uploaded chunks ordered strictly by chunkNumber
            const chunks = await RecordingChunk.find({ recordingId, status: 'uploaded' }).sort({ chunkNumber: 1 });

            if (!chunks || chunks.length === 0) {
                console.warn(`[RecordingWorker] No chunks found for recording ${recordingId}`);
                recording.status = 'completed';
                recording.finalRecordingUrl = '/uploads/recordings/sample_placeholder.webm';
                await recording.save();
                return recording;
            }

            const storageDir = path.resolve(envConfig.RECORDING_STORAGE_PATH, recording.classId, recordingId);
            const finalFilePath = path.join(storageDir, `final_${recordingId}.webm`);

            // Concatenate binary chunk files safely in deterministic chunk order
            const writeStream = fs.createWriteStream(finalFilePath);

            for (const chunk of chunks) {
                if (fs.existsSync(chunk.storageKey)) {
                    const chunkData = fs.readFileSync(chunk.storageKey);
                    writeStream.write(chunkData);
                } else {
                    console.warn(`[RecordingWorker] Chunk file missing on disk: ${chunk.storageKey}`);
                }
            }

            await new Promise((resolve, reject) => {
                writeStream.end((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            const stats = fs.statSync(finalFilePath);
            const finalRecordingUrl = `/uploads/recordings/${recording.classId}/${recordingId}/final_${recordingId}.webm`;

            // Update database states
            recording.status = 'completed';
            recording.finalRecordingUrl = finalRecordingUrl;
            recording.size = stats.size;
            await recording.save();

            const liveClass = await LiveClass.findOne({ classId: recording.classId });
            if (liveClass) {
                liveClass.recordingStatus = 'completed';
                liveClass.finalRecordingUrl = finalRecordingUrl;
                await liveClass.save();
            }

            await KafkaPublisher.publishEvent('recording.completed', {
                recordingId,
                classId: recording.classId,
                finalRecordingUrl,
                size: stats.size
            });

            console.log(`[RecordingWorker] Successfully finalized recording ${recordingId} at ${finalRecordingUrl}`);
            return recording;
        } catch (error) {
            console.error(`[RecordingWorker] Processing failed for recording ${recordingId}:`, error.message);
            recording.status = 'failed';
            await recording.save();

            const liveClass = await LiveClass.findOne({ classId: recording.classId });
            if (liveClass) {
                liveClass.recordingStatus = 'failed';
                await liveClass.save();
            }

            await KafkaPublisher.publishEvent('recording.failed', {
                recordingId,
                classId: recording.classId,
                error: error.message
            });

            throw error;
        }
    }
}

module.exports = new RecordingWorker();
