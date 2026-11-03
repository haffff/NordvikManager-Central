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
const sessionService = require('../services/gameSessionService');
const mountRoutes = require('../routes/index');
const { JOIN_FAILURES_PER_USER } = require('../routes/gamelist');

// POST /api/gamelist/join is the only place a game's password is checked (signaling admits
// members only), so guessing it has to be slowed down. Only failed tries count: members
// coming back (409) and correct passwords never use the allowance up.

function createUser(name) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, name, 'x');
  return id;
}

const tokenFor = (id) => authService.generateAccessToken({ id, username: id, email: null, is_admin: 0 });

let server;
let baseUrl;
let ownerId;
let session;

before(async () => {
  runMigration();
  ownerId = createUser('limit-owner');
  session = sessionService.createSession(ownerId, { name: 'Locked', passwordRequired: true, password: 'right' });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  mountRoutes(app);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const join = (userId, password) =>
  fetch(`${baseUrl}/api/gamelist/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenFor(userId)}` },
    body: JSON.stringify({ gameID: session.id, password }),
  });

test('a user guessing the password is stopped after a few wrong tries', async () => {
  const guesser = createUser('guesser');
  for (let i = 0; i < JOIN_FAILURES_PER_USER; i++) {
    assert.equal((await join(guesser, `wrong-${i}`)).status, 401);
  }

  assert.equal((await join(guesser, 'right')).status, 429);
});

test('another user is not held up by someone else guessing', async () => {
  const other = createUser('other-joiner');
  assert.equal((await join(other, 'right')).status, 200);
});

test('a member coming back again and again is never limited', async () => {
  const member = createUser('regular');
  assert.equal((await join(member, 'right')).status, 200);
  for (let i = 0; i < JOIN_FAILURES_PER_USER + 5; i++) {
    assert.equal((await join(member, undefined)).status, 409);
  }
});
