// server/routes/measurements.js
// -------------------------------------------------------------
// Heart Track - Measurement Ingestion & Analytics Routes
// -------------------------------------------------------------
//  Responsible for storing, retrieving, and aggregating heart-
//  rate (BPM) and SpO₂ (%) measurements sent by IoT devices.
//
//  Supports two payload styles for POST /api/measurements/device:
//    1) JSON with explicit fields:
//         { deviceId, heartRate, spo2, takenAt }
//    2) Particle event style:
//         {
//           coreid: "...",
//           data: "73.462433,83.450096",
//           published_at: "..."
//         }
// -------------------------------------------------------------

const express = require('express');
const router = express.Router();

const Measurement = require('../models/Measurement');
const Device = require('../models/Device'); // currently unused but fine
const deviceApiKey = require('../middleware/deviceApiKey');

// -------------------------------------------------------------------
// Helper: parse heartRate/spo2 from body
// -------------------------------------------------------------------
function extractHeartRateAndSpo2(body) {
  const { heartRate, spo2, data } = body || {};

  let hrNum = Number.isFinite(Number(heartRate))
    ? Number(heartRate)
    : NaN;
  let spo2Num = Number.isFinite(Number(spo2))
    ? Number(spo2)
    : NaN;

  // If both parsed fine, we’re done.
  if (Number.isFinite(hrNum) && Number.isFinite(spo2Num)) {
    return { hrNum, spo2Num };
  }

  // Otherwise, try to parse from `data: "HR,SPO2"` if present
  if (typeof data === 'string') {
    const parts = data.split(',');
    if (parts.length >= 2) {
      const parsedHr = Number(parts[0].trim());
      const parsedSpo2 = Number(parts[1].trim());

      if (Number.isFinite(parsedHr) && Number.isFinite(parsedSpo2)) {
        return { hrNum: parsedHr, spo2Num: parsedSpo2 };
      }
    }
  }

  // Still not valid
  return { hrNum: NaN, spo2Num: NaN };
}

// -------------------------------------------------------------------
// POST /api/measurements/device
//  -> Endpoint your Photon / Postman uses to push a single reading.
// Body examples:
//
// 1) JSON (Postman / custom client):
//  {
//    "deviceId": "PHOTON_123ABC",
//    "heartRate": 75,
//    "spo2": 98,
//    "takenAt": "2025-12-06T00:36:19.006Z"   // optional
//  }
//
// 2) Particle event forwarded by webhook:
//  {
//    "coreid": "0a10aced202194944a064ed4",
//    "data": "73.462433,83.450096",
//    "published_at": "2025-12-12T00:41:02.223Z"
//  }
// -------------------------------------------------------------------
router.post('/device', deviceApiKey, async (req, res, next) => {
  try {
    const body = req.body || {};

    // Device identifier:
    // Prefer explicit deviceId, otherwise fall back to coreid.
    let { deviceId, takenAt } = body;
    const { coreid, published_at } = body;

    if (!deviceId && coreid) {
      deviceId = coreid; // allow Photon coreid as deviceId
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId (or coreid) is required' });
    }

    // Try to extract numeric HR / SpO2
    const { hrNum, spo2Num } = extractHeartRateAndSpo2(body);

    if (!Number.isFinite(hrNum) || !Number.isFinite(spo2Num)) {
      return res.status(400).json({
        error: 'heartRate and spo2 must be numeric values (or parsable from data "HR,SPO2")'
      });
    }

    // Round to nearest integer for storage
    const hrRounded = Math.round(hrNum);
    const spo2Rounded = Math.round(spo2Num);

    // Choose timestamp: explicit takenAt > published_at > now
    let effectiveTakenAt = new Date();
    if (takenAt) {
      effectiveTakenAt = new Date(takenAt);
    } else if (published_at) {
      effectiveTakenAt = new Date(published_at);
    }

    const measurement = await Measurement.create({
      deviceId: String(deviceId),
      heartRate: hrRounded,
      spo2: spo2Rounded,
      takenAt: effectiveTakenAt
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
