/**
 * Authentication Middleware
 * - Reads JWT from HttpOnly cookie (not Authorization header)
 * - Verifies signature, expiry, and revocation status (JTI check)
 * - Attaches camelCase user object to req.user
 */
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const pool = require('../config/db');

const protect = async (req, res, next) => {
    try {
        // Read token from secure HttpOnly cookie
        const token = req.cookies?.hms_token;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided. Access denied.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
            }
            return res.status(401).json({ success: false, message: 'Invalid token. Access denied.' });
        }

        // Check token revocation — prevents use of logged-out tokens
        if (decoded.jti) {
            const revoked = await pool.query(
                'SELECT 1 FROM revoked_tokens WHERE jti = $1',
                [decoded.jti]
            );
            if (revoked.rows.length > 0) {
                return res.status(401).json({ success: false, message: 'Token has been revoked. Please log in again.' });
            }
        }

        // Resolve the user from the database on every request
        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
        }

        // Normalise field names to camelCase for downstream controllers
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { protect };
