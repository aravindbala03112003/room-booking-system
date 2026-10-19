const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seed() {
  const isFresh = process.argv.includes('--fresh') || process.env.SEED_FORCE === 'true';
  console.log(`🌱 Starting database setup and seeding (${isFresh ? 'FRESH RESET MODE' : 'SAFE IDEMPOTENT MODE'})...`);

  try {
    // 1. Run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schemaSql);
    console.log('✅ Tables created/verified successfully.');

    // 2. Clear existing data only if explicitly requested
    if (isFresh) {
      await db.query('DELETE FROM bookings');
      await db.query('DELETE FROM rooms');
      await db.query('DELETE FROM users');
      console.log('🧹 Cleaned existing tables for fresh seed.');
    }

    // 3. Create or preserve Demo Users
    const passwordHashAdmin = await bcrypt.hash('admin123', 10);
    const passwordHashUser = await bcrypt.hash('user123', 10);

    let adminUser;
    const existingAdmin = await db.query('SELECT id, name, email, role FROM users WHERE email = $1', ['admin@hotel.com']);
    if (existingAdmin.rows.length === 0) {
      const adminResult = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role`,
        ['Hotel Admin', 'admin@hotel.com', passwordHashAdmin, 'admin']
      );
      adminUser = adminResult.rows[0];
      console.log('✅ Admin user created: admin@hotel.com / admin123 (Role: admin)');
    } else {
      adminUser = existingAdmin.rows[0];
      console.log('ℹ️ Admin user already exists: admin@hotel.com');
    }

    let demoUser;
    const existingUser = await db.query('SELECT id, name, email, role FROM users WHERE email = $1', ['user@hotel.com']);
    if (existingUser.rows.length === 0) {
      const userResult = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role`,
        ['John Doe', 'user@hotel.com', passwordHashUser, 'user']
      );
      demoUser = userResult.rows[0];
      console.log('✅ Demo user created: user@hotel.com / user123 (Role: user)');
    } else {
      demoUser = existingUser.rows[0];
      console.log('ℹ️ Demo user already exists: user@hotel.com');
    }

    // 4. Create Demo Rooms if rooms table is empty or fresh
    const roomCountRes = await db.query('SELECT COUNT(*)::INT AS count FROM rooms');
    const currentRoomCount = roomCountRes.rows[0].count;

    if (currentRoomCount === 0 || isFresh) {
      const roomsData = [
        {
          title: 'Deluxe Ocean View Suite',
          description: 'Breathtaking panoramic ocean views, private balcony, king-size canopy bed, marble bathroom with deep soaking tub, and 24-hour room service.',
          price_per_night: 260.00,
          image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          total_rooms: 4,
        },
        {
          title: 'Executive King Room',
          description: 'Designed for modern travelers with ergonomic workspace, high-speed Wi-Fi, premium plush bedding, rainfall shower, and complimentary espresso bar.',
          price_per_night: 175.00,
          image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          total_rooms: 6,
        },
        {
          title: 'Cozy Botanical Garden Villa',
          description: 'Private cottage surrounded by lush tropical gardens, outdoor sun terrace, hammock, artisanal teak furnishings, and tranquil quietness.',
          price_per_night: 310.00,
          image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
          total_rooms: 2,
        },
        {
          title: 'Skyline Penthouse Loft',
          description: 'Ultra-luxurious top floor loft featuring floor-to-ceiling windows, private rooftop plunge pool, designer kitchen, and private elevator access.',
          price_per_night: 480.00,
          image_url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
          total_rooms: 1,
        },
        {
          title: 'Superior Double Room',
          description: 'Spacious accommodation with two queen beds, smart TV with streaming, contemporary ambient lighting, and premium organic bath amenities.',
          price_per_night: 140.00,
          image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
          total_rooms: 8,
        },
        {
          title: 'Alpine Heritage Chalet',
          description: 'Warm timber interiors with wood-burning stone fireplace, mountain vistas, heated slate floors, and curated wine cellar minibar.',
          price_per_night: 350.00,
          image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
          total_rooms: 3,
        },
      ];

      const insertedRooms = [];
      for (const r of roomsData) {
        const res = await db.query(
          `INSERT INTO rooms (title, description, price_per_night, image_url, total_rooms)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [r.title, r.description, r.price_per_night, r.image_url, r.total_rooms]
        );
        insertedRooms.push(res.rows[0]);
      }
      console.log(`✅ ${insertedRooms.length} rooms seeded.`);

      // 5. Create a sample confirmed booking for demo user if none exists
      const bookingCheck = await db.query('SELECT COUNT(*)::INT AS count FROM bookings WHERE user_id = $1', [demoUser.id]);
      if (bookingCheck.rows[0].count === 0 && insertedRooms.length > 0) {
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 3);
        const checkOut = new Date();
        checkOut.setDate(checkOut.getDate() + 7);

        const checkInStr = checkIn.toISOString().split('T')[0];
        const checkOutStr = checkOut.toISOString().split('T')[0];

        await db.query(
          `INSERT INTO bookings (user_id, room_id, check_in, check_out, status)
           VALUES ($1, $2, $3, $4, 'confirmed')`,
          [demoUser.id, insertedRooms[0].id, checkInStr, checkOutStr]
        );
        console.log(`✅ Sample booking created for ${demoUser.name} (${insertedRooms[0].title} from ${checkInStr} to ${checkOutStr}).`);
      }
    } else {
      console.log(`ℹ️ Rooms already present (${currentRoomCount} rooms found in database). Skipping duplicate seed.`);
    }

    console.log('\n🎉 Seeding finished successfully! Database is ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
