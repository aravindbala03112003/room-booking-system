const db = require('../config/db');

/**
 * Get all rooms with optional filtering (search term, minPrice, maxPrice, check_in, check_out)
 * GET /api/rooms
 */
const getAllRooms = async (req, res) => {
  try {
    const { search, minPrice, maxPrice, check_in, check_out } = req.query;

    let checkInIndex = null;
    let checkOutIndex = null;

    // Validate dates if provided
    if (check_in || check_out) {
      if (!check_in || !check_out) {
        return res.status(400).json({ message: 'Both check_in and check_out dates are required for availability filtering.' });
      }

      const inDate = new Date(check_in);
      const outDate = new Date(check_out);

      if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
        return res.status(400).json({ message: 'Invalid check-in or check-out date format.' });
      }

      if (outDate <= inDate) {
        return res.status(400).json({ message: 'Check-out date must be after check-in date.' });
      }
    }

    let query = `
      SELECT r.id, r.title, r.description, r.price_per_night, r.image_url, r.total_rooms, r.created_at
    `;
    const params = [];
    const conditions = [];

    // If check_in and check_out are provided, calculate available rooms during that window
    if (check_in && check_out) {
      params.push(check_in);
      checkInIndex = params.length;
      params.push(check_out);
      checkOutIndex = params.length;

      query += `,
        (r.total_rooms - COALESCE((
          SELECT COUNT(*)
          FROM bookings b
          WHERE b.room_id = r.id
            AND b.status = 'confirmed'
            AND b.check_in < $${checkOutIndex}
            AND b.check_out > $${checkInIndex}
        ), 0))::INT AS available_rooms
      `;
    }

    query += ` FROM rooms r`;

    // Filter by search query (matches title or description)
    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      conditions.push(`(r.title ILIKE $${params.length} OR r.description ILIKE $${params.length})`);
    }

    // Filter by minPrice
    if (minPrice && !isNaN(minPrice)) {
      const minVal = parseFloat(minPrice);
      if (minVal >= 0) {
        params.push(minVal);
        conditions.push(`r.price_per_night >= $${params.length}`);
      }
    }

    // Filter by maxPrice
    if (maxPrice && !isNaN(maxPrice)) {
      const maxVal = parseFloat(maxPrice);
      if (maxVal >= 0) {
        params.push(maxVal);
        conditions.push(`r.price_per_night <= $${params.length}`);
      }
    }

    // If dates are provided, filter only rooms that have at least 1 room available
    if (check_in && check_out) {
      conditions.push(`(r.total_rooms - COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.room_id = r.id
          AND b.status = 'confirmed'
          AND b.check_in < $${checkOutIndex}
          AND b.check_out > $${checkInIndex}
      ), 0)) > 0`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY r.id ASC`;

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    console.error('getAllRooms error:', error);
    return res.status(500).json({ message: 'Server error retrieving rooms.' });
  }
};

/**
 * Get room by ID
 * GET /api/rooms/:id
 */
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const roomId = parseInt(id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID format.' });
    }

    const result = await db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('getRoomById error:', error);
    return res.status(500).json({ message: 'Server error retrieving room details.' });
  }
};

/**
 * Create a new room (Admin only)
 * POST /api/rooms
 */
const createRoom = async (req, res) => {
  try {
    const { title, description, price_per_night, image_url, total_rooms } = req.body;

    if (!title || !description || !price_per_night || !image_url) {
      return res.status(400).json({ message: 'Title, description, price, and image URL are required.' });
    }

    const price = parseFloat(price_per_night);
    const count = parseInt(total_rooms, 10) || 1;

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'Price per night must be a positive number.' });
    }

    if (count <= 0) {
      return res.status(400).json({ message: 'Total rooms must be at least 1.' });
    }

    const result = await db.query(
      `INSERT INTO rooms (title, description, price_per_night, image_url, total_rooms)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title.trim(), description.trim(), price, image_url.trim(), count]
    );

    return res.status(201).json({
      message: 'Room created successfully.',
      room: result.rows[0],
    });
  } catch (error) {
    console.error('createRoom error:', error);
    return res.status(500).json({ message: 'Server error creating room.' });
  }
};

/**
 * Update an existing room (Admin only)
 * PUT /api/rooms/:id
 */
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const roomId = parseInt(id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID format.' });
    }

    const { title, description, price_per_night, image_url, total_rooms } = req.body;

    const existing = await db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const price = price_per_night !== undefined ? parseFloat(price_per_night) : existing.rows[0].price_per_night;
    const count = total_rooms !== undefined ? parseInt(total_rooms, 10) : existing.rows[0].total_rooms;

    if (price <= 0 || count <= 0) {
      return res.status(400).json({ message: 'Price and total rooms must be positive values.' });
    }

    const result = await db.query(
      `UPDATE rooms
       SET title = $1,
           description = $2,
           price_per_night = $3,
           image_url = $4,
           total_rooms = $5
       WHERE id = $6
       RETURNING *`,
      [
        title ? title.trim() : existing.rows[0].title,
        description ? description.trim() : existing.rows[0].description,
        price,
        image_url ? image_url.trim() : existing.rows[0].image_url,
        count,
        roomId,
      ]
    );

    return res.json({
      message: 'Room updated successfully.',
      room: result.rows[0],
    });
  } catch (error) {
    console.error('updateRoom error:', error);
    return res.status(500).json({ message: 'Server error updating room.' });
  }
};

/**
 * Delete a room (Admin only)
 * DELETE /api/rooms/:id
 */
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const roomId = parseInt(id, 10);
    if (isNaN(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID format.' });
    }

    const result = await db.query('DELETE FROM rooms WHERE id = $1 RETURNING id', [roomId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    return res.json({ message: 'Room deleted successfully.', id: result.rows[0].id });
  } catch (error) {
    console.error('deleteRoom error:', error);
    return res.status(500).json({ message: 'Server error deleting room.' });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
