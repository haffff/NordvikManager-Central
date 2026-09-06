'use strict';

const authService = require('../services/authService');

function auth(req, res, next) {
  // Browser clients (React frontend) rely on the HttpOnly cookie set at login.
  // Non-browser/server-to-server clients (e.g. the wasm GM backend) can't read
  // or set that cookie at all — Set-Cookie is unreadable and Cookie is a
  // forbidden request header under fetch() — so accept a standard
  // Authorization: Bearer <token> header as an equivalent alternative.
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies['Authorization'] || bearerToken;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = authService.verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
}

module.exports = auth;
