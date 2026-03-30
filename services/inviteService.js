'use strict';

const { randomUUID } = require('crypto');
const db = require('../db/database');

const PAGE_SIZE = 10;

function generateInvite(createdBy, hoursValid = 24) {
  const key = randomUUID();
  const expiresAt = new Date(Date.now() + hoursValid * 3600000).toISOString();
  db.prepare(
    'INSERT INTO invites (key, created_by, expires_at) VALUES (?, ?, ?)'
  ).run(key, createdBy, expiresAt);
  return key;
}

function validateInvite(key) {
  const invite = db.prepare('SELECT * FROM invites WHERE key = ?').get(key);
  if (!invite) return false;
  if (invite.used) return false;
  if (new Date(invite.expires_at) < new Date()) return false;
  return true;
}

function consumeInvite(key) {
  db.prepare('UPDATE invites SET used = 1 WHERE key = ?').run(key);
}

function listInvites(page = 1) {
  const offset = (page - 1) * PAGE_SIZE;
  const total = db.prepare('SELECT COUNT(*) as count FROM invites').get().count;
  const data = db
    .prepare(
      `SELECT key, created_by, expires_at, used
       FROM invites ORDER BY rowid DESC LIMIT ? OFFSET ?`
    )
    .all(PAGE_SIZE, offset);

  return { data, page, total, count: data.length };
}

function deleteInvite(key) {
  const result = db.prepare('DELETE FROM invites WHERE key = ?').run(key);
  return result.changes > 0;
}

module.exports = { generateInvite, validateInvite, consumeInvite, listInvites, deleteInvite };
