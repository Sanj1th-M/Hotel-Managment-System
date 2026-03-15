/**
 * Structured logger — Pino
 *
 * Features:
 * - JSON log output (machine-parseable for log aggregators)
 * - Log level controlled via LOG_LEVEL env var (default: 'info' in prod, 'debug' in dev)
 * - Redacts sensitive fields so they never appear in log output:
 *     - Authorization header
 *     - Cookie header (contains hms_token)
 *     - Any request body password field
 */
const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.password_hash',
        ],
        censor: '[REDACTED]',
    },
    ...(process.env.NODE_ENV === 'development' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    }),
});

module.exports = logger;
