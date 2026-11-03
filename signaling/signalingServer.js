'use strict';

const { Server } = require('socket.io');
const config = require('../config/config');
const signaling = require('../services/signalingService');
const { handleAuthenticate } = require('./authenticate');
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
    socket.on(EVENTS.AUTHENTICATE, (payload) => handleAuthenticate(io, socket, payload));

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
