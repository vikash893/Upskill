const { AppError } = require('../errors/AppError');

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected error occurred';

    if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
        console.error('[GlobalErrorHandler]', err);
    }

    return res.status(statusCode).json({
        status: 'error',
        code,
        message,
        details: err.details || null
    });
}

module.exports = errorHandler;
