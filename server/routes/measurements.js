// server/routes/measurements.js
// -------------------------------------------------------------
// Heart Track - Measurement Ingestion & Analytics Routes
// -------------------------------------------------------------
//  Responsible for storing, retrieving, and aggregating heart-
//  rate (BPM) and SpO₂ (%) measurements sent by IoT devices.
//
//  Endpoints:
//
//   POST /api/measurements/device
//      • Used by Particle Photon or Postman to push a single
//        reading.
//      • Body:
//          {
//            deviceId: "PHOTON_123ABC",
//            heartRate: 75,
//            spo2: 98,
//            takenAt: "2025-12-06T00:36:19.006Z"  // optional
//          }
//      • Creates a Measurement document.
//      • Does NOT require user authentication because devices
//        cannot log in; they authenticate only via deviceId.
//
//   GET /api/measurements
//      • Returns up to the 500 most recent measurements.
//      • Used by the Dashboard to draw tables and charts.
//      • No filtering performed here; frontend filters by date.
//
//   GET /api/measurements/weekly
//      • Computes analytics for the *last 7 days*:
//           - Average HR / SpO₂
//           - Min/Max HR
//           - Count per day
//           - Active device count
//      • Returns:
//          {
//            averageHeartRate,
//            averageSpO2,
//            totalMeasurements,
//            activeDevices,
//            daily: [
//              {
//                date: "2025-12-01",
//                avgHeartRate,
//                avgSpO2,
//                minHeartRate,
//                maxHeartRate,
//                count
//              },
//              ...
//            ]
//          }
//      • Used by Weekly Summary page.
//
//  Notes:
//    • Measurement documents store:
//        { deviceId, heartRate, spo2, takenAt }
//    • takenAt defaults to server timestamp if omitted.
//    • Weekly aggregation uses MongoDB $group + $dateToString.
// -------------------------------------------------------------

const express = require('express');
const router = express.Router();

const Measurement = require('../models/Measurement');
const Device = require('../models/Device');
const deviceApiKey = require('../middleware/deviceApiKey');

// -------------------------------------------------------------------
// POST /api/measurements/device
//  -> Endpoint your Photon / Postman uses to push a single reading.
// Body:
//  {
//    "deviceId": "PHOTON_123ABC",
//    "heartRate": 75,
//    "spo2": 98,
//    "takenAt": "2025-12-06T00:36:19.006Z"   // optional, defaults to now
//  }
// -------------------------------------------------------------------
router.post('/device', deviceApiKey, async (req, res, next) => {
  try {
    const { deviceId, heartRate, spo2, takenAt } = req.body;

    if (!deviceId || !heartRate || !spo2) {
      return res.status(400).json({
        error: 'deviceId, heartRate, and spo2 are required'
      });
    }

    const measurement = await Measurement.create({
      deviceId,
      heartRate,
      spo2,
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
//   "daily": [
//     {
//       "date": "2025-12-01",
//       "avgHeartRate": 70,
//       "avgSpO2": 98,
//       "minHeartRate": 60,
//       "maxHeartRate": 85,
//       "count": 8
//     },
//     ...
//   ]
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
