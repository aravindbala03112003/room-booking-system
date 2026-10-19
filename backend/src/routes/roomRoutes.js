const express = require('express');
const router = express.Router();
const {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('../controllers/roomController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public room browsing & details
router.get('/', getAllRooms);
router.get('/:id', getRoomById);

// Admin-protected room management
router.post('/', verifyToken, requireAdmin, createRoom);
router.put('/:id', verifyToken, requireAdmin, updateRoom);
router.delete('/:id', verifyToken, requireAdmin, deleteRoom);

module.exports = router;
