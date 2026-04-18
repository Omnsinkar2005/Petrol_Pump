/**
 * 404 handler — used for any route that doesn't match.
 */
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Centralized error handler.
 * Any `next(err)` call or thrown async error lands here.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  // Keep a readable log in the server console
  console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`);
  if (status >= 500) console.error(err.stack);

  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
