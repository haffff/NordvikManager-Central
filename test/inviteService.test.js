'use strict';

require('./setupEnv');
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const inviteService = require('../services/inviteService');

let adminId;

before(() => {
  runMigration();
  adminId = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(adminId, 'invite-admin', 'x');
});

test('a default invite works once', () => {
  const key = inviteService.generateInvite(adminId, 24);
  assert.equal(inviteService.validateInvite(key), true);
  inviteService.consumeInvite(key);
  assert.equal(inviteService.validateInvite(key), false);
});

test('an invite with several uses works until they run out', () => {
  const key = inviteService.generateInvite(adminId, 24, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(inviteService.validateInvite(key), true);
    inviteService.consumeInvite(key);
  }
  assert.equal(inviteService.validateInvite(key), false);
});

test('an unlimited invite never runs out', () => {
  const key = inviteService.generateInvite(adminId, 24, null);
  for (let i = 0; i < 50; i++) inviteService.consumeInvite(key);
  assert.equal(inviteService.validateInvite(key), true);
});

test('an unlimited invite still expires', () => {
  const key = inviteService.generateInvite(adminId, 24, null);
  db.prepare('UPDATE invites SET expires_at = ? WHERE key = ?').run(new Date(Date.now() - 1000).toISOString(), key);
  assert.equal(inviteService.validateInvite(key), false);
});

test('listInvites reports uses and the limit', () => {
  const key = inviteService.generateInvite(adminId, 24, 5);
  inviteService.consumeInvite(key);
  const row = inviteService.listInvites(1).data.find((i) => i.key === key);
  assert.equal(row.max_uses, 5);
  assert.equal(row.use_count, 1);
});
