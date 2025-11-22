/**
 * Heart Track - Server Entry Point
 * Express.js server for the Heart Track application
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Database connection helper
const connectDB = require('./config/database');

// Import routes (we'll flesh these out next)
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const measurementRoutes = require('./routes/measurements');
const userRoutes = require('./routes/users');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────
// Security middleware
// ──────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting for API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// ──────────────────────────────────────────────
// API Routes (we'll turn these on as we implement them)
// ──────────────────────────────────────────────

// For now, you can leave them commented until each file is ready.
// Once a route file is implemented, uncomment its line.

app.use('/api/auth', authRoutes);
app.use('/api/devices', authMiddleware, deviceRoutes);
// Note: /api/measurements has mixed auth - some routes use JWT, some use API key
// So we apply auth inside the route handlers, not globally here
app.use('/api/measurements', measurementRoutes);
// app.use('/api/users', authMiddleware, userRoutes);

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler (last)
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start server AFTER DB connects
// ──────────────────────────────────────────────
async function start() {
  try {
    await connectDB(); // uses server/config/database.js
    app.listen(PORT, () => {
      console.log(`Heart Track server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
