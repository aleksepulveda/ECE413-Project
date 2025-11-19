// server/models/Device.js
// Each Heart Track device registered by a user.

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