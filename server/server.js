require('dotenv').config();

// ─── Startup: validate required env vars ──────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`❌ Missing required env var: ${key}. See .env.example.`);
        process.exit(1);
    }
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');

// PostgreSQL pool — connects on startup (imported for side-effect)
require('./config/db');

const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const bookingRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const supportRoutes = require('./routes/supportRoutes');

const app = express();
app.set('trust proxy', true); // Allow Cloudflare & Vite proxies for Rate Limiting & secure cookies
const path = require('path');
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Security Headers (Helmet + CSP) ─────────────────────────────────────────
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind requires inline styles
                imgSrc: ["'self'", 'data:'],
                fontSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: IS_PROD ? [] : null,
            },
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        frameguard: { action: 'deny' },            // X-Frame-Options: DENY
        noSniff: true,                           // X-Content-Type-Options: nosniff
        hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Step 9 fix: null-origin only allowed in development
const allowedOrigins = [process.env.CLIENT_ORIGIN || 'http://localhost:5173'];

app.use(
    cors({
        origin: (origin, callback) => {
            // In development, unconditionally allow all origins to fix Cloudflare & Vite proxy issues
            if (!IS_PROD) return callback(null, true);
            
            // In Production, strictly check allowed origins
            if (!origin) return callback(null, true); // Allow mobile/curl
            if (allowedOrigins.includes(origin)) return callback(null, true);
            
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,  // Required for cookie-based auth
    })
);

// ─── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Structured HTTP Logging (pino-http) ──────────────────────────────────────
// Step 11 fix: replaces morgan; redacts Authorization and Cookie headers
app.use(
    pinoHttp({
        logger,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customLogLevel: (req, res, err) => {
            if (err || res.statusCode >= 500) return 'error';
            if (res.statusCode >= 400) return 'warn';
            return 'info';
        },
    })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Auth endpoints — very strict: 10 attempts per 15 min
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});

// Global fallback — 100 req / 15 min
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

// Step 6 fix: data endpoints get a per-minute limit to prevent API scraping
const dataLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
});

app.use(globalLimiter);

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────
const chatbotRoutes = require('./routes/chatbotRoutes');

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', dataLimiter, roomRoutes);
app.use('/api/bookings', dataLimiter, bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', dataLimiter, userRoutes);
app.use('/api/chatbot', dataLimiter, chatbotRoutes);
app.use('/api/support', dataLimiter, supportRoutes);

// ─── Public: Browse rooms (for visitors) ──────────────────────────────────────
const RoomModel = require('./models/Room');
app.get('/api/public/rooms', dataLimiter, async (req, res, next) => {
    try {
        const { roomType, checkInDate, checkOutDate } = req.query;
        const pool = require('./config/db');

        let query = `SELECT r.*, COALESCE(r.image_url, '') AS image_url FROM rooms r WHERE r.status != 'maintenance'`;
        const values = [];
        let idx = 1;

        if (roomType) {
            query += ` AND r.room_type = $${idx++}`;
            values.push(roomType);
        }

        // Filter out rooms that have overlapping confirmed bookings
        if (checkInDate && checkOutDate) {
            query += ` AND r.id NOT IN (
                SELECT b.room_id FROM bookings b
                WHERE b.booking_status = 'confirmed'
                  AND b.check_in_date < $${idx + 1}
                  AND b.check_out_date > $${idx}
            )`;
            values.push(checkInDate, checkOutDate);
            idx += 2;
        }

        query += ` ORDER BY r.room_number ASC`;
        const result = await pool.query(query, values);

        const rooms = result.rows.map((row) => ({
            id: row.id,
            roomNumber: row.room_number,
            roomType: row.room_type,
            pricePerNight: parseFloat(row.price_per_night),
            status: row.status,
            capacity: row.capacity,
            floorNumber: row.floor_number,
            description: row.description,
            imageUrl: row.image_url,
        }));

        res.status(200).json({ success: true, count: rooms.length, data: rooms });
    } catch (error) {
        next(error);
    }
});

// Health check — minimal info exposed (no DB type)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running.',
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
