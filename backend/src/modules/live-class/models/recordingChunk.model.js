const mongoose = require('mongoose');

const recordingChunkSchema = new mongoose.Schema({
    recordingId: {
        type: String,
        required: true,
        index: true
    },
    chunkNumber: {
        type: Number,
        required: true
    },
    storageKey: {
        type: String,
        required: true
    },
    startTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number,
        default: 0
    },
    size: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'corrupt'],
        default: 'uploaded'
    }
}, {
    timestamps: true
});

// Idempotency: recordingId + chunkNumber MUST be unique
recordingChunkSchema.index({ recordingId: 1, chunkNumber: 1 }, { unique: true });

module.exports = mongoose.model('ScalableLiveRecordingChunk', recordingChunkSchema);
