'use strict';

const MAX_PLAYERS_PER_SESSION = 50;
const ICE_RATE_LIMIT_WINDOW_MS = 60000;
const ICE_RATE_LIMIT_MAX = 100;

// socketId → { userId, username, isAdmin, sessionId, role: 'gm'|'player' }
const peers = new Map();

// sessionId → socketId (only one GM per session)
const gmSockets = new Map();

// `${fromSocketId}:${toSocketId}` → { count, windowStart }
const iceRateLimits = new Map();

function addPeer(socketId, { userId, username, isAdmin, sessionId, role }) {
  peers.set(socketId, { userId, username, isAdmin, sessionId, role });
}

function removePeer(socketId) {
  const peer = peers.get(socketId);
  if (peer) {
    if (peer.role === 'gm' && gmSockets.get(peer.sessionId) === socketId) {
      gmSockets.delete(peer.sessionId);
    }
  }
  peers.delete(socketId);

  // Clean up ICE rate limit entries for this socket
  for (const key of iceRateLimits.keys()) {
    if (key.startsWith(socketId + ':') || key.endsWith(':' + socketId)) {
      iceRateLimits.delete(key);
    }
  }
}

function getPeer(socketId) {
  return peers.get(socketId) || null;
}

function registerGm(sessionId, socketId) {
  gmSockets.set(sessionId, socketId);
}

function getGmSocket(sessionId) {
  return gmSockets.get(sessionId) || null;
}

function isGmAlreadyConnected(sessionId) {
  return gmSockets.has(sessionId);
}

function getSessionPeerCount(sessionId) {
  let count = 0;
  for (const peer of peers.values()) {
    if (peer.sessionId === sessionId) count++;
  }
  return count;
}

function isSessionFull(sessionId) {
  return getSessionPeerCount(sessionId) >= MAX_PLAYERS_PER_SESSION;
}

function inSameSession(socketIdA, socketIdB) {
  const a = peers.get(socketIdA);
  const b = peers.get(socketIdB);
  return a && b && a.sessionId === b.sessionId;
}

function checkIceRateLimit(fromSocketId, toSocketId) {
  const key = `${fromSocketId}:${toSocketId}`;
  const now = Date.now();
  const entry = iceRateLimits.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > ICE_RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count++;
  iceRateLimits.set(key, entry);
  return entry.count <= ICE_RATE_LIMIT_MAX;
}

function getActiveSessions() {
  const sessions = new Map();
  for (const [socketId, peer] of peers.entries()) {
    if (!sessions.has(peer.sessionId)) {
      sessions.set(peer.sessionId, { sessionId: peer.sessionId, peers: [] });
    }
    sessions.get(peer.sessionId).peers.push({
      socketId,
      userId: peer.userId,
      username: peer.username,
      role: peer.role,
    });
  }
  return Array.from(sessions.values());
}

module.exports = {
  addPeer,
  removePeer,
  getPeer,
  registerGm,
  getGmSocket,
  isGmAlreadyConnected,
  isSessionFull,
  inSameSession,
  checkIceRateLimit,
  getActiveSessions,
};
