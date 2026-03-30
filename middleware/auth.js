'use strict';

const authService = require('../services/authService');

function auth(req, res, next) {
  const token = req.cookies['Authorization'];
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
