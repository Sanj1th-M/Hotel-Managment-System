const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to check express-validator results.
 * Returns 400 with structured error list if validation fails.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

/**
 * Global error handler middleware.
 * - Maps PostgreSQL error codes to safe, user-facing messages
 * - Logs full error internally but NEVER exposes stack traces or DB metadata to clients
 * - Only sends stack trace in development mode (internal debug only, not exposed via API in prod)
 */
const errorHandler = (err, req, res, next) => {
    // Log full error details internally (redacted by pino transport)
    logger.error({ err, method: req.method, url: req.originalUrl }, 'Request error');

    // ── PostgreSQL specific error codes ────────────────────────────────────────

    // Unique constraint violation (e.g. duplicate email / room_number)
    if (err.code === '23505') {
        const detail = err.detail || '';
        const fieldMatch = detail.match(/Key \((.+?)\)=/);
        const field = fieldMatch ? fieldMatch[1] : 'field';
        return res.status(409).json({
            success: false,
            message: `A record with this ${field} already exists.`,
        });
    }

    // Foreign key violation
    if (err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Referenced resource does not exist.',
        });
    }

    // Check constraint violation
    if (err.code === '23514') {
        return res.status(400).json({
            success: false,
            message: 'Data failed validation constraints.',
        });
    }

    // Not-null violation — FIXED: was exposing err.column (internal DB schema)
    if (err.code === '23502') {
        return res.status(400).json({
            success: false,
            message: 'A required field is missing.',   // Generic — no column name exposed
        });
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        // Stack trace only ever logged internally; never returned to clients in production
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { validate, errorHandler };
