const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['host', 'student'],
        required: true
    },
    status: {
        type: String,
        enum: ['invited', 'joined', 'left', 'removed'],
        default: 'joined'
    },
    audioEnabled: {
        type: Boolean,
        default: false
    },
    videoEnabled: {
        type: Boolean,
        default: false
    },
    screenSharing: {
        type: Boolean,
        default: false
    },
    mutedByHost: {
        type: Boolean,
        default: false
    },
    cameraDisabledByHost: {
        type: Boolean,
        default: false
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date
    },
    lastSeenAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index so user appears once per class record state
participantSchema.index({ classId: 1, userId: 1 }, { unique: true });
participantSchema.index({ classId: 1, status: 1 });

module.exports = mongoose.model('ScalableLiveParticipant', participantSchema);
