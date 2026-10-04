class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Permission denied for requested action') {
        super(message, 403, 'FORBIDDEN');
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource state conflict') {
        super(message, 409, 'CONFLICT');
    }
}

class ValidationError extends AppError {
    constructor(message = 'Invalid request payload', details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

module.exports = {
    AppError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError
};
