const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getRecentSupportTickets } = require('../controllers/supportController');

router.use(protect);
router.use(requireRole('admin'));

router.get('/', getRecentSupportTickets);

module.exports = router;
