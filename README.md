# 🏨 Aura Haven Hotel - Full-Stack Room Booking System

A robust, enterprise-grade Full-Stack Hotel Room Booking Application built with **React 19**, **Vite**, **Node.js + Express**, **PostgreSQL**, and **JWT Authentication**. Engineered with concurrency-safe database transactions, role-based access control (RBAC), and modern aesthetic design.

---

## 🚀 Live Deployment & Links

- **Live Frontend Application (Vercel):** [https://room-booking-system-self.vercel.app](https://room-booking-system-self.vercel.app) *(or your deployed Vercel domain)*
- **API Health Check Endpoint:** `https://<deployed-domain>/api/health`
- **GitHub Repository:** [https://github.com/aravindbala03112003/room-booking-system](https://github.com/aravindbala03112003/room-booking-system)

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Axios, Lucide React, Vanilla CSS Design System |
| **Backend** | Node.js, Express.js, PostgreSQL (`pg` connection pool with SSL support), JWT, bcryptjs |
| **Database** | PostgreSQL 16+ (Local or Managed: Neon, Supabase, Render, Railway) |
| **Testing** | Native automated test runner, 40+ unit/integration/API assertions, concurrency stress testing |
| **Deployment** | Vercel (Frontend & Serverless API functions), Render / Managed Cloud Host |

---

## ✨ Features & Capabilities

### 1. Guest & Public Features
- **Curated Room Catalog:** Browse luxury suites with high-definition imagery, amenities, pricing, and live room inventory.
- **Date Range & Price Filtering:** Search by room title, min/max price, and check-in/check-out dates with instant availability calculations.
- **Calculated Booking Breakdown:** Live calculation of stay duration (nights) and total pricing with taxes included.
- **Instant Reservation:** Instant booking confirmation with automatic database availability deduction.
- **My Reservations Dashboard:** View upcoming and past stays, check-in/out dates, pricing, and real-time statuses (`confirmed`, `cancelled`).
- **Free Cancellation:** 1-click cancellation that releases room inventory back to the availability pool.

### 2. Administrative Features
- **Secure Administrator RBAC:** Protected management routes strictly requiring `admin` credentials.
- **Room Management (CRUD):** Add new suites, update descriptions, alter nightly rates, adjust room inventory, and delete rooms.
- **All Guest Reservations:** View complete booking logs across all hotel guests with duration and revenue totals.
- **Live Business KPIs:** Real-time metrics tracking Total Bookings, Active/Confirmed reservations, and Confirmed Revenue.

### 3. Security & Concurrency Hardening
- **Privilege Escalation Prevention:** Public user registration strictly assigns `user` role. Admin roles can never be self-assigned via public signup.
- **ACID Transactions & Row-Level Locking (`FOR UPDATE`):** Simultaneous booking requests for the last physical room cannot overbook inventory; exactly one transaction locks and commits while subsequent overlapping requests are safely rejected.
- **SQL Injection Immunization:** All queries use parameterized queries (`$1, $2, ...`).
- **Safe Health Endpoint:** `/api/health` reports operational status and database connectivity without leaking database credentials, hostnames, or raw SQL errors.
- **Non-Destructive Database Seeder:** `npm run seed` operates in safe idempotent mode by default, preserving existing users and reservations.

---

## 🏗️ Project Architecture & Directory Structure

```text
room-booking-system/
├── api/
│   └── index.js                    # Vercel serverless function entrypoint
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # PostgreSQL pool with DATABASE_URL & SSL support
│   │   ├── controllers/
│   │   │   ├── authController.js   # JWT authentication & profile controller
│   │   │   ├── roomController.js   # Room CRUD & dynamic date availability
│   │   │   └── bookingController.js# Transactional booking & cancellation
│   │   ├── db/
│   │   │   ├── schema.sql          # PostgreSQL DDL schema & indexes
│   │   │   └── seed.js             # Safe idempotent database seeder
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   # verifyToken (JWT) & requireAdmin RBAC
│   │   ├── routes/
│   │   │   ├── authRoutes.js       # /api/auth endpoints
│   │   │   ├── roomRoutes.js       # /api/rooms endpoints
│   │   │   └── bookingRoutes.js    # /api/bookings endpoints
│   │   └── server.js               # Express application setup, CORS & health checks
│   ├── test/
│   │   ├── test-suite.js           # 40+ automated HTTP & DB integration tests
│   │   ├── concurrency-test.js     # Multi-request capacity race condition test
│   │   └── test-runner.js          # Master test executor
│   ├── .env.example                # Backend environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js      # Axios instance with JWT interceptors & dynamic baseURL
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Synchronous authentication state & persistence
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Responsive navbar with user/admin badges
│   │   │   ├── RoomCard.jsx        # Room showcase card with dynamic availability
│   │   │   └── ProtectedRoute.jsx  # Route guard for authenticated & admin access
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Catalog with search, price, and date filters
│   │   │   ├── RoomDetails.jsx     # Suite details & calculated reservation sidebar
│   │   │   ├── Login.jsx           # Sign in with 1-click Demo credentials
│   │   │   ├── Signup.jsx          # Public guest registration
│   │   │   ├── MyBookings.jsx      # Guest's bookings list & cancellation
│   │   │   ├── AdminRooms.jsx      # Room inventory management modal
│   │   │   └── AdminBookings.jsx   # All reservations table & KPI summary
│   │   ├── App.jsx                 # Client-side router configuration
│   │   ├── index.css               # Design system & responsive styling
│   │   └── main.jsx
│   ├── vercel.json                 # SPA client-side routing fallback configuration
│   ├── .env.example                # Frontend environment template
│   └── package.json
├── .gitignore                      # Excludes .env, node_modules, dist, logs
├── .env.example                    # Root environment reference
├── vercel.json                     # Root full-stack deployment configuration
├── package.json                    # Root workspace & command runner
└── README.md
```

---

## 🗄️ Database Schema

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    price_per_night NUMERIC(10, 2) NOT NULL CHECK (price_per_night > 0),
    image_url TEXT NOT NULL,
    total_rooms INT NOT NULL DEFAULT 1 CHECK (total_rooms > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(room_id, check_in, check_out);
```

---

## ⚡ Local Development Setup

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **PostgreSQL** running locally on port `5432` (or a remote cloud database connection string)

### 2. Configure Environment Variables
Create `backend/.env` based on `backend/.env.example`:
```env
PORT=5000
PGUSER=postgres
PGHOST=localhost
PGPASSWORD=your_postgres_password
PGDATABASE=hotel_booking_db
PGPORT=5432
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

### 3. Database Initialization & Seeding
```bash
cd backend
npm install
npm run seed
```
> The seeder verifies table schema and inserts default accounts and luxury suites:
> - **Demo Admin:** `admin@hotel.com` / `admin123`
> - **Demo User:** `user@hotel.com` / `user123`
> *(Use `node src/db/seed.js --fresh` if you explicitly wish to reset all database data in development).*

### 4. Run the Automated Test Suite
```bash
cd backend
npm test
```
Executes all 40+ unit/integration assertions and simultaneous concurrency capacity stress tests.

### 5. Start Backend Server
```bash
cd backend
npm run dev
# Server running at http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 6. Start Frontend Server
In a second terminal:
```bash
cd frontend
npm install
npm run dev
# Vite dev server running at http://localhost:5173
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🌐 Production Deployment Guide

### Option A: Full-Stack Vercel Deployment (Recommended)
1. **Push Code to GitHub:**
   Ensure the repository is up to date on your GitHub branch.
2. **Import into Vercel:**
   - Link your GitHub repository `room-booking-system`.
   - Vercel will automatically detect `vercel.json` in the root.
3. **Configure Environment Variables in Vercel:**
   - `DATABASE_URL`: Your managed PostgreSQL connection string (from Neon, Supabase, or Render).
   - `JWT_SECRET`: A secure 32+ character random secret.
   - `JWT_EXPIRES_IN`: `7d`.
4. **Deploy:** Click **Deploy**. Vercel will build the frontend and serve both the SPA and serverless Express `/api` routes on the same domain with zero CORS issues!

### Option B: Separate Backend (Render / Railway) + Vercel Frontend
1. **Deploy Backend to Render or Railway:**
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL=https://your-frontend.vercel.app`
2. **Deploy Frontend to Vercel:**
   - Root directory: `frontend`
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variable: `VITE_API_URL=https://your-backend.onrender.com`

---

## 🔒 Security Best Practices Implemented

1. **Privilege Escalation Immunization:** Removed client role selectors; public registrations are strictly constrained to `user` role on both client and server.
2. **Row-Level Locking for Concurrency (`FOR UPDATE`):** Prevents double-booking race conditions during high-volume traffic.
3. **No Credential Exposure:** Passwords hashed with `bcryptjs` (10 rounds); credentials and secrets are excluded from Git via `.gitignore`.
4. **Sanitized Health Checks:** `/api/health` returns status without leaking connection strings or internal database errors.
5. **CORS Restrictions:** Configurable allowed origins preventing unauthorized cross-origin API abuse.

---

## ⚠️ Known Limitations
- Free-tier hosted databases (e.g., free Render Postgres or inactive Neon instances) may experience a brief cold-start latency (1-3 seconds) on the initial connection after a period of dormancy.
- In serverless environments, connection pooling is handled gracefully via `pg.Pool`, but dedicated high-concurrency production deployments benefit from connection poolers like PgBouncer.
