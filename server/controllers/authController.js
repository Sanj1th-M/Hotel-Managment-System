/**
 * Auth Controller
 * - Issues JWT as HttpOnly cookie (not in response body)
 * - Embeds a per-token JTI (UUID) for revocation support
 * - Logout inserts the JTI into revoked_tokens table
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const UserModel = require('../models/User');
const pool = require('../config/db');

const IS_PROD = process.env.NODE_ENV === 'production';

// Shared cookie options — login and logout MUST use identical attributes
// so that clearCookie can match and remove the cookie correctly.
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'Strict' : 'Lax',
    path: '/',
};

// ─── Validation rules ─────────────────────────────────────────────────────────
const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findByEmail(email);

        // Generic message — prevents user enumeration
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
        }

        const isMatch = await UserModel.comparePassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Attach a per-token unique ID for revocation support
        const jti = crypto.randomUUID();

        const token = jwt.sign(
            { id: user.id, role: user.role, jti },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        // Issue token as HttpOnly cookie — inaccessible to JavaScript (XSS-safe)
        res.cookie('hms_token', token, {
            ...COOKIE_OPTIONS,
            maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
        });

        // Return user profile — no token in response body
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
    try {
        const token = req.cookies?.hms_token;

        // Revoke the current token's JTI so it cannot be replayed
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.jti) {
                    await pool.query(
                        `INSERT INTO revoked_tokens (jti, user_id, expires_at)
                         VALUES ($1, $2, to_timestamp($3))
                         ON CONFLICT (jti) DO NOTHING`,
                        [decoded.jti, decoded.id, decoded.exp]
                    );
                }
            } catch {
                // Token may already be expired — still clear the cookie
            }
        }

        res.clearCookie('hms_token', COOKIE_OPTIONS);

        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = (req, res) => {
    res.status(200).json({ success: true, user: req.user });
};

module.exports = { login, logout, getMe, loginValidation };
