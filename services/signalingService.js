'use strict';

const EVENTS = require('../signaling/events');
const logger = require('../logger');

const MAX_PLAYERS_PER_SESSION = 50;
const ICE_RATE_LIMIT_WINDOW_MS = 60000;
const ICE_RATE_LIMIT_MAX = 100;
const GM_PING_TIMEOUT_MS = 3000;
// Number of consecutive ping timeouts before the GM is considered dead and evicted.
// A single slow ACK (GC pause, scheduler delay) will not break an active session.
const GM_PING_MAX_STRIKES = 3;

// socketId → { userId, username, isAdmin, sessionId, role: 'gm'|'player' }
const peers = new Map();

// sessionId → socketId (only one GM per session)
const gmSockets = new Map();

// sessionId → number of consecutive ping timeouts (reset on any successful ping)
const gmPingStrikes = new Map();

// `${fromSocketId}:${toSocketId}` → { count, windowStart }
const iceRateLimits = new Map();

// Socket.io server instance, set after startup
let _io = null;

function setIo(io) {
  _io = io;
}

function addPeer(socketId, { userId, username, isAdmin, sessionId, role }) {
  peers.set(socketId, { userId, username, isAdmin, sessionId, role });
}

function removePeer(socketId) {
  const peer = peers.get(socketId);
  if (peer) {
    if (peer.role === 'gm' && gmSockets.get(peer.sessionId) === socketId) {
      gmSockets.delete(peer.sessionId);
      gmPingStrikes.delete(peer.sessionId);
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

  if (entry.count > ICE_RATE_LIMIT_MAX) {
    logger.warn(`[signaling] ICE rate limit exceeded from=${fromSocketId} to=${toSocketId} count=${entry.count} limit=${ICE_RATE_LIMIT_MAX}`);
    return false;
  }
  return true;
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

/**
 * Sends a ping to the GM's Socket.io socket and waits for acknowledgment.
 * Cleans up stale entries if the GM is unreachable or the socket is gone.
 * The GM backend must respond to the `ping-gm` event by calling the ack callback.
 *
 * @param {string} sessionId
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>} true if GM responded, false if unreachable/timed out
 */
async function pingGmSocket(sessionId, timeoutMs = GM_PING_TIMEOUT_MS) {
  const gmSocketId = gmSockets.get(sessionId);
  if (!gmSocketId || !_io) return false;

  const socket = _io.sockets.sockets.get(gmSocketId);
  if (!socket || !socket.connected) {
    // Socket is already gone at the transport level — clean up immediately.
    gmSockets.delete(sessionId);
    gmPingStrikes.delete(sessionId);
    return false;
  }

  return new Promise((resolve) => {
    socket.timeout(timeoutMs).emit(EVENTS.PING_GM, (err) => {
      if (err) {
        // ACK timed out. Increment the strike counter and only evict once we
        // hit GM_PING_MAX_STRIKES consecutive failures. A single slow response
        // (GC pause, scheduler jitter) must not destroy an active session.
        const strikes = (gmPingStrikes.get(sessionId) || 0) + 1;

        if (strikes >= GM_PING_MAX_STRIKES) {
          // Consistently unresponsive — evict state and force-disconnect so
          // the GM backend's OnDisconnected fires and triggers its reconnect.
          logger.warn(`[signaling] GM evicted sessionId=${sessionId} reason="consecutive ping timeouts (${GM_PING_MAX_STRIKES})" socketId=${gmSocketId}`);
          gmPingStrikes.delete(sessionId);
          gmSockets.delete(sessionId);
          removePeer(gmSocketId);
          socket.disconnect(true);
        } else {
          gmPingStrikes.set(sessionId, strikes);
          logger.warn(`[signaling] GM ping timeout sessionId=${sessionId} strikes=${strikes}/${GM_PING_MAX_STRIKES} socketId=${gmSocketId}`);
        }

        resolve(false);
      } else {
        gmPingStrikes.delete(sessionId);
        logger.debug(`[signaling] GM ping ok sessionId=${sessionId} socketId=${gmSocketId}`);
        resolve(true);
      }
    });
  });
}

module.exports = {
  setIo,
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
  pingGmSocket,
};
