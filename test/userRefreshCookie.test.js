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

// The player client keeps its refresh token in an httpOnly cookie (refreshMode
// "cookie"), out of reach of page scripts. The body mode stays for the GM backend's
// server-to-server refresh and for frozen /client/p<N>/ builds.

let server;
let baseUrl;

before(async () => {
  runMigration();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)')
    .run(randomUUID(), 'cookie-user', authService.hashPassword('secret-pw'));

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  mountRoutes(app);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (path, body, cookie) =>
  fetch(`${baseUrl}/api/user/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body ?? {}),
  });

const refreshCookie = (res) => res.headers.getSetCookie().find((c) => c.startsWith('nm_refresh='));
const cookiePair = (setCookie) => setCookie.split(';')[0];

const login = (extra) => post('login', { UserName: 'cookie-user', password: 'secret-pw', ...extra });

test('cookie mode: login sets an httpOnly refresh cookie and leaves the token out of the body', async () => {
  const res = await login({ refreshMode: 'cookie' });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.ok(body.accessToken);
  assert.equal(body.refreshToken, undefined);
  const cookie = refreshCookie(res);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Path=\/api\/user/i);
});

test('body mode: login still returns the refresh token and sets no cookie', async () => {
  const res = await login();
  const body = await res.json();

  assert.ok(body.refreshToken);
  assert.equal(refreshCookie(res), undefined);
});

test('refresh reads the token from the cookie and rotates it', async () => {
  const first = cookiePair(refreshCookie(await login({ refreshMode: 'cookie' })));

  const res = await post('refresh', { refreshMode: 'cookie' }, first);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.ok(body.accessToken);
  assert.equal(body.refreshToken, undefined);
  const next = cookiePair(refreshCookie(res));
  assert.notEqual(next, first);

  // The old one was revoked by the rotation.
  assert.equal((await post('refresh', { refreshMode: 'cookie' }, first)).status, 401);
});

// A token that came from the cookie is always answered with a cookie: answering in
// the body would leave the revoked token in the cookie, and the next refresh would
// log the user out (a cross-site text/plain POST, which carries no refreshMode,
// could do that on purpose).
test('refresh from the cookie answers with a cookie even without refreshMode', async () => {
  const first = cookiePair(refreshCookie(await login({ refreshMode: 'cookie' })));

  const res = await fetch(`${baseUrl}/api/user/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', Cookie: first },
    body: 'x',
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.refreshToken, undefined);
  const next = refreshCookie(res);
  assert.ok(next);
  assert.equal((await post('refresh', { refreshMode: 'cookie' }, cookiePair(next))).status, 200);
});

test('refresh with a token in the body still answers with one in the body', async () => {
  const { refreshToken } = await (await login()).json();

  const res = await post('refresh', { refreshToken });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.ok(body.refreshToken);
  assert.notEqual(body.refreshToken, refreshToken);
});

test('refresh without any token is a 401', async () => {
  assert.equal((await post('refresh', {})).status, 401);
});

test('logout clears the refresh cookie', async () => {
  const loginRes = await login({ refreshMode: 'cookie' });
  const access = (await loginRes.json()).accessToken;

  const res = await fetch(`${baseUrl}/api/user/logout`, { headers: { Authorization: `Bearer ${access}` } });

  assert.equal(res.status, 200);
  assert.match(refreshCookie(res), /nm_refresh=;/);
});
