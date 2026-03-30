'use strict';

const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

function createSession(ownerId, { name, summary, description, imageData, passwordRequired, password }) {
  const id = randomUUID();
  const passwordHash = passwordRequired && password
    ? bcrypt.hashSync(password, 10)
    : null;

  db.prepare(
    `INSERT INTO game_sessions (id, name, summary, description, image_data, password_hash, password_required, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, summary || null, description || null, imageData || null, passwordHash, passwordRequired ? 1 : 0, ownerId);

  return getSessionById(id);
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

  if (session.owner_id === userId) {
    return { error: 'You are the owner of this session', status: 400 };
  }

  if (session.password_required) {
    if (!password) return { error: 'Password required', status: 400 };
    if (!bcrypt.compareSync(password, session.password_hash)) {
      return { error: 'Incorrect password', status: 401 };
    }
  }

  const existing = db
    .prepare('SELECT id FROM session_players WHERE session_id = ? AND user_id = ?')
    .get(sessionId, userId);
  if (existing) return { error: 'Already joined', status: 409 };

  db.prepare(
    'INSERT INTO session_players (id, session_id, user_id) VALUES (?, ?, ?)'
  ).run(randomUUID(), sessionId, userId);

  return { ok: true };
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

module.exports = {
  createSession,
  getSessionById,
  getSessionsForUser,
  joinSession,
  deleteSession,
  getPlayersInSession,
};
