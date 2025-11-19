// server/routes/measurements.js
// Store and retrieve heart rate + SpO2 measurements.

const express = require('express');
const Measurement = require('../models/Measurement');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/measurements/device
 *
 * Endpoint for the IoT device (Photon).
 * Auth: simple API key in the X-API-Key header.
 *
 * Body JSON:
 * {
 *   "deviceId": "PHOTON_123ABC",
 *   "heartRate": 72,
 *   "spo2": 98,
 *   "takenAt": "2025-11-18T03:14:00Z"  // optional
 * }
 */
router.post('/device', async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key') || req.header('x-api-key');
    const expected = process.env.IOT_API_KEY || 'dev-device-key-123';

    if (!apiKey || apiKey !== expected) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { deviceId, heartRate, spo2, takenAt } = req.body || {};

    if (!deviceId || heartRate == null || spo2 == null) {
      return res
        .status(400)
        .json({ error: 'deviceId, heartRate, and spo2 are required' });
    }

    // Optional: ensure device exists (so random IDs can’t post)
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(400).json({ error: 'Unknown deviceId' });
    }

    const measurement = await Measurement.create({
      deviceId,
      heartRate,
      spo2,
      takenAt: takenAt ? new Date(takenAt) : new Date(),
    });

    return res.status(201).json(measurement);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/measurements
 *
 * Get recent measurements for the logged-in user across all their devices.
 * Auth: JWT (via authMiddleware).
 *
 * Optional query: ?limit=50  (default 100)
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

    // Step 1: find all devices owned by this user
    const devices = await Device.find({ userId: req.user.id });
    const deviceIds = devices.map((d) => d.deviceId);

    if (deviceIds.length === 0) {
      return res.json([]); // no devices → no measurements
    }

    // Step 2: find measurements for those deviceIds
    const measurements = await Measurement.find({
      deviceId: { $in: deviceIds },
    })
      .sort({ takenAt: -1 }) // newest first
      .limit(limit);

    return res.json(measurements);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
