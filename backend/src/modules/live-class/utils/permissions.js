const { ForbiddenError } = require('../../../shared/errors/AppError');

const HOST_ONLY_ACTIONS = new Set([
    'mute_participant',
    'disable_camera',
    'allow_camera',
    'remove_participant',
    'mute_all',
    'disable_all_cameras',
    'end_class',
    'start_recording',
    'stop_recording',
    'retry_recording',
    'lock_class'
]);

function isHost(user, classData) {
    if (!user || !classData) return false;
    const userId = user._id ? user._id.toString() : user.id ? user.id.toString() : String(user);
    const hostId = classData.hostId ? classData.hostId.toString() : String(classData.hostId);
    return userId === hostId || user.role === 'ADMIN' || user.role === 'TEACHER';
}

function verifyHostPermission(user, classData, actionName) {
    if (!isHost(user, classData)) {
        throw new ForbiddenError(`Only the class host can execute action: ${actionName}`);
    }
    return true;
}

function verifyActionPermission(user, classData, actionName) {
    if (HOST_ONLY_ACTIONS.has(actionName)) {
        return verifyHostPermission(user, classData, actionName);
    }
    return true;
}

module.exports = {
    HOST_ONLY_ACTIONS,
    isHost,
    verifyHostPermission,
    verifyActionPermission
};
