// server/models/Measurement.js
// Single measurement from a device: heart rate + SpO2 at a point in time.

const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
  {
    deviceId: {
      // Matches Device.deviceId (string), not ObjectId
      type: String,
      required: true
    },
    heartRate: {
      type: Number,
      required: true
    },
    spo2: {
      type: Number,
      required: true
    },
    takenAt: {
      // When the reading was taken (from device or server time)
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Measurement', measurementSchema);

/*
// Now each measurement will look like:
{
  "deviceId": "PHOTON_ABC123",
  "heartRate": 72,
  "spo2": 98,
  "takenAt": "2025-11-17T20:05:00.000Z"
}
*/