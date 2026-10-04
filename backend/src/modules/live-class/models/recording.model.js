const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
    recordingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    classId: {
        type: String,
        required: true,
        index: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: [
            'recording',
            'stopped',
            'processing',
            'completed',
            'failed'
        ],
        default: 'recording',
        index: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    totalChunks: {
        type: Number,
        default: 0
    },
    finalRecordingUrl: {
        type: String
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    size: {
        type: Number, // in bytes
        default: 0
    }
}, {
    timestamps: true
});

recordingSchema.index({ classId: 1, createdAt: -1 });

module.exports = mongoose.model('ScalableLiveRecording', recordingSchema);
