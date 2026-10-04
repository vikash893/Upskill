const { isHost, verifyHostPermission } = require('../utils/permissions');
const { ForbiddenError } = require('../../../shared/errors/AppError');

class PermissionService {
    isHost(user, classData) {
        return isHost(user, classData);
    }

    canControlParticipant(requestingUser, classData, targetParticipantId) {
        if (!isHost(requestingUser, classData)) {
            throw new ForbiddenError('Only the host can modify participant states.');
        }
        return true;
    }

    canStartRecording(requestingUser, classData) {
        return verifyHostPermission(requestingUser, classData, 'start_recording');
    }

    canStopRecording(requestingUser, classData) {
        return verifyHostPermission(requestingUser, classData, 'stop_recording');
    }

    canEndClass(requestingUser, classData) {
        return verifyHostPermission(requestingUser, classData, 'end_class');
    }
}

module.exports = new PermissionService();
