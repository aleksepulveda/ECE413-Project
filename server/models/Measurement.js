// server/models/Measurement.js
// -------------------------------------------------------------
// Heart Track - Measurement Model (Mongoose Schema)
// -------------------------------------------------------------
//  Represents a single physiological reading sent by a device.
//  Each measurement includes:
//    • deviceId   → string ID matching Device.deviceId
//    • heartRate  → beats per minute (BPM)
//    • spo2       → oxygen saturation percentage (SpO₂)
//    • takenAt    → timestamp of when the measurement occurred
//
//  The schema also automatically stores createdAt / updatedAt
//  for auditing and weekly/daily analytics.
// -------------------------------------------------------------
//  Example document:
//    {
//      deviceId: "PHOTON_ABC123",
//      heartRate: 72,
//      spo2: 98,
//      takenAt: "2025-11-17T20:05:00.000Z",
//      createdAt: "...",
//      updatedAt: "..."
//    }
// -------------------------------------------------------------

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