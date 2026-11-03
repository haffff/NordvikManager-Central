'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

function createSession(ownerId, { name, summary, description, imageData, passwordRequired, password, isPublic }) {
  const id = randomUUID();
  const passwordHash = passwordRequired && password
    ? bcrypt.hashSync(password, 10)
    : null;

  db.prepare(
    `INSERT INTO game_sessions (id, name, summary, description, image_data, password_hash, password_required, is_public, owner_id, last_gm_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, summary || null, description || null, imageData || null, passwordHash, passwordRequired ? 1 : 0, isPublic ? 1 : 0, ownerId, new Date().toISOString());

  return getSessionById(id);
}

// The session's GM backend just connected: session expiry counts from now.
function touchSession(sessionId, now = new Date()) {
  db.prepare('UPDATE game_sessions SET last_gm_seen_at = ? WHERE id = ?').run(now.toISOString(), sessionId);
}

function getSessionById(id) {
  return db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id);
}

function getSessionsForUser(userId) {
  return db
    .prepare(
      `SELECT gs.* FROM game_sessions gs
       WHERE gs.owner_id = ?
       UNION
       SELECT gs.* FROM game_sessions gs
       JOIN session_players sp ON sp.session_id = gs.id
       WHERE sp.user_id = ?
       ORDER BY gs.created_at DESC`
    )
    .all(userId, userId);
}

function joinSession(userId, sessionId, password) {
  const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId);
  if (!session) return { error: 'Session not found', status: 404 };

  // The owner may open their own game from the player client (e.g. away from the GM
  // server). No password and no member row: the GM backend maps them to its Game Master
  // player by Central user id, and getgames already lists the session through owner_id.
  if (session.owner_id === userId) return { ok: true, sessionId };

  // Members already passed the password check when they first joined. Checking membership
  // first lets them back in without it — e.g. after the player client switches to the
  // build matching the GM's protocol version and re-joins via ?game=.
  const existing = db
    .prepare('SELECT id FROM session_players WHERE session_id = ? AND user_id = ?')
    .get(sessionId, userId);
  if (existing) return { error: 'Already joined', status: 409, sessionId };

  if (session.password_required) {
    // Made by a GM backend that didn't send the password; it sends it with its next start.
    if (!session.password_hash) {
      return { error: "This game's password isn't set up yet. Ask the GM to start the game again.", status: 503 };
    }
    if (!password) return { error: 'Password required', status: 400 };
    if (!bcrypt.compareSync(password, session.password_hash)) {
      return { error: 'Incorrect password', status: 401 };
    }
  }

  db.prepare(
    'INSERT INTO session_players (id, session_id, user_id) VALUES (?, ?, ?)'
  ).run(randomUUID(), sessionId, userId);

  return { ok: true, sessionId };
}

/** True for the session's owner and for anyone who joined it (and so passed its password). */
function isMember(sessionId, userId) {
  const session = db.prepare('SELECT owner_id FROM game_sessions WHERE id = ?').get(sessionId);
  if (!session) return false;
  if (session.owner_id === userId) return true;
  return !!db
    .prepare('SELECT id FROM session_players WHERE session_id = ? AND user_id = ?')
    .get(sessionId, userId);
}

function deleteSession(sessionId, requestingUserId, isAdmin) {
  const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId);
  if (!session) return { error: 'Session not found', status: 404 };
  if (!isAdmin && session.owner_id !== requestingUserId) {
    return { error: 'Forbidden', status: 403 };
  }
  db.prepare('DELETE FROM game_sessions WHERE id = ?').run(sessionId);
  return { ok: true };
}

// The listed details of a session, sent again by the GM backend when it starts the
// session so the list stays current; a value left out is cleared. The password is the
// exception: given, it replaces the stored one (and makes the game password-protected);
// left out — an older backend never sends it — the stored one is kept.
function updateSession(sessionId, requestingUserId, isAdmin, { name, summary, description, imageData, isPublic, password }) {
  const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId);
  if (!session) return { error: 'Session not found', status: 404 };
  if (!isAdmin && session.owner_id !== requestingUserId) {
    return { error: 'Forbidden', status: 403 };
  }
  db.transaction(() => {
    db.prepare(
      `UPDATE game_sessions SET name = ?, summary = ?, description = ?, image_data = ?, is_public = ?
       WHERE id = ?`
    ).run(name, summary || null, description || null, imageData || null, isPublic ? 1 : 0, sessionId);
    if (password) {
      db.prepare('UPDATE game_sessions SET password_hash = ?, password_required = 1 WHERE id = ?')
        .run(bcrypt.hashSync(password, 10), sessionId);
    }
  })();
  return { ok: true, session: getSessionById(sessionId) };
}

function getPlayersInSession(sessionId) {
  return db
    .prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar_url, sp.joined_at
       FROM session_players sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.session_id = ?`
    )
    .all(sessionId);
}

function getPublicSessions() {
  return db.prepare('SELECT * FROM game_sessions WHERE is_public = 1 ORDER BY created_at DESC').all();
}

module.exports = {
  createSession,
  touchSession,
  getSessionById,
  getSessionsForUser,
  getPublicSessions,
  joinSession,
  isMember,
  deleteSession,
  updateSession,
  getPlayersInSession,
};
