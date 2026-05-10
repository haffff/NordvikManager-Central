'use strict';

const { Server } = require('socket.io');
const config = require('../config/config');
const authService = require('../services/authService');
const signaling = require('../services/signalingService');
const EVENTS = require('./events');
const logger = require('../logger');

function attachSignalingServer(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  signaling.setIo(io);

  io.on('connection', (socket) => {
    logger.debug(`[signaling] socket connected: ${socket.id}`);

    // ── AUTHENTICATE ────────────────────────────────────────────────────
    socket.on(EVENTS.AUTHENTICATE, ({ token, sessionId, role, traceId } = {}) => {
      const logCtx = `socketId=${socket.id} sessionId=${sessionId ?? 'n/a'} role=${role ?? 'n/a'} traceId=${traceId ?? 'n/a'}`;

      if (!token || !sessionId || !['gm', 'player'].includes(role)) {
        const reason = 'Invalid authenticate payload';
        logger.warn(`[signaling] AUTH_REJECTED reason="${reason}" ${logCtx}`);
        socket.emit(EVENTS.AUTH_ERROR, { error: reason });
        socket.disconnect(true);
        return;
      }

      const user = authService.verifyAccessToken(token);
      if (!user) {
        const reason = 'Invalid or expired token';
        logger.warn(`[signaling] AUTH_REJECTED reason="${reason}" ${logCtx}`);
        socket.emit(EVENTS.AUTH_ERROR, { error: reason });
        socket.disconnect(true);
        return;
      }

      // Any authenticated user may host a session as GM.
      // The isGmAlreadyConnected check below prevents session hijacking.

      // Re-authentication: this socket is already registered in this session
      const existingPeer = signaling.getPeer(socket.id);
      const isReauth = existingPeer !== null && existingPeer.sessionId === sessionId;

      if (!isReauth) {
        if (role === 'gm' && signaling.isGmAlreadyConnected(sessionId)) {
          const reason = 'A GM is already connected to this session';
          logger.warn(`[signaling] AUTH_REJECTED reason="${reason}" ${logCtx} userId=${user.id}`);
          socket.emit(EVENTS.AUTH_ERROR, { error: reason });
          socket.disconnect(true);
          return;
        }

        if (signaling.isSessionFull(sessionId)) {
          const reason = 'Session is full';
          logger.warn(`[signaling] AUTH_REJECTED reason="${reason}" ${logCtx} userId=${user.id}`);
          socket.emit(EVENTS.AUTH_ERROR, { error: reason });
          socket.disconnect(true);
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
        signaling.registerGm(sessionId, socket.id);
      }

      socket.join(`session:${sessionId}`);

      socket.emit(EVENTS.AUTHENTICATED, { peerId: socket.id });

      // Tell the player who the GM backend is so they can send the offer
      if (role === 'player') {
        socket.emit(EVENTS.SESSION_INFO, {
          gmPeerId: signaling.getGmSocket(sessionId) || null,
          sessionId,
        });
      }

      // Only broadcast peer-joined for genuinely new connections, not re-authentications.
      // Re-auth is used by players to poll for the GM peer id — spamming peer-joined
      // to the GM backend would create an infinite loop.
      if (role === 'player' && !isReauth) {
        socket.to(`session:${sessionId}`).emit(EVENTS.PEER_JOINED, {
          peerId: socket.id,
          userId: user.id,
          username: user.username,
          role,
        });
      }

      // Notify waiting players immediately when the GM backend comes online so they can
      // re-authenticate and retrieve the GM peer id without waiting for their polling cycle.
      if (role === 'gm' && !isReauth) {
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
    });

    // ── WEBRTC OFFER ────────────────────────────────────────────────────
    socket.on(EVENTS.WEBRTC_OFFER, ({ targetPeerId, offer } = {}) => {
      if (!isAuthenticated(socket.id)) return;
      if (!targetPeerId || !offer) return;
      if (!signaling.inSameSession(socket.id, targetPeerId)) return;

      const peer = signaling.getPeer(socket.id);
      logger.debug(`[signaling] relay webrtc-offer from=${socket.id} to=${targetPeerId} session=${peer?.sessionId ?? 'n/a'} traceId=${peer?.traceId ?? 'n/a'}`);

      io.to(targetPeerId).emit(EVENTS.WEBRTC_OFFER, {
        fromPeerId: socket.id,
        offer,
      });
    });

    // ── WEBRTC ANSWER ───────────────────────────────────────────────────
    socket.on(EVENTS.WEBRTC_ANSWER, ({ targetPeerId, answer } = {}) => {
      if (!isAuthenticated(socket.id)) return;
      if (!targetPeerId || !answer) return;
      if (!signaling.inSameSession(socket.id, targetPeerId)) return;

      const targetPeer = signaling.getPeer(targetPeerId);
      logger.debug(`[signaling] relay webrtc-answer from=${socket.id} to=${targetPeerId} session=${targetPeer?.sessionId ?? 'n/a'} traceId=${targetPeer?.traceId ?? 'n/a'}`);

      io.to(targetPeerId).emit(EVENTS.WEBRTC_ANSWER, {
        fromPeerId: socket.id,
        answer,
      });
    });

    // ── ICE CANDIDATE ───────────────────────────────────────────────────
    socket.on(EVENTS.ICE_CANDIDATE, ({ targetPeerId, candidate } = {}) => {
      if (!isAuthenticated(socket.id)) return;
      if (!targetPeerId || !candidate) return;
      if (!signaling.inSameSession(socket.id, targetPeerId)) return;
      if (!signaling.checkIceRateLimit(socket.id, targetPeerId)) return;

      const peer = signaling.getPeer(socket.id);
      logger.debug(`[signaling] relay ice-candidate from=${socket.id} to=${targetPeerId} session=${peer?.sessionId ?? 'n/a'}`);

      io.to(targetPeerId).emit(EVENTS.ICE_CANDIDATE, {
        fromPeerId: socket.id,
        candidate,
      });
    });

    // ── DISCONNECT ──────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      const peer = signaling.getPeer(socket.id);
      if (peer) {
        logger.info(`[signaling] ${peer.role} '${peer.username}' disconnected from session ${peer.sessionId} socketId=${socket.id} reason="${reason}" traceId=${peer.traceId ?? 'n/a'}`);
        socket.to(`session:${peer.sessionId}`).emit(EVENTS.PEER_LEFT, {
          peerId: socket.id,
          username: peer.username,
        });
        signaling.removePeer(socket.id);
      } else {
        logger.debug(`[signaling] unauthenticated socket disconnected: ${socket.id} reason="${reason}"`);
      }
    });
  });

  return io;
}

function isAuthenticated(socketId) {
  return signaling.getPeer(socketId) !== null;
}

module.exports = { attachSignalingServer };
