'use strict';

const db = require('../db/database');
const config = require('../config/config');
const signaling = require('./signalingService');
const logger = require('../logger');

const DAY_MS = 86400000;
const CLEANUP_INTERVAL_MS = 3600000;
// Expired invites stay listed this long, so an admin can still see what happened to them.
const INVITE_KEEP_DAYS = 30;

// Every login and refresh adds a token and revokes the one it replaces; nothing reads a
// revoked token again (rotateRefreshToken only accepts unrevoked ones).
function pruneRefreshTokens(now = new Date()) {
  return db
    .prepare('DELETE FROM refresh_tokens WHERE revoked = 1 OR expires_at < ?')
    .run(now.toISOString()).changes;
}

function pruneInvites(now = new Date()) {
  const cutoff = new Date(now.getTime() - INVITE_KEEP_DAYS * DAY_MS).toISOString();
  return db.prepare('DELETE FROM invites WHERE expires_at < ?').run(cutoff).changes;
}

// A GM that stays connected for weeks authenticates only once; this keeps its session fresh.
function touchLiveSessions(now = new Date()) {
  const update = db.prepare('UPDATE game_sessions SET last_gm_seen_at = ? WHERE id = ?');
  const stamp = now.toISOString();
  const touchAll = db.transaction((ids) => { for (const id of ids) update.run(stamp, id); });
  const ids = signaling.getGmSessionIds();
  touchAll(ids);
  return ids.length;
}

// Sessions whose GM backend hasn't connected for `expiryDays` (0 = never expire). Their
// members go with them (ON DELETE CASCADE); a GM backend that comes back creates a new one.
function pruneSessions(now = new Date(), expiryDays = config.sessionExpiryDays) {
  if (!expiryDays || expiryDays <= 0) return 0;
  const cutoff = new Date(now.getTime() - expiryDays * DAY_MS).toISOString();
  const live = new Set(signaling.getGmSessionIds());
  const stale = db
    .prepare('SELECT id FROM game_sessions WHERE last_gm_seen_at IS NULL OR last_gm_seen_at < ?')
    .all(cutoff)
    .map((r) => r.id)
    .filter((id) => !live.has(id));
  const remove = db.prepare('DELETE FROM game_sessions WHERE id = ?');
  db.transaction(() => { for (const id of stale) remove.run(id); })();
  return stale.length;
}

function runCleanup(now = new Date(), { sessionExpiryDays = config.sessionExpiryDays } = {}) {
  touchLiveSessions(now);
  const result = {
    refreshTokens: pruneRefreshTokens(now),
    invites: pruneInvites(now),
    sessions: pruneSessions(now, sessionExpiryDays),
  };
  if (result.refreshTokens || result.invites || result.sessions) {
    logger.info(`[cleanup] removed refreshTokens=${result.refreshTokens} invites=${result.invites} sessions=${result.sessions} (session expiry ${sessionExpiryDays || 'off'} days)`);
  }
  return result;
}

// Runs the cleanup now and then every hour; the timer never keeps the process alive.
function startCleanup({ intervalMs = CLEANUP_INTERVAL_MS } = {}) {
  const tick = () => {
    try {
      runCleanup();
    } catch (err) {
      logger.error(`[cleanup] failed: ${err.message}`);
    }
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return timer;
}

module.exports = {
  pruneRefreshTokens,
  pruneInvites,
  touchLiveSessions,
  pruneSessions,
  runCleanup,
  startCleanup,
};
