'use strict';

const { randomUUID } = require('crypto');
const db = require('../db/database');

const PAGE_SIZE = 10;

// maxUses: how many accounts the key can register; null = unlimited (one key for a group).
function generateInvite(createdBy, hoursValid = 24, maxUses = 1) {
  const key = randomUUID();
  const expiresAt = new Date(Date.now() + hoursValid * 3600000).toISOString();
  db.prepare(
    'INSERT INTO invites (key, created_by, expires_at, max_uses) VALUES (?, ?, ?, ?)'
  ).run(key, createdBy, expiresAt, maxUses);
  return key;
}

function isUsedUp(invite) {
  return invite.max_uses !== null && invite.use_count >= invite.max_uses;
}

function validateInvite(key) {
  const invite = db.prepare('SELECT * FROM invites WHERE key = ?').get(key);
  if (!invite) return false;
  if (isUsedUp(invite)) return false;
  if (new Date(invite.expires_at) < new Date()) return false;
  return true;
}

function consumeInvite(key) {
  db.prepare(
    `UPDATE invites SET use_count = use_count + 1,
       used = CASE WHEN max_uses IS NOT NULL AND use_count + 1 >= max_uses THEN 1 ELSE used END
     WHERE key = ?`
  ).run(key);
}

function listInvites(page = 1) {
  const offset = (page - 1) * PAGE_SIZE;
  const total = db.prepare('SELECT COUNT(*) as count FROM invites').get().count;
  const data = db
    .prepare(
      `SELECT key, created_by, expires_at, used, max_uses, use_count
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
