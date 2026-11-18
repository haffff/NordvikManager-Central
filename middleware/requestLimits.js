'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../logger');

// How much one request may make the server read, and how many API requests one client
// address may send. The address is req.ip, so TRUST_PROXY must match the proxies in front
// (config/trustProxy.js): with it wrong, every client counts as the proxy, sharing one limit.

/**
 * Bodies are small everywhere but here: these carry a game's cover image (a data URL).
 * Their body is read by `largeBody` inside the route, after `auth`, so only a logged-in
 * user can make the server read that much.
 */
const LARGE_BODY_PATHS = ['/api/gamelist/addgame', '/api/gamelist/updategame'];
const LARGE_BODY_LIMIT = '10mb';
const BODY_LIMIT = '100kb';

const largeBody = express.json({ limit: LARGE_BODY_LIMIT });

const isLargeBodyPath = (req) => LARGE_BODY_PATHS.includes(req.path.toLowerCase().replace(/\/+$/, ''));
const unlessLargeBodyPath = (parser) => (req, res, next) => (isLargeBodyPath(req) ? next() : parser(req, res, next));

/**
 * The request limit first, so a client over it costs no body parsing, then the small-body
 * parsers. Used by index.js and the tests alike.
 */
function applyRequestLimits(app, { apiRateLimit }) {
  app.use(['/api', '/webrtc'], createApiLimiter({ limit: apiRateLimit }));
  app.use(unlessLargeBodyPath(express.json({ limit: BODY_LIMIT })));
  app.use(unlessLargeBodyPath(express.urlencoded({ extended: false, limit: BODY_LIMIT })));
}

/**
 * At most `limit` requests per `windowMs` from one address; 0 turns it off. Meant to be
 * generous (people behind one router share an address), stopping floods, not normal use.
 */
function createApiLimiter({ limit, windowMs = 60 * 1000 }) {
  if (!limit) return (_req, _res, next) => next();
  let warnedUnknown = false;
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // No client address (e.g. a unix socket with TRUST_PROXY not trusting it): rather than
    // every client sharing one limit, the request isn't limited, and the setting is named.
    skip: (req) => {
      if (req.ip) return false;
      if (!warnedUnknown) {
        warnedUnknown = true;
        logger.warn('No client address for a request: the API request limit is not applied (check TRUST_PROXY)');
      }
      return true;
    },
    validate: { ip: false },
    message: { error: 'Too many requests, please slow down' },
  });
}

module.exports = { applyRequestLimits, createApiLimiter, largeBody, LARGE_BODY_PATHS, BODY_LIMIT };
