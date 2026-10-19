/**
 * Concurrency Test for Hotel Booking Capacity
 * Tests race condition prevention with PostgreSQL FOR UPDATE row locking
 */
const http = require('http');
const app = require('../src/server');
const db = require('../src/config/db');

async function testConcurrency() {
  console.log('\n======================================================');
  console.log('⚡ TESTING CONCURRENCY & CAPACITY-SAFE BOOKING');
  console.log('======================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Create admin and user token
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hotel.com', password: 'admin123' }),
    });
    const { token: adminToken } = await adminRes.json();

    const userRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@hotel.com', password: 'user123' }),
    });
    const { token: userToken } = await userRes.json();

    // 2. Create a room with total_rooms = 2 strictly for this test
    const roomRes = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Concurrency Stress Test Suite',
        description: 'Testing capacity limits with simultaneous bookings',
        price_per_night: 200,
        image_url: 'https://images.unsplash.com/photo-1590490360182',
        total_rooms: 2, // ONLY 2 ROOMS AVAILABLE
      }),
    });
    const { room } = await roomRes.json();
    console.log(`Created test room #${room.id} with total_rooms = 2`);

    // 3. Fire 5 SIMULTANEOUS booking requests for the exact same dates
    const checkIn = '2026-11-20';
    const checkOut = '2026-11-25';
    console.log(`Firing 5 simultaneous concurrent booking requests for room #${room.id}...`);

    const bookingPromises = [1, 2, 3, 4, 5].map((i) =>
      fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          room_id: room.id,
          check_in: checkIn,
          check_out: checkOut,
        }),
      }).then(async (r) => ({
        index: i,
        status: r.status,
        data: await r.json(),
      }))
    );

    const results = await Promise.all(bookingPromises);

    const successful = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 400);

    console.log(`Results: ${successful.length} confirmed, ${rejected.length} rejected`);

    if (successful.length === 2 && rejected.length === 3) {
      console.log('✅ PASS: Concurrency safety verified! Exactly 2 bookings confirmed and 3 rejected with capacity limit.');
    } else {
      console.error(`❌ FAIL: Expected 2 successes and 3 rejections, but got ${successful.length} and ${rejected.length}`);
      process.exit(1);
    }

    // 4. Clean up test room (cascades bookings)
    await fetch(`${baseUrl}/api/rooms/${room.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Cleaned up test room.');

    console.log('\n======================================================');
    console.log('🎉 CONCURRENCY TEST PASSED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Concurrency test failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    process.exit(0);
  }
}

testConcurrency();
