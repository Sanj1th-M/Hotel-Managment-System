/**
 * User Controller — Profile management for authenticated users.
 */
const { body } = require('express-validator');
const UserModel = require('../models/User');
const path = require('path');
const fs = require('fs');

// ─── Validation rules ─────────────────────────────────────────────────────────
const profileUpdateValidation = [
    body('username').optional().trim().notEmpty().withMessage('Username cannot be empty').isLength({ max: 100 }),
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),
    body('age')
        .optional({ nullable: true })
        .isInt({ min: 19, max: 150 }).withMessage('Age must be greater than 18'),
];

const passwordChangeValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        .withMessage('New password must contain uppercase, lowercase, number, and special character'),
];

// ─── GET /api/users/profile ───────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                age: user.age,
                photoUrl: user.photo_url,
                role: user.role,
                createdAt: user.created_at,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/users/profile ───────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
    try {
        const { username, phone, age } = req.body;
        const updateFields = {};

        if (username !== undefined) updateFields.username = username.trim();
        if (phone !== undefined) updateFields.phone = phone;
        if (age !== undefined) updateFields.age = age;

        // Handle photo upload
        if (req.file) {
            updateFields.photoUrl = `/uploads/profiles/${req.file.filename}`;
        }

        const user = await UserModel.updateProfile(req.user.id, updateFields);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                age: user.age,
                photoUrl: user.photo_url,
                role: user.role,
                createdAt: user.created_at,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /api/users/my-bookings ───────────────────────────────────────────────
const getMyBookings = async (req, res, next) => {
    try {
        const pool = require('../config/db');
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM bookings WHERE created_by = $1',
            [req.user.id]
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const dataResult = await pool.query(
            `SELECT
                b.id, b.guest_name, b.guest_phone, b.guest_email,
                b.check_in_date, b.check_out_date, b.total_price,
                b.booking_status, b.persons, b.notes, b.created_at,
                r.id AS room_id, r.room_number, r.room_type,
                r.price_per_night, r.status AS room_status,
                r.floor_number, r.capacity, r.image_url AS room_image_url
             FROM bookings b
             LEFT JOIN rooms r ON b.room_id = r.id
             WHERE b.created_by = $1
             ORDER BY b.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.id, parseInt(limit), offset]
        );

        const bookings = dataResult.rows.map((row) => ({
            id: row.id,
            guestName: row.guest_name,
            guestPhone: row.guest_phone,
            guestEmail: row.guest_email,
            checkInDate: row.check_in_date,
            checkOutDate: row.check_out_date,
            totalPrice: parseFloat(row.total_price),
            bookingStatus: row.booking_status,
            persons: row.persons,
            notes: row.notes,
            createdAt: row.created_at,
            room: row.room_id ? {
                id: row.room_id,
                roomNumber: row.room_number,
                roomType: row.room_type,
                pricePerNight: parseFloat(row.price_per_night),
                status: row.room_status,
                floorNumber: row.floor_number,
                capacity: row.capacity,
                imageUrl: row.room_image_url,
            } : null,
        }));

        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: bookings,
        });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /api/users/password ──────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'New password must be different from current password' });
        }

        // Fetch user's current password hash
        const currentHash = await UserModel.findPasswordHashById(req.user.id);
        if (!currentHash) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Verify current password
        const isMatch = await UserModel.comparePassword(currentPassword, currentHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password' });
        }

        // Update password
        await UserModel.updatePassword(req.user.id, newPassword);

        res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, updateProfile, getMyBookings, changePassword, profileUpdateValidation, passwordChangeValidation };
