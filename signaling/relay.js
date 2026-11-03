'use strict';

const signaling = require('../services/signalingService');
const EVENTS = require('./events');
const logger = require('../logger');

// WebRTC connects each player to the session's GM backend, never players to each other, so
// the relay only passes messages along those lines: offers player → GM, answers GM → player,
// ICE candidates either way between the two. Relaying between any two members let a player
// answer another player's offer before the GM did, and so stand in for the GM.

/** The socket is its session's GM right now (not one that has since been replaced). */
function isSessionGm(peer, socketId) {
  return !!peer && peer.role === 'gm' && signaling.getGmSocket(peer.sessionId) === socketId;
}

/** `fromId` and `toId` are in one session, one of them its GM and the other a player. */
function gmAndPlayer(fromId, toId) {
  const from = signaling.getPeer(fromId);
  const to = signaling.getPeer(toId);
  if (!from || !to || from.sessionId !== to.sessionId) return null;
  if (isSessionGm(from, fromId) && to.role === 'player') return { from, to, fromGm: true };
  if (from.role === 'player' && isSessionGm(to, toId)) return { from, to, fromGm: false };
  return null;
}

// The sender's user goes along, so a GM backend that never saw the player's peer-joined (the
// player joined before the backend reached signaling, or re-offers on the same socket) can
// still set up the connection and answer.
function relayOffer(io, socket, { targetPeerId, offer } = {}) {
  if (!targetPeerId || !offer) return;
  const pair = gmAndPlayer(socket.id, targetPeerId);
  if (!pair || pair.fromGm) return;

  logger.debug(`[signaling] relay webrtc-offer from=${socket.id} to=${targetPeerId} session=${pair.from.sessionId} traceId=${pair.from.traceId ?? 'n/a'}`);

  io.to(targetPeerId).emit(EVENTS.WEBRTC_OFFER, {
    fromPeerId: socket.id,
    offer,
    userId: pair.from.userId,
    username: pair.from.username,
  });
}

function relayAnswer(io, socket, { targetPeerId, answer } = {}) {
  if (!targetPeerId || !answer) return;
  const pair = gmAndPlayer(socket.id, targetPeerId);
  if (!pair || !pair.fromGm) return;

  logger.debug(`[signaling] relay webrtc-answer from=${socket.id} to=${targetPeerId} session=${pair.to.sessionId} traceId=${pair.to.traceId ?? 'n/a'}`);

  io.to(targetPeerId).emit(EVENTS.WEBRTC_ANSWER, { fromPeerId: socket.id, answer });
}

function relayIceCandidate(io, socket, { targetPeerId, candidate } = {}) {
  if (!targetPeerId || !candidate) return;
  const pair = gmAndPlayer(socket.id, targetPeerId);
  if (!pair) return;
  if (!signaling.checkIceRateLimit(socket.id, targetPeerId)) return;

  logger.debug(`[signaling] relay ice-candidate from=${socket.id} to=${targetPeerId} session=${pair.from.sessionId}`);

  io.to(targetPeerId).emit(EVENTS.ICE_CANDIDATE, { fromPeerId: socket.id, candidate });
}

// The GM backend's watchdog (gm-alive, acknowledged): true while this socket is still its
// session's GM. No answer, or false, tells a backend its connection died unnoticed.
function answerGmAlive(socket, ack) {
  if (typeof ack !== 'function') return;
  ack(isSessionGm(signaling.getPeer(socket.id), socket.id));
}

module.exports = { relayOffer, relayAnswer, relayIceCandidate, answerGmAlive };
