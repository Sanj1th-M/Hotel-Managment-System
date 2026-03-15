const express = require('express');
const router = express.Router();
const {
    getRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    getAvailableRooms,
    roomValidation,
    roomUpdateValidation,
} = require('../controllers/roomController');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/errorHandler');

// All routes require authentication
router.use(protect);

// GET /api/rooms/available?checkInDate=...&checkOutDate=...
router.get('/available', getAvailableRooms);

// GET /api/rooms
router.get('/', getRooms);

// POST /api/rooms — Admin only
router.post('/', requireRole('admin'), upload.single('image'), roomValidation, validate, createRoom);

// PUT /api/rooms/:id — Admin only (Step 5 fix: roomUpdateValidation now attached)
router.put('/:id', requireRole('admin'), upload.single('image'), roomUpdateValidation, validate, updateRoom);


// DELETE /api/rooms/:id — Admin only
router.delete('/:id', requireRole('admin'), deleteRoom);

module.exports = router;
