'use strict';

const crypto = require('crypto');

// Time-limited TURN credentials in coturn's "use-auth-secret" (TURN REST API) scheme:
// username = "<expiry unix seconds>:<userId>", credential = base64(HMAC-SHA1(secret, username)).
// coturn recomputes the HMAC with its static-auth-secret, so it needs no user database.
function createTurnCredentials({ secret, userId, ttlSeconds, nowMs = Date.now() }) {
  const expiry = Math.floor(nowMs / 1000) + ttlSeconds;
  const username = `${expiry}:${userId}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  return { username, credential, ttl: ttlSeconds };
}

// Builds an RTCIceServer[] that browsers (and the GM backend) can use as-is.
// TURN is included only when both URLs and the shared secret are configured.
function buildIceServers({ stunServers, turn, userId, nowMs = Date.now() }) {
  const iceServers = [];
  if (stunServers.length) iceServers.push({ urls: stunServers });

  if (!turn.urls.length || !turn.secret) return { iceServers, ttl: null };

  const { username, credential, ttl } = createTurnCredentials({
    secret: turn.secret,
    userId,
    ttlSeconds: turn.ttlSeconds,
    nowMs,
  });
  iceServers.push({ urls: turn.urls, username, credential });
  return { iceServers, ttl };
}

module.exports = { createTurnCredentials, buildIceServers };
