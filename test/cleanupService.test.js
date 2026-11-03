'use strict';

require('./setupEnv');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const sessionService = require('../services/gameSessionService');
const signaling = require('../services/signalingService');
const cleanup = require('../services/cleanupService');

const DAY = 86400000;
const NOW = new Date('2026-06-01T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY).toISOString();
const daysAhead = (n) => new Date(NOW.getTime() + n * DAY).toISOString();

let userId;

function createUser(name) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, name, 'x');
  return id;
}

const addToken = (token, expiresAt, revoked = 0) =>
  db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at, revoked) VALUES (?, ?, ?, ?)')
    .run(token, userId, expiresAt, revoked);
const tokens = () => db.prepare('SELECT token FROM refresh_tokens ORDER BY token').all().map((r) => r.token);

const addInvite = (key, expiresAt) =>
  db.prepare('INSERT INTO invites (key, created_by, expires_at) VALUES (?, ?, ?)').run(key, userId, expiresAt);
const invites = () => db.prepare('SELECT key FROM invites ORDER BY key').all().map((r) => r.key);

function sessionSeen(name, lastSeen) {
  const s = sessionService.createSession(userId, { name });
  db.prepare('UPDATE game_sessions SET last_gm_seen_at = ? WHERE id = ?').run(lastSeen, s.id);
  return s.id;
}
const sessionExists = (id) => !!sessionService.getSessionById(id);

before(() => {
  runMigration();
  userId = createUser('cleanup-user');
});

beforeEach(() => {
  db.prepare('DELETE FROM refresh_tokens').run();
  db.prepare('DELETE FROM invites').run();
  db.prepare('DELETE FROM game_sessions').run();
  for (const s of signaling.getActiveSessions()) for (const p of s.peers) signaling.removePeer(p.socketId);
});

test('pruneRefreshTokens deletes revoked and expired tokens, keeps live ones', () => {
  addToken('a-live', daysAhead(3));
  addToken('b-revoked', daysAhead(3), 1);
  addToken('c-expired', daysAgo(1));

  const removed = cleanup.pruneRefreshTokens(NOW);

  assert.equal(removed, 2);
  assert.deepEqual(tokens(), ['a-live']);
});

test('pruneInvites deletes invites expired more than 30 days ago, keeps recent ones', () => {
  addInvite('a-valid', daysAhead(1));
  addInvite('b-recently-expired', daysAgo(10));
  addInvite('c-long-expired', daysAgo(31));

  const removed = cleanup.pruneInvites(NOW);

  assert.equal(removed, 1);
  assert.deepEqual(invites(), ['a-valid', 'b-recently-expired']);
});

test('pruneSessions deletes sessions whose GM was last seen before the expiry window', () => {
  const old = sessionSeen('old', daysAgo(91));
  const recent = sessionSeen('recent', daysAgo(89));

  const removed = cleanup.pruneSessions(NOW, 90);

  assert.equal(removed, 1);
  assert.equal(sessionExists(old), false);
  assert.equal(sessionExists(recent), true);
});

test('pruneSessions also removes the expired session\'s members', () => {
  const old = sessionSeen('old-with-member', daysAgo(200));
  const member = createUser('cleanup-member');
  sessionService.joinSession(member, old, undefined);

  cleanup.pruneSessions(NOW, 90);

  const rows = db.prepare('SELECT id FROM session_players WHERE session_id = ?').all(old);
  assert.equal(rows.length, 0);
});

test('pruneSessions never deletes a session whose GM is connected', () => {
  const live = sessionSeen('live', daysAgo(400));
  signaling.addPeer('gm-socket', { userId, username: 'gm', sessionId: live, role: 'gm' });
  signaling.registerGm(live, 'gm-socket', 2);

  cleanup.pruneSessions(NOW, 90);

  assert.equal(sessionExists(live), true);
});

test('pruneSessions with 0 days is off', () => {
  const old = sessionSeen('ancient', daysAgo(5000));

  assert.equal(cleanup.pruneSessions(NOW, 0), 0);
  assert.equal(sessionExists(old), true);
});

test('touchLiveSessions marks sessions with a connected GM as seen now', () => {
  const live = sessionSeen('touched', daysAgo(50));
  const idle = sessionSeen('idle', daysAgo(50));
  signaling.addPeer('gm-socket-2', { userId, username: 'gm', sessionId: live, role: 'gm' });
  signaling.registerGm(live, 'gm-socket-2', 2);

  cleanup.touchLiveSessions(NOW);

  assert.equal(sessionService.getSessionById(live).last_gm_seen_at, NOW.toISOString());
  assert.equal(sessionService.getSessionById(idle).last_gm_seen_at, daysAgo(50));
});

test('runCleanup touches live sessions before expiring, so a long-running GM keeps its session', () => {
  const live = sessionSeen('long-running', daysAgo(120));
  signaling.addPeer('gm-socket-3', { userId, username: 'gm', sessionId: live, role: 'gm' });
  signaling.registerGm(live, 'gm-socket-3', 2);
  addToken('expired', daysAgo(1));

  cleanup.runCleanup(NOW, { sessionExpiryDays: 90 });

  assert.equal(sessionExists(live), true);
  assert.deepEqual(tokens(), []);
});

test('createSession records the GM as seen now', () => {
  const before = Date.now();
  const s = sessionService.createSession(userId, { name: 'fresh' });
  const seen = Date.parse(s.last_gm_seen_at);
  assert.ok(seen >= before - 1000 && seen <= Date.now() + 1000, `last_gm_seen_at=${s.last_gm_seen_at}`);
});

test('touchSession marks one session as seen now', () => {
  const id = sessionSeen('one', daysAgo(30));
  sessionService.touchSession(id, NOW);
  assert.equal(sessionService.getSessionById(id).last_gm_seen_at, NOW.toISOString());
});
