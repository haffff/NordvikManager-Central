'use strict';

const signaling = require('../services/signalingService');
const EVENTS = require('./events');
const logger = require('../logger');

// Relays a WebRTC offer within a session. The sender's user goes along, so a GM backend
// that never saw the player's peer-joined (the player joined before the backend reached
// signaling, or re-offers on the same socket) can still set up the connection and answer.
function relayOffer(io, socket, { targetPeerId, offer } = {}) {
  const peer = signaling.getPeer(socket.id);
  if (!peer) return;
  if (!targetPeerId || !offer) return;
  if (!signaling.inSameSession(socket.id, targetPeerId)) return;

  logger.debug(`[signaling] relay webrtc-offer from=${socket.id} to=${targetPeerId} session=${peer.sessionId} traceId=${peer.traceId ?? 'n/a'}`);

  io.to(targetPeerId).emit(EVENTS.WEBRTC_OFFER, {
    fromPeerId: socket.id,
    offer,
    userId: peer.userId,
    username: peer.username,
  });
}

// The GM backend's watchdog (gm-alive, acknowledged): true while this socket is still its
// session's GM. No answer, or false, tells a backend its connection died unnoticed.
function answerGmAlive(socket, ack) {
  if (typeof ack !== 'function') return;
  const peer = signaling.getPeer(socket.id);
  ack(!!peer && peer.role === 'gm' && signaling.getGmSocket(peer.sessionId) === socket.id);
}

module.exports = { relayOffer, answerGmAlive };
