'use strict';

require('./setupEnv');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const authService = require('../services/authService');
const mountRoutes = require('../routes/index');
const errorHandler = require('../middleware/errorHandler');
const { applyBodyParsers, createApiLimiter, LARGE_BODY_PATHS } = require('../middleware/requestLimits');

// What one request may make the server read: small bodies everywhere except the two
// routes that carry a game's cover image, and a cap on API requests per client address.

let server;
let baseUrl;
let token;

before(async () => {
  runMigration();
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, 'limits-user', 'x');
  token = authService.generateAccessToken({ id, username: 'limits-user', email: null, is_admin: 0 });

  const app = express();
  app.set('trust proxy', true);
  applyBodyParsers(app);
  app.use(cookieParser());
  app.use(['/api', '/webrtc'], createApiLimiter({ limit: 5, windowMs: 60 * 1000 }));
  mountRoutes(app);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

let ip = 0;
const send = (method, path, body, { from = `10.2.0.${++ip}`, auth = false } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': from,
      ...(auth ? { Cookie: `Authorization=${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test('a large body on an ordinary route is a 413', async () => {
  const res = await send('POST', '/api/user/login', { UserName: 'x', password: 'y'.repeat(200 * 1024) });

  assert.equal(res.status, 413);
  assert.ok((await res.json()).error);
});

test("a game's cover image may still be large", async () => {
  assert.ok(LARGE_BODY_PATHS.includes('/api/gamelist/addgame'));
  assert.ok(LARGE_BODY_PATHS.includes('/api/gamelist/updategame'));
  const image = `data:image/png;base64,${'A'.repeat(1024 * 1024)}`;

  const res = await send('POST', '/api/gamelist/addgame', { name: 'Big cover', image }, { auth: true });

  assert.equal(res.status, 201);
});

test('one address past the API limit gets 429; another address is unaffected', async () => {
  const from = '10.3.0.1';
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await send('GET', '/api/meta', undefined, { from })).status);

  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  assert.equal((await send('GET', '/api/meta', undefined, { from: '10.3.0.2' })).status, 200);
});

test('a limit of 0 turns the API limit off', async () => {
  const app = express();
  app.use(createApiLimiter({ limit: 0 }));
  app.get('/x', (_req, res) => res.sendStatus(200));
  const s = app.listen(0);
  await new Promise((resolve) => s.once('listening', resolve));
  try {
    for (let i = 0; i < 20; i++)
      assert.equal((await fetch(`http://127.0.0.1:${s.address().port}/x`)).status, 200);
  } finally {
    s.close();
  }
});
