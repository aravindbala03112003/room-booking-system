const db = require('../config/db');

/**
 * Book a room with ACID transaction and concurrency-safe row-level locking
 * POST /api/bookings
 * Private (Authenticated user)
 */
const createBooking = async (req, res) => {
  let client;
  try {
    const { room_id, check_in, check_out } = req.body;
    const userId = req.user.id;

    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ message: 'Room ID, check-in date, and check-out date are required.' });
    }

    const roomId = parseInt(room_id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID format.' });
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ message: 'Invalid check-in or check-out date format.' });
    }

    if (checkInDate < today) {
      return res.status(400).json({ message: 'Check-in date cannot be in the past.' });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date.' });
    }

    // Acquire client from pool for transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Lock the room row to prevent race conditions during concurrent bookings (FOR UPDATE)
    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [roomId]);
    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Room not found.' });
    }
    const room = roomResult.rows[0];

    // 2. Check room capacity / availability for overlapping dates within transaction
    // Date overlap formula: existing.check_in < requested.check_out AND existing.check_out > requested.check_in
    const overlapResult = await client.query(
      `SELECT COUNT(*)::INT AS booked_count
       FROM bookings
       WHERE room_id = $1
         AND status = 'confirmed'
         AND check_in < $2
         AND check_out > $3`,
      [roomId, check_out, check_in]
    );

    const bookedCount = overlapResult.rows[0].booked_count;

    if (bookedCount >= room.total_rooms) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Sorry, this room is fully booked for the selected dates. Please choose different dates.',
      });
    }

    // 3. Create the booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, status)
       VALUES ($1, $2, $3, $4, 'confirmed')
       RETURNING *`,
      [userId, roomId, check_in, check_out]
    );

    const newBooking = bookingResult.rows[0];

    // Commit Transaction
    await client.query('COMMIT');

    // Calculate nights & total price for convenience
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = (nights * parseFloat(room.price_per_night)).toFixed(2);

    return res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking: {
        ...newBooking,
        nights,
        total_price: totalPrice,
        room_title: room.title,
        room_image: room.image_url,
      },
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('createBooking error:', error);
    return res.status(500).json({ message: 'Server error creating booking.' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Get current user's bookings
 * GET /api/bookings/my
 * Private (Authenticated user)
 */
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT
        b.id,
        b.user_id,
        b.room_id,
        TO_CHAR(b.check_in, 'YYYY-MM-DD') AS check_in,
        TO_CHAR(b.check_out, 'YYYY-MM-DD') AS check_out,
        b.status,
        b.created_at,
        r.title AS room_title,
        r.price_per_night,
        r.image_url AS room_image,
        (b.check_out - b.check_in)::INT AS total_nights,
        ((b.check_out - b.check_in) * r.price_per_night)::NUMERIC(10, 2) AS total_price
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('getMyBookings error:', error);
    return res.status(500).json({ message: 'Server error retrieving bookings.' });
  }
};

/**
 * Get all bookings in the system (Admin only)
 * GET /api/bookings
 * Private (Admin only)
 */
const getAllBookings = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        b.id,
        b.user_id,
        b.room_id,
        TO_CHAR(b.check_in, 'YYYY-MM-DD') AS check_in,
        TO_CHAR(b.check_out, 'YYYY-MM-DD') AS check_out,
        b.status,
        b.created_at,
        r.title AS room_title,
        r.price_per_night,
        r.image_url AS room_image,
        u.name AS user_name,
        u.email AS user_email,
        (b.check_out - b.check_in)::INT AS total_nights,
        ((b.check_out - b.check_in) * r.price_per_night)::NUMERIC(10, 2) AS total_price
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );

    return res.json(result.rows);
  } catch (error) {
    console.error('getAllBookings error:', error);
    return res.status(500).json({ message: 'Server error retrieving all bookings.' });
  }
};

/**
 * Cancel a booking
 * PATCH /api/bookings/:id/cancel
 * Private (User can cancel own booking, Admin can cancel any)
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking ID format.' });
    }

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Verify ownership
    const bookingQuery = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bookingQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const booking = bookingQuery.rows[0];
    if (!isAdmin && booking.user_id !== userId) {
      return res.status(403).json({ message: 'You are not authorized to cancel this booking.' });
    }

    // Duplicate cancellation handling
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'This booking is already cancelled.' });
    }

    const updated = await db.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    return res.json({
      message: 'Booking cancelled successfully.',
      booking: updated.rows[0],
    });
  } catch (error) {
    console.error('cancelBooking error:', error);
    return res.status(500).json({ message: 'Server error cancelling booking.' });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAllBookings,
  cancelBooking,
};
