// server/routes/devices.js
// -------------------------------------------------------------
// Heart Track - Device Management Routes
// -------------------------------------------------------------
//  Handles registration and retrieval of IoT devices associated
//  with a logged-in user. Uses the Device MongoDB model.
//
//  Authentication:
//    • All routes require authMiddleware
//    • req.user.id is populated from the verified JWT
//
//  Endpoints:
//    GET /api/devices
//        - Returns all devices owned by the authenticated user
//        - Sorted by creation time (oldest → newest)
//
//    POST /api/devices
//        - Registers a new device to the user
//        - Body: { name, deviceId }
//        - Ensures deviceId is unique across the entire system
//        - Stores userId from req.user.id
//
//  Device Schema Summary:
//    {
//      userId: ObjectId (owner),
//      name: "Bedroom Sensor",
//      deviceId: "PHOTON_ABC123",
//      active: true,
//      createdAt / updatedAt auto-generated
//    }
// -------------------------------------------------------------

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

/**
 * DELETE /api/devices/:id
 * Remove a device owned by the logged-in user.
 * :id is the MongoDB _id of the Device document.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Device.findOneAndDelete({
      _id: id,
      userId: req.user.id, // ensure you can only delete your own device
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Device not found for this user' });
    }

    return res.json({
      message: 'Device removed successfully',
      device: deleted,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
