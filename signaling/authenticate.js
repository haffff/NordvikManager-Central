'use strict';

const authService = require('../services/authService');
const sessionService = require('../services/gameSessionService');
const signaling = require('../services/signalingService');
const { checkGmProtocol } = require('../services/protocol');
const config = require('../config/config');
const EVENTS = require('./events');
const logger = require('../logger');

// A stale token is an everyday thing (a socket reconnecting after the 15-minute access
// token ran out): the socket stays open so the client can refresh and authenticate again.
// Only a socket that keeps failing is dropped.
const MAX_AUTH_FAILURES = 3;

// Sent to a GM connection that a newer one of the same owner replaced. The GM backend
// treats an auth error as final, so it stops reconnecting instead of taking the session back.
const GM_REPLACED = 'This game was opened as GM from another connection';

function reject(socket, reason, logCtx, { final = true } = {}) {
  logger.warn(`[signaling] AUTH_REJECTED reason="${reason}" ${logCtx}`);
  socket.emit(EVENTS.AUTH_ERROR, { error: reason });
  if (final) {
    socket.disconnect(true);
    return;
  }
  socket.data.authFailures = (socket.data.authFailures ?? 0) + 1;
  if (socket.data.authFailures >= MAX_AUTH_FAILURES) socket.disconnect(true);
}

// The user behind `token`: an access token for anyone, or for a GM also its signaling
// ticket for this session.
function resolveUser(token, sessionId, role) {
  return authService.verifyAccessToken(token)
    ?? (role === 'gm' ? authService.verifySignalingTicket(token, sessionId) : null);
}

function handleAuthenticate(io, socket, { token, sessionId, role, traceId, protocol } = {}) {
  const logCtx = `socketId=${socket.id} sessionId=${sessionId ?? 'n/a'} role=${role ?? 'n/a'} traceId=${traceId ?? 'n/a'}`;

  if (!token || !sessionId || !['gm', 'player'].includes(role)) {
    reject(socket, 'Invalid authenticate payload', logCtx);
    return;
  }

  const user = resolveUser(token, sessionId, role);
  if (!user) {
    reject(socket, 'Invalid or expired token', logCtx, { final: false });
    return;
  }
  socket.data.authFailures = 0;

  // Only the session's owner may connect as GM — prevents a player who
  // knows the sessionId from racing the real GM backend for the GM role.
  if (role === 'gm') {
    const session = sessionService.getSessionById(sessionId);
    if (!session || session.owner_id !== user.id) {
      reject(socket, 'Only the session owner may connect as GM', `${logCtx} userId=${user.id}`);
      return;
    }
  }

  // A player must have joined the game first (gamelist/join checks its password); the GM
  // backend creates whoever connects here as a player, so this is the password gate.
  if (role === 'player') {
    if (!sessionService.getSessionById(sessionId)) {
      reject(socket, 'Game session not found', `${logCtx} userId=${user.id}`);
      return;
    }
    if (!sessionService.isMember(sessionId, user.id)) {
      reject(socket, 'Join the game before connecting', `${logCtx} userId=${user.id}`);
      return;
    }
  }

  let gmProtocol = null;
  if (role === 'gm') {
    const protocolCheck = checkGmProtocol(protocol, config.minGmProtocol);
    if (!protocolCheck.ok) {
      reject(socket, protocolCheck.error, `${logCtx} userId=${user.id}`);
      return;
    }
    gmProtocol = protocolCheck.protocol;
  }

  // Re-authentication: this socket is already registered in this session
  const existingPeer = signaling.getPeer(socket.id);
  const isReauth = existingPeer !== null && existingPeer.sessionId === sessionId;

  if (!isReauth) {
    // The owner's GM backend reconnecting: its old socket may not have timed out here yet
    // (a dropped connection takes up to a minute to notice). Refusing it would leave the
    // session without a GM, so the new connection wins.
    if (role === 'gm' && signaling.isGmAlreadyConnected(sessionId)) {
      const oldGm = signaling.getGmSocket(sessionId);
      logger.info(`[signaling] GM socket ${oldGm} replaced by ${socket.id} in session ${sessionId} userId=${user.id}`);
      signaling.evictPeer(oldGm, { error: GM_REPLACED });
    }

    if (signaling.isSessionFull(sessionId)) {
      reject(socket, 'Session is full', `${logCtx} userId=${user.id}`);
      return;
    }
  }

  signaling.addPeer(socket.id, {
    userId: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    sessionId,
    role,
    traceId: traceId ?? null,
  });

  if (role === 'gm') {
    signaling.registerGm(sessionId, socket.id, gmProtocol);
    // Session expiry counts from the GM's last connection (services/cleanupService.js).
    sessionService.touchSession(sessionId);
  }

  socket.join(`session:${sessionId}`);

  socket.emit(EVENTS.AUTHENTICATED, { peerId: socket.id });

  // Tell the player who the GM backend is so they can send the offer
  if (role === 'player') {
    // gmProtocol lets the player client switch to the build matching the GM backend
    // (/client/p<N>/) before it opens the WebRTC connection.
    socket.emit(EVENTS.SESSION_INFO, {
      gmPeerId: signaling.getGmSocket(sessionId) || null,
      gmProtocol: signaling.getGmProtocol(sessionId),
      sessionId,
    });
  }

  // Only broadcast peer-joined for genuinely new connections, not re-authentications.
  // Re-auth is used by players to poll for the GM peer id — spamming peer-joined
  // to the GM backend would create an infinite loop. A new GM connection is announced
  // too, so waiting players re-authenticate and pick up its peer id straight away.
  if (!isReauth) {
    socket.to(`session:${sessionId}`).emit(EVENTS.PEER_JOINED, {
      peerId: socket.id,
      userId: user.id,
      username: user.username,
      role,
    });
  }

  if (isReauth) {
    logger.debug(`[signaling] ${role} '${user.username}' re-authenticated in session ${sessionId} socketId=${socket.id} traceId=${traceId ?? 'n/a'}`);
  } else {
    logger.info(`[signaling] ${role} '${user.username}' joined session ${sessionId} socketId=${socket.id} traceId=${traceId ?? 'n/a'}`);
  }
}

module.exports = { handleAuthenticate, MAX_AUTH_FAILURES, GM_REPLACED };
