/**
 * Automated Test Suite for Hotel Room Booking System
 * Runs against live Express app and PostgreSQL database
 */
const http = require('http');
const app = require('../src/server');
const db = require('../src/config/db');

let server;
let baseUrl;

// Test helper for making requests
async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${path}`, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING HOTEL BOOKING SYSTEM AUTOMATED TESTS');
  console.log('======================================================\n');

  // Start ephemeral server
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ---------------------------------------------------------
    // 1. HEALTH CHECK TEST
    // ---------------------------------------------------------
    console.log('--- 1. Health Check & Database Connectivity ---');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'Health endpoint returns HTTP 200');
    assert(health.data.status === 'OK', 'Health status is OK');
    assert(health.data.database_connected === true, 'Database connection is verified');

    // ---------------------------------------------------------
    // 2. AUTHENTICATION & PRIVILEGE ESCALATION SECURITY
    // ---------------------------------------------------------
    console.log('\n--- 2. Authentication & Security ---');

    // Demo admin login
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@hotel.com',
      password: 'admin123',
    });
    assert(adminLogin.status === 200, 'Admin demo login succeeds');
    assert(adminLogin.data.user.role === 'admin', 'Admin login returns role admin');
    const adminToken = adminLogin.data.token;

    // Demo user login
    const userLogin = await request('POST', '/api/auth/login', {
      email: 'user@hotel.com',
      password: 'user123',
    });
    assert(userLogin.status === 200, 'User demo login succeeds');
    assert(userLogin.data.user.role === 'user', 'User login returns role user');
    const userToken = userLogin.data.token;

    // Invalid password rejected
    const badLogin = await request('POST', '/api/auth/login', {
      email: 'user@hotel.com',
      password: 'wrongpassword',
    });
    assert(badLogin.status === 400, 'Invalid login credentials rejected with HTTP 400');

    // Profile /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, userToken);
    assert(meRes.status === 200, 'GET /api/auth/me returns authenticated user profile');
    assert(meRes.data.user.email === 'user@hotel.com', 'Profile matches logged-in user');

    // CRITICAL SECURITY TEST: Privilege Escalation Prevention on Signup
    const testUserEmail = `attacker_${Date.now()}@example.com`;
    const signupAttempt = await request('POST', '/api/auth/signup', {
      name: 'Sneaky Attacker',
      email: testUserEmail,
      password: 'password123',
      role: 'admin', // Attempting privilege escalation
    });
    assert(signupAttempt.status === 201, 'Signup succeeds');
    assert(
      signupAttempt.data.user.role === 'user',
      'SECURITY VERIFIED: Public signup cannot elevate to admin! Role is strictly "user"'
    );
    const attackerToken = signupAttempt.data.token;

    // Duplicate email registration rejected
    const dupSignup = await request('POST', '/api/auth/signup', {
      name: 'Duplicate User',
      email: testUserEmail,
      password: 'password123',
    });
    assert(dupSignup.status === 400, 'Duplicate email registration rejected with HTTP 400');

    // ---------------------------------------------------------
    // 3. ROOMS API & VALIDATION
    // ---------------------------------------------------------
    console.log('\n--- 3. Room Listing, Details & Filtering ---');

    const roomsList = await request('GET', '/api/rooms');
    assert(roomsList.status === 200, 'GET /api/rooms returns HTTP 200');
    assert(Array.isArray(roomsList.data), 'Rooms is an array');
    assert(roomsList.data.length >= 6, 'All seeded rooms retrieved');

    const firstRoom = roomsList.data[0];
    const roomDetails = await request('GET', `/api/rooms/${firstRoom.id}`);
    assert(roomDetails.status === 200, 'GET /api/rooms/:id returns HTTP 200');
    assert(roomDetails.data.id === firstRoom.id, 'Room details match requested ID');

    // Non-integer ID error handling
    const badRoomId = await request('GET', '/api/rooms/invalid-id-text');
    assert(badRoomId.status === 400, 'Non-integer room ID handled cleanly with HTTP 400');

    // Non-existent ID
    const notFoundRoom = await request('GET', '/api/rooms/999999');
    assert(notFoundRoom.status === 404, 'Non-existent room returns HTTP 404');

    // Date range validation in room filtering
    const badDateFilter = await request('GET', '/api/rooms?check_in=2026-11-10&check_out=2026-11-05');
    assert(badDateFilter.status === 400, 'Reversed date filter rejected with HTTP 400');

    const validDateFilter = await request('GET', '/api/rooms?check_in=2026-11-05&check_out=2026-11-10');
    assert(validDateFilter.status === 200, 'Valid date filter returns rooms');

    // ---------------------------------------------------------
    // 4. ADMIN ROOM MANAGEMENT & RBAC
    // ---------------------------------------------------------
    console.log('\n--- 4. Role-Based Access Control (Admin Rooms) ---');

    // Normal user cannot create room (RBAC)
    const unauthorizedRoom = await request(
      'POST',
      '/api/rooms',
      {
        title: 'Hacker Suite',
        description: 'Should not exist',
        price_per_night: 100,
        image_url: 'https://images.unsplash.com/photo-1582719478250',
        total_rooms: 1,
      },
      userToken
    );
    assert(unauthorizedRoom.status === 403, 'Normal user blocked from creating room (HTTP 403 Forbidden)');

    // Admin can create room
    const createRoomRes = await request(
      'POST',
      '/api/rooms',
      {
        title: 'Automated Test Luxury Suite',
        description: 'Temporary room created for test verification.',
        price_per_night: 220.00,
        image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b',
        total_rooms: 3,
      },
      adminToken
    );
    assert(createRoomRes.status === 201, 'Admin successfully created new room (HTTP 201)');
    const createdRoomId = createRoomRes.data.room.id;

    // Admin can update room
    const updateRoomRes = await request(
      'PUT',
      `/api/rooms/${createdRoomId}`,
      {
        title: 'Automated Test Luxury Suite (Updated)',
        price_per_night: 240.00,
      },
      adminToken
    );
    assert(updateRoomRes.status === 200, 'Admin successfully updated room (HTTP 200)');
    assert(updateRoomRes.data.room.title.includes('(Updated)'), 'Updated title persisted in database');

    // Admin can delete room
    const deleteRoomRes = await request('DELETE', `/api/rooms/${createdRoomId}`, null, adminToken);
    assert(deleteRoomRes.status === 200, 'Admin successfully deleted room (HTTP 200)');

    // ---------------------------------------------------------
    // 5. BOOKING CREATION, PERSISTENCE & CONCURRENCY
    // ---------------------------------------------------------
    console.log('\n--- 5. Booking Creation, Validation & Concurrency ---');

    // Future booking dates
    const checkInFuture = '2026-12-01';
    const checkOutFuture = '2026-12-05';

    // Unauthenticated booking rejected
    const unauthBooking = await request('POST', '/api/bookings', {
      room_id: firstRoom.id,
      check_in: checkInFuture,
      check_out: checkOutFuture,
    });
    assert(unauthBooking.status === 401, 'Unauthenticated booking rejected (HTTP 401)');

    // Invalid date order rejected
    const badDateBooking = await request(
      'POST',
      '/api/bookings',
      {
        room_id: firstRoom.id,
        check_in: '2026-12-05',
        check_out: '2026-12-01',
      },
      userToken
    );
    assert(badDateBooking.status === 400, 'Check-out before check-in rejected (HTTP 400)');

    // Valid booking creation
    const validBooking = await request(
      'POST',
      '/api/bookings',
      {
        room_id: firstRoom.id,
        check_in: checkInFuture,
        check_out: checkOutFuture,
      },
      userToken
    );
    assert(validBooking.status === 201, 'Valid booking confirmed with HTTP 201');
    assert(validBooking.data.booking.nights === 4, 'Correct number of nights calculated (4 nights)');
    const createdBookingId = validBooking.data.booking.id;

    // Verify booking appears in My Bookings
    const myBookings = await request('GET', '/api/bookings/my', null, userToken);
    assert(myBookings.status === 200, 'GET /api/bookings/my returns HTTP 200');
    const hasBooking = myBookings.data.some((b) => b.id === createdBookingId);
    assert(hasBooking, 'Created booking appears in user booking history');

    // ---------------------------------------------------------
    // 6. CANCELLATION & ACCESS CONTROL
    // ---------------------------------------------------------
    console.log('\n--- 6. Cancellation & Multi-Tenant Authorization ---');

    // Other user cannot cancel this booking
    const unauthorizedCancel = await request(
      'PATCH',
      `/api/bookings/${createdBookingId}/cancel`,
      null,
      attackerToken
    );
    assert(unauthorizedCancel.status === 403, 'Other user blocked from cancelling another user booking (HTTP 403)');

    // Owner can cancel booking
    const cancelRes = await request(
      'PATCH',
      `/api/bookings/${createdBookingId}/cancel`,
      null,
      userToken
    );
    assert(cancelRes.status === 200, 'Owner can cancel their own booking (HTTP 200)');
    assert(cancelRes.data.booking.status === 'cancelled', 'Booking status updated to cancelled in database');

    // Duplicate cancellation handling
    const dupCancel = await request(
      'PATCH',
      `/api/bookings/${createdBookingId}/cancel`,
      null,
      userToken
    );
    assert(dupCancel.status === 400, 'Duplicate cancellation handled safely with HTTP 400');

    // ---------------------------------------------------------
    // 7. ADMIN ALL BOOKINGS & METRICS
    // ---------------------------------------------------------
    console.log('\n--- 7. Admin All Bookings & Metrics ---');

    // Normal user blocked from viewing all bookings
    const userViewAll = await request('GET', '/api/bookings', null, userToken);
    assert(userViewAll.status === 403, 'Normal user blocked from GET /api/bookings (HTTP 403 Forbidden)');

    // Admin can view all bookings
    const adminViewAll = await request('GET', '/api/bookings', null, adminToken);
    assert(adminViewAll.status === 200, 'Admin can view all bookings (HTTP 200)');
    assert(Array.isArray(adminViewAll.data), 'All bookings returned as array');

    // Clean up created test user
    await db.query('DELETE FROM users WHERE email = $1', [testUserEmail]);

    console.log('\n======================================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test run failed with error:', err);
  } finally {
    if (server) {
      server.close();
    }
    // Cleanly exit
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
