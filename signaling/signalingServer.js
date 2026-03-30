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

  io.on('connection', (socket) => {
    logger.debug(`[signaling] socket connected: ${socket.id}`);

    // ── AUTHENTICATE ────────────────────────────────────────────────────
    socket.on(EVENTS.AUTHENTICATE, ({ token, sessionId, role } = {}) => {
      if (!token || !sessionId || !['gm', 'player'].includes(role)) {
        socket.emit(EVENTS.AUTH_ERROR, { error: 'Invalid authenticate payload' });
        socket.disconnect(true);
        return;
      }

      const user = authService.verifyAccessToken(token);
      if (!user) {
        socket.emit(EVENTS.AUTH_ERROR, { error: 'Invalid or expired token' });
        socket.disconnect(true);
        return;
      }

      if (role === 'gm' && !user.isAdmin) {
        socket.emit(EVENTS.AUTH_ERROR, { error: 'GM role requires admin privileges' });
        socket.disconnect(true);
        return;
      }

      if (role === 'gm' && signaling.isGmAlreadyConnected(sessionId)) {
        socket.emit(EVENTS.AUTH_ERROR, { error: 'A GM is already connected to this session' });
        socket.disconnect(true);
        return;
      }

      if (signaling.isSessionFull(sessionId)) {
        socket.emit(EVENTS.AUTH_ERROR, { error: 'Session is full' });
        socket.disconnect(true);
        return;
      }

      signaling.addPeer(socket.id, {
        userId: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        sessionId,
        role,
      });

      if (role === 'gm') {
        signaling.registerGm(sessionId, socket.id);
      }

      socket.join(`session:${sessionId}`);

      socket.emit(EVENTS.AUTHENTICATED, { peerId: socket.id });

      // Notify others in the room
      if (role === 'player') {
        socket.to(`session:${sessionId}`).emit(EVENTS.PEER_JOINED, {
          peerId: socket.id,
          username: user.username,
          role,
        });
      }

      logger.debug(`[signaling] ${role} '${user.username}' joined session ${sessionId}`);
    });

    // ── WEBRTC OFFER ────────────────────────────────────────────────────
    socket.on(EVENTS.WEBRTC_OFFER, ({ targetPeerId, offer } = {}) => {
      if (!isAuthenticated(socket.id)) return;
      if (!targetPeerId || !offer) return;
      if (!signaling.inSameSession(socket.id, targetPeerId)) return;

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

      io.to(targetPeerId).emit(EVENTS.ICE_CANDIDATE, {
        fromPeerId: socket.id,
        candidate,
      });
    });

    // ── DISCONNECT ──────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const peer = signaling.getPeer(socket.id);
      if (peer) {
        socket.to(`session:${peer.sessionId}`).emit(EVENTS.PEER_LEFT, {
          peerId: socket.id,
          username: peer.username,
        });
        logger.debug(
          `[signaling] ${peer.role} '${peer.username}' left session ${peer.sessionId}`
        );
        signaling.removePeer(socket.id);
      }
    });
  });

  return io;
}

function isAuthenticated(socketId) {
  return signaling.getPeer(socketId) !== null;
}

module.exports = { attachSignalingServer };
