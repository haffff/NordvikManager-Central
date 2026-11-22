'use strict';

const logger = require('../logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  // A client's own mistake (a body too large) or a busy server is expected, not a fault.
  if (status >= 500 && status !== 503) logger.error(err);
  else logger.warn(`${req.method} ${req.originalUrl} → ${status}: ${err.message}`);

  // Errors meant for the client (body-parser's 413, the password checks' 503) keep their
  // message; anything else is hidden in production.
  const message = err.expose || process.env.NODE_ENV !== 'production' ? err.message : 'Internal server error';
  if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
