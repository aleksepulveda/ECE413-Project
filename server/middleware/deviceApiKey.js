// server/middleware/deviceApiKey.js
// -------------------------------------------------------------
// Device API Key Middleware
// -------------------------------------------------------------
// Purpose:
//  - Protects the IoT ingestion endpoint: POST /api/measurements/device
//  - Requires an API key in the `x-api-key` header
//  - Compares against process.env.DEVICE_API_KEY (or a dev default)
// -------------------------------------------------------------

module.exports = function deviceApiKeyMiddleware(req, res, next) {
  // Read key from header
  const apiKeyFromHeader = req.header('x-api-key');

  // Expected key (configure in .env as DEVICE_API_KEY)
  const expectedKey = process.env.DEVICE_API_KEY || 'dev-device-key';

  if (!apiKeyFromHeader) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  if (apiKeyFromHeader !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // OK → allow request to proceed
  return next();
};
