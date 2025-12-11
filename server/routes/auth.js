// server/routes/auth.js
// -------------------------------------------------------------
// Heart Track - Authentication Routes (Register + Login)
// -------------------------------------------------------------
//  Provides endpoints for user account creation and login.
//  Backed by MongoDB via the User model, using:
//    • bcryptjs for password hashing
//    • JWT (jsonwebtoken) for session tokens
//
//  Endpoints:
//    POST /api/auth/register
//        - Creates a new user (email/password/name)
//        - Hashes password using bcrypt
//        - Returns JWT + basic user info
//
//    POST /api/auth/login
//        - Validates user credentials
//        - Verifies hashed password
//        - Returns JWT + basic user info
//
//  JWT Notes:
//    • Payload includes: { sub: userId, email }
//    • Token lifetime: 7 days (suitable for course project)
//    • Secret read from process.env.JWT_SECRET or fallback
//
//  All responses avoid leaking sensitive details such as
//  whether the email exists or which part of login failed.
// -------------------------------------------------------------

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Helper: create JWT for a user document
function createToken(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
  };

  const secret = process.env.JWT_SECRET || 'dev-secret';

  // 7-day token is fine for this class project
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
// body: { email, password, name }
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name = '' } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in MongoDB
    const user = await User.create({ email, passwordHash, name });

    // Create a token (optional to return on register, but convenient)
    const token = createToken(user);

    return res.status(201).json({
      message: 'registered',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
// body: { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal which part is wrong → generic error
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
