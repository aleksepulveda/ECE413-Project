// server/routes/measurements.js
// -------------------------------------------------------------
// Heart Track - Measurement Ingestion & Analytics Routes
// -------------------------------------------------------------
//  Responsible for storing, retrieving, and aggregating heart-
//  rate (BPM) and SpO₂ (%) measurements sent by IoT devices.
// -------------------------------------------------------------

const express = require('express');
const router = express.Router();

const Measurement = require('../models/Measurement');
const Device = require('../models/Device'); // (currently unused, but fine)
const deviceApiKey = require('../middleware/deviceApiKey');

// -------------------------------------------------------------------
// POST /api/measurements/device
//  -> Endpoint your Photon / Postman uses to push a single reading.
// Body:
//  {
//    "deviceId": "PHOTON_123ABC",
//    "heartRate": 75.0,        // can be float or string "75.0"
//    "spo2": 98.5,             // can be float or string "98.5"
//    "takenAt": "2025-12-06T00:36:19.006Z"   // optional, defaults to now
//  }
// -------------------------------------------------------------------
router.post('/device', deviceApiKey, async (req, res, next) => {
  try {
    const { deviceId, heartRate, spo2, takenAt } = req.body || {};

    // Basic presence checks (allow 0 but not null/undefined)
    if (deviceId == null) {
      return res.status(400).json({ error: 'deviceId is required' });
    }
    if (heartRate == null) {
      return res.status(400).json({ error: 'heartRate is required' });
    }
    if (spo2 == null) {
      return res.status(400).json({ error: 'spo2 is required' });
    }

    // Convert to numbers in case they arrive as strings like "75.0"
    const hrNum = Number(heartRate);
    const spo2Num = Number(spo2);

    if (!Number.isFinite(hrNum) || !Number.isFinite(spo2Num)) {
      return res.status(400).json({
        error: 'heartRate and spo2 must be numeric values'
      });
    }

    // Round to nearest integer for storage
    const hrRounded = Math.round(hrNum);
    const spo2Rounded = Math.round(spo2Num);

    const measurement = await Measurement.create({
      deviceId: String(deviceId),
      heartRate: hrRounded,
      spo2: spo2Rounded,
      takenAt: takenAt ? new Date(takenAt) : new Date()
    });

    return res.status(201).json(measurement);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// GET /api/measurements
//  -> Simple "dump everything" endpoint used by the dashboard.
// -------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const measurements = await Measurement.find({})
      .sort({ takenAt: -1 })
      .limit(500);

    res.json(measurements);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------------
// GET /api/measurements/weekly
//
// Returns a summary for the *last 7 days* (including today).
// Response shape:
//
// {
//   "averageHeartRate": 73,
//   "averageSpO2": 98,
//   "totalMeasurements": 42,
//   "activeDevices": 2,
//   "daily": [ ... ]
// }
// -------------------------------------------------------------------
router.get('/weekly', async (req, res, next) => {
  try {
    const now = new Date();

    // start = 6 days ago at 00:00, end = today 23:59:59
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    // Aggregate by day (using takenAt)
    const raw = await Measurement.aggregate([
      {
        $match: {
          takenAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$takenAt' }
          },
          avgHeartRate: { $avg: '$heartRate' },
          avgSpO2: { $avg: '$spo2' },
          minHeartRate: { $min: '$heartRate' },
          maxHeartRate: { $max: '$heartRate' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const bucketsByDate = new Map();
    raw.forEach(b => bucketsByDate.set(b._id, b));

    const daily = [];
    let totalHr = 0;
    let totalSpO2 = 0;
    let totalCount = 0;

    // Build a continuous 7-day window, even if some days have no data
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const bucket = bucketsByDate.get(dateKey);

      if (bucket) {
        const { avgHeartRate, avgSpO2, minHeartRate, maxHeartRate, count } =
          bucket;

        daily.push({
          date: dateKey,
          avgHeartRate: Math.round(avgHeartRate),
          avgSpO2: Math.round(avgSpO2),
          minHeartRate,
          maxHeartRate,
          count
        });

        totalHr += avgHeartRate * count;
        totalSpO2 += avgSpO2 * count;
        totalCount += count;
      } else {
        daily.push({
          date: dateKey,
          avgHeartRate: null,
          avgSpO2: null,
          minHeartRate: null,
          maxHeartRate: null,
          count: 0
        });
      }
    }

    const [activeDevicesCount] = await Promise.all([
      Measurement.distinct('deviceId', {
        takenAt: { $gte: start, $lte: end }
      }).then(ids => ids.length)
    ]);

    const summary = {
      averageHeartRate: totalCount ? Math.round(totalHr / totalCount) : null,
      averageSpO2: totalCount ? Math.round(totalSpO2 / totalCount) : null,
      totalMeasurements: totalCount,
      activeDevices: activeDevicesCount,
      daily
    };

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
