const liveClassService = require('../services/liveClass.service');
const participantService = require('../services/participant.service');

class LiveClassController {
    async createClass(req, res, next) {
        try {
            const { title, maxParticipants, mediaRegion } = req.body;
            if (!title) {
                return res.status(400).json({ status: 'error', message: 'Title is required for class creation' });
            }
            const liveClass = await liveClassService.createClass(req.user, { title, maxParticipants, mediaRegion });
            return res.status(201).json({ status: 'success', data: liveClass });
        } catch (err) {
            next(err);
        }
    }

    async getClass(req, res, next) {
        try {
            const { classId } = req.params;
            const liveClass = await liveClassService.getClass(classId);
            return res.status(200).json({ status: 'success', data: liveClass });
        } catch (err) {
            next(err);
        }
    }

    async joinClass(req, res, next) {
        try {
            const { classId } = req.params;
            const result = await liveClassService.joinClass(classId, req.user);
            return res.status(200).json({ status: 'success', data: result });
        } catch (err) {
            next(err);
        }
    }

    async leaveClass(req, res, next) {
        try {
            const { classId } = req.params;
            const userId = req.user._id || req.user.id;
            await participantService.leaveClass(classId, userId);
            return res.status(200).json({ status: 'success', message: 'Left class successfully' });
        } catch (err) {
            next(err);
        }
    }

    async getParticipants(req, res, next) {
        try {
            const { classId } = req.params;
            const participants = await participantService.getClassParticipants(classId);
            return res.status(200).json({ status: 'success', data: participants });
        } catch (err) {
            next(err);
        }
    }

    async endClass(req, res, next) {
        try {
            const { classId } = req.params;
            const liveClass = await liveClassService.endClass(classId, req.user);
            return res.status(200).json({ status: 'success', data: liveClass, message: 'Class ended for all participants' });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new LiveClassController();
