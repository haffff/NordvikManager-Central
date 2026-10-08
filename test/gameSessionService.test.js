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

test('joinSession rejects a wrong password for a new player', () => {
  const otherId = createUser('other');
  const result = sessionService.joinSession(otherId, session.id, 'wrong');
  assert.equal(result.status, 401);
});
