const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    getMyBookings,
    changePassword,
    profileUpdateValidation,
    passwordChangeValidation,
} = require('../controllers/userController');
const { downloadReceipt } = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/errorHandler');
const profileUpload = require('../middleware/profileUpload');

// All user routes require authentication
router.use(protect);

// GET /api/users/profile — Get own profile
router.get('/profile', getProfile);

// PUT /api/users/profile — Update own profile (with optional photo upload)
router.put(
    '/profile',
    profileUpload.single('photo'),
    profileUpdateValidation,
    validate,
    updateProfile
);

// PUT /api/users/password — Change password securely
router.put(
    '/password',
    passwordChangeValidation,
    validate,
    changePassword
);

// GET /api/users/my-bookings — Get user's own bookings
router.get('/my-bookings', requireRole('user'), getMyBookings);

// GET /api/users/bookings/:id/receipt — Download booking receipt
router.get('/bookings/:id/receipt', requireRole('user'), downloadReceipt);

module.exports = router;
