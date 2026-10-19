const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
} = require('../controllers/bookingController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// User booking actions (require authentication)
router.post('/', verifyToken, createBooking);
router.get('/my', verifyToken, getMyBookings);
router.patch('/:id/cancel', verifyToken, cancelBooking);

// Admin booking actions (require admin role)
router.get('/', verifyToken, requireAdmin, getAllBookings);

module.exports = router;
