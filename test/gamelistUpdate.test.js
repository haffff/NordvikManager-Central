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

// POST /api/gamelist/updategame: the GM backend re-sends a game's listed details
// (name, descriptions, cover image) when it starts the session.

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
  ownerId = createUser('update-owner');
  otherId = createUser('update-other');

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  mountRoutes(app);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body, userId) =>
  fetch(`${baseUrl}/api/gamelist/updategame`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { Authorization: `Bearer ${tokenFor(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });

test('the owner updates the listed details, cover image included', async () => {
  const session = sessionService.createSession(ownerId, { name: 'Old' });

  const res = await post({ sessionId: session.id, name: 'New', summary: 'S', image: 'data:image/png;base64,aGk=' }, ownerId);

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.name, 'New');
  assert.equal(body.imageData, 'data:image/png;base64,aGk=');
  assert.equal(sessionService.getSessionById(session.id).image_data, 'data:image/png;base64,aGk=');
});

test('someone else gets 403 and nothing changes', async () => {
  const session = sessionService.createSession(ownerId, { name: 'Mine' });

  const res = await post({ sessionId: session.id, name: 'Taken' }, otherId);

  assert.equal(res.status, 403);
  assert.equal(sessionService.getSessionById(session.id).name, 'Mine');
});

test('it needs a login, a session id and a name', async () => {
  const session = sessionService.createSession(ownerId, { name: 'Game' });

  assert.equal((await post({ sessionId: session.id, name: 'X' })).status, 401);
  assert.equal((await post({ name: 'X' }, ownerId)).status, 400);
  assert.equal((await post({ sessionId: session.id }, ownerId)).status, 400);
});

test('an unknown session is 404', async () => {
  assert.equal((await post({ sessionId: randomUUID(), name: 'X' }, ownerId)).status, 404);
});
