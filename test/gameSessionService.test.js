'use strict';

require('./setupEnv');
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const sessionService = require('../services/gameSessionService');

function createUser(name) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, name, 'x');
  return id;
}

let ownerId;
let playerId;
let session;

before(() => {
  runMigration();
  ownerId = createUser('owner');
  playerId = createUser('player');
  session = sessionService.createSession(ownerId, {
    name: 'Locked game',
    passwordRequired: true,
    password: 'secret',
    isPublic: false,
  });
});

test('joinSession still requires the password for a new player', () => {
  const result = sessionService.joinSession(playerId, session.id, undefined);
  assert.equal(result.status, 400);
});

test('joinSession lets an existing member back in without the password', () => {
  const first = sessionService.joinSession(playerId, session.id, 'secret');
  assert.equal(first.ok, true);

  const again = sessionService.joinSession(playerId, session.id, undefined);
  assert.equal(again.status, 409);
  assert.equal(again.sessionId, session.id);
});

test('joinSession lets the owner into their own session without the password or a member row', () => {
  const result = sessionService.joinSession(ownerId, session.id, undefined);
  assert.deepEqual(result, { ok: true, sessionId: session.id });
  const row = db
    .prepare('SELECT id FROM session_players WHERE session_id = ? AND user_id = ?')
    .get(session.id, ownerId);
  assert.equal(row, undefined);
});

test('joinSession rejects a wrong password for a new player', () => {
  const otherId = createUser('other');
  const result = sessionService.joinSession(otherId, session.id, 'wrong');
  assert.equal(result.status, 401);
});

// The GM backend re-sends a game's details whenever it starts the session, so the
// session list players see (read before any WebRTC connection) stays current —
// e.g. a cover image changed after the session was first made.
test('updateSession lets the owner change the listed details', () => {
  const own = sessionService.createSession(ownerId, { name: 'Old', isPublic: false });

  const result = sessionService.updateSession(own.id, ownerId, false, {
    name: 'New',
    summary: 'Short',
    description: 'Long',
    imageData: 'data:image/png;base64,aGk=',
    isPublic: true,
  });

  assert.equal(result.ok, true);
  const row = sessionService.getSessionById(own.id);
  assert.equal(row.name, 'New');
  assert.equal(row.summary, 'Short');
  assert.equal(row.description, 'Long');
  assert.equal(row.image_data, 'data:image/png;base64,aGk=');
  assert.equal(row.is_public, 1);
});

test('updateSession clears what is no longer set, and keeps the password', () => {
  const own = sessionService.createSession(ownerId, {
    name: 'Game', summary: 'S', imageData: 'data:image/png;base64,aGk=', passwordRequired: true, password: 'pw',
  });

  sessionService.updateSession(own.id, ownerId, false, { name: 'Game' });

  const row = sessionService.getSessionById(own.id);
  assert.equal(row.summary, null);
  assert.equal(row.image_data, null);
  assert.equal(row.password_required, 1);
  assert.equal(row.password_hash, own.password_hash);
});

test('updateSession refuses anyone but the owner or an admin', () => {
  const own = sessionService.createSession(ownerId, { name: 'Mine' });

  assert.equal(sessionService.updateSession(own.id, playerId, false, { name: 'Taken' }).status, 403);
  assert.equal(sessionService.getSessionById(own.id).name, 'Mine');
  assert.equal(sessionService.updateSession(own.id, playerId, true, { name: 'By admin' }).ok, true);
});

test('updateSession reports a missing session', () => {
  assert.equal(sessionService.updateSession(randomUUID(), ownerId, false, { name: 'X' }).status, 404);
});
