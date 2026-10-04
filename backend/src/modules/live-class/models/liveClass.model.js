const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    hostEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'live', 'ended'],
        default: 'scheduled',
        index: true
    },
    startedAt: {
        type: Date
    },
    endedAt: {
        type: Date
    },
    maxParticipants: {
        type: Number,
        default: 500
    },
    mediaRegion: {
        type: String,
        default: 'us-east-1'
    },
    sfuRoomId: {
        type: String
    },
    recordingEnabled: {
        type: Boolean,
        default: true
    },
    recordingStatus: {
        type: String,
        enum: [
            'not_started',
            'recording',
            'stopped',
            'processing',
            'completed',
            'failed'
        ],
        default: 'not_started'
    },
    finalRecordingUrl: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for high performance querying
liveClassSchema.index({ hostId: 1, createdAt: -1 });
liveClassSchema.index({ status: 1, createdAt: -1 });
liveClassSchema.index({ classId: 1, status: 1 });

module.exports = mongoose.model('ScalableLiveClass', liveClassSchema);
