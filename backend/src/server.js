const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting production CLIENT_URL / ALLOWED_ORIGINS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : process.env.CLIENT_URL
  ? [process.env.CLIENT_URL.trim()]
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // In development or when origin is omitted (curl, server-to-server), allow request
      if (!origin || !allowedOrigins || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// API Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await db.query('SELECT NOW()');
    return res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database_connected: true,
      service: 'hotel-booking-backend',
      version: '1.0.0',
    });
  } catch (error) {
    // Log internal error safely on the server without exposing secrets or credentials to public clients
    console.error('Health check database connection failure:', error.message);
    return res.status(503).json({
      status: 'Degraded',
      timestamp: new Date().toISOString(),
      database_connected: false,
      message: 'Database connection unavailable.',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload provided.' });
  }
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Start Server when invoked directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🏨 Hotel Booking API Server running on port ${PORT}`);
    console.log(`👉 Health check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

module.exports = app;
