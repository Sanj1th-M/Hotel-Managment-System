const express = require('express');
const router = express.Router();
const { login, logout, register, getMe, loginValidation, registerValidation } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

// POST /api/auth/register — public, creates user with role='user'
router.post('/register', registerValidation, validate, register);

// POST /api/auth/logout  (protected — confirms token was valid)
router.post('/logout', protect, logout);

// GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;
