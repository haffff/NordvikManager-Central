'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

// How much one request may make the server read, and how many API requests one client
// address may send. The address is req.ip, so TRUST_PROXY must match the proxies in front
// (config/trustProxy.js): with it wrong, every client counts as the proxy, sharing one limit.

/** Bodies are small everywhere but here: these carry a game's cover image (a data URL). */
const LARGE_BODY_PATHS = ['/api/gamelist/addgame', '/api/gamelist/updategame'];
const LARGE_BODY_LIMIT = '10mb';
const BODY_LIMIT = '100kb';

function applyBodyParsers(app) {
  // Parsed here first; the general parser below then leaves an already-read body alone.
  app.use(LARGE_BODY_PATHS, express.json({ limit: LARGE_BODY_LIMIT }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));
}

/**
 * At most `limit` requests per `windowMs` from one address; 0 turns it off. Meant to be
 * generous (people behind one router share an address), stopping floods, not normal use.
 */
function createApiLimiter({ limit, windowMs = 60 * 1000 }) {
  if (!limit) return (_req, _res, next) => next();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down' },
  });
}

module.exports = { applyBodyParsers, createApiLimiter, LARGE_BODY_PATHS, BODY_LIMIT };
