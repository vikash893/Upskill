const recordingService = require('../services/recording.service');

class RecordingController {
    async startRecording(req, res, next) {
        try {
            const { classId } = req.params;
            const recording = await recordingService.startRecording(classId, req.user);
            return res.status(200).json({ status: 'success', data: recording, message: 'Recording started successfully' });
        } catch (err) {
            next(err);
        }
    }

    async uploadChunk(req, res, next) {
        try {
            const { classId, recordingId } = req.params;
            const { chunkNumber, startTime, endTime, duration } = req.body;

            if (chunkNumber === undefined || chunkNumber === null) {
                return res.status(400).json({ status: 'error', message: 'chunkNumber is required' });
            }

            const fileBuffer = req.file ? req.file.buffer : req.body.buffer ? Buffer.from(req.body.buffer, 'base64') : req.body;

            if (!fileBuffer || (Buffer.isBuffer(fileBuffer) && fileBuffer.length === 0)) {
                return res.status(400).json({ status: 'error', message: 'Chunk binary file payload is missing or empty' });
            }

            const chunk = await recordingService.uploadChunk(classId, recordingId, Number(chunkNumber), fileBuffer, {
                startTime,
                endTime,
                duration
            });

            return res.status(201).json({ status: 'success', data: chunk, message: `Chunk ${chunkNumber} uploaded successfully` });
        } catch (err) {
            next(err);
        }
    }

    async stopRecording(req, res, next) {
        try {
            const { classId } = req.params;
            const recording = await recordingService.stopRecording(classId, req.user);
            return res.status(200).json({ status: 'success', data: recording, message: 'Recording stopped and processing queued' });
        } catch (err) {
            next(err);
        }
    }

    async retryRecording(req, res, next) {
        try {
            const { classId, recordingId } = req.params;
            const recording = await recordingService.retryRecording(classId, recordingId, req.user);
            return res.status(200).json({ status: 'success', data: recording, message: 'Recording retry job queued' });
        } catch (err) {
            next(err);
        }
    }

    async getRecordings(req, res, next) {
        try {
            const { classId } = req.params;
            const recordings = await recordingService.getRecordingsByClassId(classId);
            return res.status(200).json({ status: 'success', data: recordings });
        } catch (err) {
            next(err);
        }
    }

    async getRecordingById(req, res, next) {
        try {
            const { recordingId } = req.params;
            const recording = await recordingService.getRecordingById(recordingId);
            if (!recording) {
                return res.status(404).json({ status: 'error', message: 'Recording not found' });
            }
            return res.status(200).json({ status: 'success', data: recording });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new RecordingController();
