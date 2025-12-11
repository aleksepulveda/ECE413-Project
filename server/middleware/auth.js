// server/middleware/auth.js
// -------------------------------------------------------------
// Heart Track - Authentication Middleware (JWT Protected Routes)
// -------------------------------------------------------------
//  • Extracts the JWT from the "Authorization" header (Bearer token).
//  • Verifies the token using process.env.JWT_SECRET (fallback provided).
//  • On success, attaches user info (id + email) to req.user.
//  • On failure, responds with 401 Unauthorized.
// -------------------------------------------------------------
//  Used by protected routes such as:
//    - /api/devices
//    - /api/measurements
//    - /api/users/profile
// -------------------------------------------------------------

const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const header = req.header('Authorization') || '';

  // Expect header like: "Bearer eyJhbGciOi..."
  const token = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);

    // We’ll store the user id + email on the request object
    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    return next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
