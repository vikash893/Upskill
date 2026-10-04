const crypto = require('crypto');

function generateClassId(prefix = 'cls') {
    const randomHex = crypto.randomBytes(4).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${randomHex}`;
}

function generateRecordingId(classId) {
    const randomHex = crypto.randomBytes(3).toString('hex');
    return `rec_${classId}_${randomHex}`;
}

module.exports = {
    generateClassId,
    generateRecordingId
};
