// server/middleware/errorHandler.js
// Central error handler for the API.
// Any thrown error or `next(err)` will end up here.

module.exports = function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({ error: message });
};
