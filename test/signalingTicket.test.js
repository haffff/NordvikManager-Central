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

// POST /api/gamelist/signalingticket: the GM backend trades its short-lived access token
// for a ticket that only lets it (re)connect to signaling as GM of one session, so its
// socket can come back after a drop long after the access token expired.

function createUser(name) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, name, 'x');
  return id;
}

const tokenFor = (id) => authService.generateAccessToken({ id, username: id, email: null, is_admin: 0 });

let server;
let baseUrl;
let ownerId;
let otherId;

before(async () => {
  runMigration();
  ownerId = createUser('ticket-owner');
  otherId = createUser('ticket-other');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  mountRoutes(app);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body, userId) =>
  fetch(`${baseUrl}/api/gamelist/signalingticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });

test('the owner gets a ticket for its session', async () => {
  const session = sessionService.createSession(ownerId, { name: 'G' });

  const res = await post({ sessionId: session.id }, ownerId);

  assert.equal(res.status, 200);
  const { ticket } = await res.json();
  assert.equal(authService.verifySignalingTicket(ticket, session.id).id, ownerId);
});

test('anyone but the owner is refused', async () => {
  const session = sessionService.createSession(ownerId, { name: 'G' });
  assert.equal((await post({ sessionId: session.id }, otherId)).status, 403);
});

test('an unknown session is not found', async () => {
  assert.equal((await post({ sessionId: randomUUID() }, ownerId)).status, 404);
});

test('it needs a login', async () => {
  const session = sessionService.createSession(ownerId, { name: 'G' });
  assert.equal((await post({ sessionId: session.id })).status, 401);
});
