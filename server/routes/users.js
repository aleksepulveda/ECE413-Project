// server/routes/users.js
// Routes for authenticated user profile management.
// - GET /api/users/me    → return current user profile
// - PUT /api/users/me    → update profile fields (name, password)
// Email is *not* editable.

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

/**
 * Helper to safely pick fields we expose to the frontend.
 */
function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * GET /api/users/me
 * Returns the current logged-in user's profile.
 *
 * Requires authMiddleware to have set req.user.id.
 */
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Not authenticated: missing user context' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: 'User not found for current token' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/me
 * Update profile fields for the current user.
 *
 * Body can include:
 *  - name: string
 *  - currentPassword: string (required if changing password)
 *  - newPassword: string (optional, to change password)
 *
 * Email is intentionally *not* updatable from here.
 */
router.put('/me', async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: 'Not authenticated: missing user context' });
    }

    const { name, currentPassword, newPassword } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ error: 'User not found for current token' });
    }

    // 1) Update name if provided (and not empty string only)
    if (typeof name === 'string') {
      user.name = name.trim();
    }

    // 2) Optional password change
    if (newPassword) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: 'currentPassword is required to change password' });
      }

      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Basic password strength check (you can enforce more if you want)
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: 'New password must be at least 8 characters long' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      user.passwordHash = newHash;
    }

    await user.save();

    return res.json({
      message: 'Profile updated',
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
