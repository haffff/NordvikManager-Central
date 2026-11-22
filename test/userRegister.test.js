'use strict';

require('./setupEnv');
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const authService = require('../services/authService');
const inviteService = require('../services/inviteService');
const passwords = require('../services/passwords');
const mountRoutes = require('../routes/index');
const errorHandler = require('../middleware/errorHandler');

// Registration and login with the password hashed asynchronously. A request now waits
// partway through, so two registrations can overlap: the invite's uses and the unique
// username/email must still hold, and a code that is wrong costs no hash at all.

let server;
let baseUrl;
let adminId;
let ip = 0;

before(async () => {
  runMigration();
  adminId = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash, is_admin) VALUES (?, ?, ?, 1)')
    .run(adminId, 'reg-admin', await authService.hashPassword('admin-pw'));

  const app = express();
  // Each request gets its own address, so the per-IP register limit stays out of the way.
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(cookieParser());
  mountRoutes(app);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  process.env.NO_INVITATION = 'false';
});

const post = (path, body) =>
  fetch(`${baseUrl}/api/user/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.1.${Math.floor(++ip / 250)}.${ip % 250}` },
    body: JSON.stringify(body),
  });

const register = (UserName, inviteCode, extra = {}) =>
  post('register', { UserName, password: 'secret-pw', confirmPassword: 'secret-pw', inviteCode, ...extra });

test('a one-use invite registers one account, however many try at once', async () => {
  const code = inviteService.generateInvite(adminId, 24, 1);

  const results = await Promise.all([register('race_a', code), register('race_b', code), register('race_c', code)]);

  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400, 400]);
});

test('two registrations of one username: one account, the other 409', async () => {
  const code = inviteService.generateInvite(adminId, 24, 5);

  const results = await Promise.all([register('same_name', code), register('Same_Name', code)]);

  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users WHERE username = 'same_name' COLLATE NOCASE").get();
  assert.equal(count, 1);
});

test('an email already in use is a 409, not a server error', async () => {
  const code = inviteService.generateInvite(adminId, 24, 5);
  assert.equal((await register('mail_one', code, { email: 'dup@example.com' })).status, 201);

  const res = await register('mail_two', code, { email: 'dup@example.com' });

  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /email/i);
});

test('a wrong invite code or a taken username costs no password hash', async () => {
  const code = inviteService.generateInvite(adminId, 24, 5);
  assert.equal((await register('taken_name', code)).status, 201);
  const original = authService.hashPassword;
  let hashed = 0;
  authService.hashPassword = (...args) => { hashed++; return original(...args); };
  try {
    assert.equal((await register('someone', 'not-a-code')).status, 400);
    assert.equal((await register('taken_name', code)).status, 409);
  } finally {
    authService.hashPassword = original;
  }
  assert.equal(hashed, 0);
});

test('without invitations, registering still works', async () => {
  process.env.NO_INVITATION = 'true';

  assert.equal((await register('open_user', undefined)).status, 201);
});

test('login: right password 200, wrong 401, unknown user 401', async () => {
  assert.equal((await post('login', { UserName: 'reg-admin', password: 'admin-pw' })).status, 200);
  assert.equal((await post('login', { UserName: 'reg-admin', password: 'nope' })).status, 401);
  assert.equal((await post('login', { UserName: 'nobody_here', password: 'nope' })).status, 401);
});

test('while every password check is taken, login and register answer 503 at once', async () => {
  const code = inviteService.generateInvite(adminId, 24, 5);
  const running = Array.from({ length: passwords.MAX_RUNNING }, () => passwords.hash('pw', 12));
  try {
    const login = await post('login', { UserName: 'reg-admin', password: 'admin-pw' });
    const reg = await register('busy_user', code);

    assert.equal(login.status, 503);
    assert.ok(login.headers.get('retry-after'));
    assert.equal(reg.status, 503);
  } finally {
    await Promise.all(running);
  }
  // The invite wasn't used up by the refused registration.
  assert.equal((await register('busy_user', code)).status, 201);
});

test('with the signup guard off (the default), there is no puzzle and meta says so', async () => {
  assert.equal((await fetch(`${baseUrl}/api/user/signupchallenge`)).status, 404);
  assert.equal((await (await fetch(`${baseUrl}/api/meta`)).json()).signupChallenge, false);
});

test('the hidden field filled in is refused even with the guard off', async () => {
  process.env.NO_INVITATION = 'true';

  assert.equal((await register('trap_user', undefined, { nmTrapField: 'x' })).status, 400);
});
