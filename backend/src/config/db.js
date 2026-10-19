const { Pool } = require('pg');
require('dotenv').config();

// Determine SSL options
const useSsl =
  process.env.PGSSL === 'true' ||
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.PGMAX_POOL || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'hotel_booking_db',
      password: process.env.PGPASSWORD || '1234',
      port: parseInt(process.env.PGPORT || '5432', 10),
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.PGMAX_POOL || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Safe error logging on idle clients without crashing the process
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client (will reconnect automatically):', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
