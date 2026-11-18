'use strict';

const { Server } = require('socket.io');
const config = require('../config/config');
const signaling = require('../services/signalingService');
const { handleAuthenticate } = require('./authenticate');
const { relayOffer, relayAnswer, relayIceCandidate, answerGmAlive } = require('./relay');
const { createConnectionLimiter, requireAuthWithin } = require('./limits');
const EVENTS = require('./events');
const logger = require('../logger');

// Offers, answers and ICE candidates are a few KB; Socket.IO's own default is 1 MB.
const MAX_MESSAGE_BYTES = 100 * 1024;

// `trust` is the app's compiled TRUST_PROXY (app.get('trust proxy fn')), so the per-address
// limit sees the same client addresses as the HTTP rate limits.
function attachSignalingServer(httpServer, { trust = () => false } = {}) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  signaling.setIo(io);
  io.use(createConnectionLimiter({ max: config.signalingMaxConnectionsPerIp, trust }));

  io.on('connection', (socket) => {
    logger.debug(`[signaling] socket connected: ${socket.id}`);
    // A socket that never authenticates only holds a connection: it's closed.
    requireAuthWithin(socket, config.signalingAuthTimeoutMs, () => !!signaling.getPeer(socket.id));

    // ── AUTHENTICATE ────────────────────────────────────────────────────
    socket.on(EVENTS.AUTHENTICATE, (payload) => handleAuthenticate(io, socket, payload));

    // ── WEBRTC OFFER (player → GM) ──────────────────────────────────────
    socket.on(EVENTS.WEBRTC_OFFER, (payload) => relayOffer(io, socket, payload));

    // ── GM ALIVE (watchdog, acknowledged) ────────────────────────────────
    socket.on(EVENTS.GM_ALIVE, (...args) => answerGmAlive(socket, args.at(-1)));

    // ── WEBRTC ANSWER (GM → player) ─────────────────────────────────────
    socket.on(EVENTS.WEBRTC_ANSWER, (payload) => relayAnswer(io, socket, payload));

    // ── ICE CANDIDATE (between the GM and a player) ─────────────────────
    socket.on(EVENTS.ICE_CANDIDATE, (payload) => relayIceCandidate(io, socket, payload));

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

module.exports = { attachSignalingServer };
