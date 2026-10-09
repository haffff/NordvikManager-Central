'use strict';

require('./setupEnv');
process.env.STUN_SERVERS = 'stun:stun.example.com:19302';
process.env.TURN_URLS = 'turn:turn.example.com:3478?transport=udp, turns:turn.example.com:5349?transport=tcp';
process.env.TURN_SECRET = 'test-turn-secret';
process.env.TURN_TTL_SECONDS = '3600';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createTurnCredentials, buildIceServers } = require('../services/iceServers');
const authService = require('../services/authService');
const mountRoutes = require('../routes/index');

test('createTurnCredentials follows the coturn use-auth-secret scheme', () => {
  const nowMs = Date.UTC(2026, 0, 1);
  const creds = createTurnCredentials({ secret: 's3cret', userId: 'user-1', ttlSeconds: 600, nowMs });

  const expiry = nowMs / 1000 + 600;
  assert.equal(creds.username, `${expiry}:user-1`);
  assert.equal(creds.credential, crypto.createHmac('sha1', 's3cret').update(`${expiry}:user-1`).digest('base64'));
  assert.equal(creds.ttl, 600);
});

test('createTurnCredentials matches a known coturn credential', () => {
  // Precomputed: HMAC-SHA1("s3cret", "1767226200:user-1"), base64.
  const creds = createTurnCredentials({ secret: 's3cret', userId: 'user-1', ttlSeconds: 600, nowMs: 1767225600000 });
  assert.equal(creds.username, '1767226200:user-1');
  assert.equal(creds.credential, 'SoCdqmtDkxsG9YJkKC79cYs7rO8=');
});

test('buildIceServers returns STUN plus a credentialed TURN entry', () => {
  const result = buildIceServers({
    stunServers: ['stun:a:1'],
    turn: { urls: ['turn:t:3478'], secret: 'x', ttlSeconds: 60 },
    userId: 'u',
    nowMs: 0,
  });
  assert.equal(result.iceServers.length, 2);
  assert.deepEqual(result.iceServers[0], { urls: ['stun:a:1'] });
  assert.deepEqual(result.iceServers[1].urls, ['turn:t:3478']);
  assert.equal(result.iceServers[1].username, '60:u');
  assert.ok(result.iceServers[1].credential);
  assert.equal(result.ttl, 60);
});

test('buildIceServers is STUN only when TURN is not configured', () => {
  for (const turn of [{ urls: [], secret: 'x', ttlSeconds: 60 }, { urls: ['turn:t'], secret: null, ttlSeconds: 60 }]) {
    const result = buildIceServers({ stunServers: ['stun:a:1'], turn, userId: 'u', nowMs: 0 });
    assert.deepEqual(result, { iceServers: [{ urls: ['stun:a:1'] }], ttl: null });
  }
});

test('buildIceServers omits the STUN entry when there are no STUN servers', () => {
  const result = buildIceServers({ stunServers: [], turn: { urls: [], secret: null, ttlSeconds: 60 }, userId: 'u', nowMs: 0 });
  assert.deepEqual(result.iceServers, []);
});

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(cookieParser());
  mountRoutes(app);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('GET /api/ice-servers requires authentication', async () => {
  const res = await fetch(`${baseUrl}/api/ice-servers`);
  assert.equal(res.status, 401);
});

test('GET /api/ice-servers returns credentials for the caller', async () => {
  const token = authService.generateAccessToken({ id: 'user-42', username: 'u', email: null, is_admin: 0 });
  const res = await fetch(`${baseUrl}/api/ice-servers`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');

  const body = await res.json();
  assert.equal(body.ttl, 3600);
  assert.deepEqual(body.iceServers[0], { urls: ['stun:stun.example.com:19302'] });
  const turn = body.iceServers[1];
  assert.deepEqual(turn.urls, ['turn:turn.example.com:3478?transport=udp', 'turns:turn.example.com:5349?transport=tcp']);
  assert.match(turn.username, /^\d+:user-42$/);
  assert.equal(turn.credential, crypto.createHmac('sha1', 'test-turn-secret').update(turn.username).digest('base64'));
});

test('GET /api/meta never exposes TURN details', async () => {
  const res = await fetch(`${baseUrl}/api/meta`);
  const body = await res.json();
  assert.equal('turnServer' in body, false);
  assert.deepEqual(body.stunServers, ['stun:stun.example.com:19302']);
});
