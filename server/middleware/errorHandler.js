// server/middleware/errorHandler.js
// -------------------------------------------------------------
// Heart Track - Global Error Handling Middleware
// -------------------------------------------------------------
//  • Catches any error passed via next(err) or thrown in routes.
//  • Logs the error server-side for debugging.
//  • Sends a JSON response with:
//        { error: <message> }
//    using `err.status` if provided, otherwise HTTP 500.
// -------------------------------------------------------------
//  This ensures consistent API error responses across:
//    - Auth routes
//    - Device routes
//    - Measurement routes
// -------------------------------------------------------------

module.exports = function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
};
