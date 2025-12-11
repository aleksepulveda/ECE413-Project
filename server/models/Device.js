// server/models/Device.js
// -------------------------------------------------------------
// Heart Track - Device Model (Mongoose Schema)
// -------------------------------------------------------------
//  Represents a registered hardware device (e.g., Particle Photon)
//  belonging to a user. Each device has:
//    • userId     → owner (MongoDB ObjectId of User)
//    • name       → human-readable label ("Bedroom Sensor")
//    • deviceId   → unique hardware ID sent by the IoT device
//    • active     → whether the device is currently enabled
//
//  Automatically manages createdAt / updatedAt timestamps.
// -------------------------------------------------------------
//  Example stored document:
//    {
//      _id: "...",
//      userId: "ObjectId(...)",
//      name: "Photon #1",
//      deviceId: "PHOTON_ABC123",
//      active: true,
//      createdAt: "...",
//      updatedAt: "..."
//    }
// -------------------------------------------------------------

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      // Reference to the User who owns this device.
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      // Friendly name shown in the UI: "Bedroom Sensor"
      type: String,
      required: true
    },
    deviceId: {
      // Unique ID that the Photon will send with its data
      type: String,
      required: true,
      unique: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Device', deviceSchema);

/*
// Now a device will look like:
{
  "userId": "ObjectId of owner",
  "name": "Photon #1",
  "deviceId": "PHOTON_ABC123",
  "active": true
}
*/