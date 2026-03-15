const express = require('express');
const router = express.Router();
const { processMessage, getHistory } = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// All chatbot routes require authentication AND the 'user' role
router.use(protect);
router.use(requireRole('user'));

// Routes
router.post('/message', processMessage);
router.get('/history', getHistory);

module.exports = router;
