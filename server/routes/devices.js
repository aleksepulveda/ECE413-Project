// server/routes/devices.js
// Routes for registering and listing Heart Track devices for a user.

const express = require('express');
const Device = require('../models/Device');

const router = express.Router();

/**
 * GET /api/devices
 * Return all devices that belong to the logged-in user.
 * Requires authMiddleware to have set req.user.id.
 */
router.get('/', async (req, res, next) => {
  try {
    const devices = await Device.find({ userId: req.user.id }).sort('createdAt');
    return res.json(devices);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/devices
 * Register a new device for this user.
 * body: { name, deviceId }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, deviceId } = req.body || {};

    if (!name || !deviceId) {
      return res.status(400).json({ error: 'name and deviceId are required' });
    }

    // Prevent duplicate deviceId in the whole system
    const existing = await Device.findOne({ deviceId });
    if (existing) {
      return res.status(400).json({ error: 'This deviceId is already registered' });
    }

    const device = await Device.create({
      userId: req.user.id, // comes from authMiddleware
      name,
      deviceId,
      active: true,
    });

    return res.status(201).json(device);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
