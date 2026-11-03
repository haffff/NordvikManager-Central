'use strict';

require('./setupEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const signaling = require('../services/signalingService');
const EVENTS = require('../signaling/events');
const { relayOffer } = require('../signaling/relay');

// The GM backend learns who sent an offer from the relay itself, so it can answer a player
// whose peer-joined it never saw (the player joined before the backend reached signaling).

function fakeIo() {
  const sent = [];
  return { sent, to: (room) => ({ emit: (event, data) => sent.push({ room, event, data }) }) };
}

test('an offer reaches its target with the sender\'s user', () => {
  signaling.addPeer('player-sock', { userId: 'u-player', username: 'alice', isAdmin: false, sessionId: 's-relay', role: 'player' });
  signaling.addPeer('gm-sock', { userId: 'u-gm', username: 'gm', isAdmin: false, sessionId: 's-relay', role: 'gm' });
  const io = fakeIo();

  relayOffer(io, { id: 'player-sock' }, { targetPeerId: 'gm-sock', offer: { type: 'offer', sdp: 'v=0' } });

  assert.deepEqual(io.sent, [{
    room: 'gm-sock',
    event: EVENTS.WEBRTC_OFFER,
    data: { fromPeerId: 'player-sock', offer: { type: 'offer', sdp: 'v=0' }, userId: 'u-player', username: 'alice' },
  }]);
  signaling.removePeer('player-sock');
  signaling.removePeer('gm-sock');
});

test('an offer to a peer in another session, or from an unauthenticated socket, goes nowhere', () => {
  signaling.addPeer('p1', { userId: 'u1', username: 'a', isAdmin: false, sessionId: 's-a', role: 'player' });
  signaling.addPeer('gm2', { userId: 'u2', username: 'b', isAdmin: false, sessionId: 's-b', role: 'gm' });
  const io = fakeIo();

  relayOffer(io, { id: 'p1' }, { targetPeerId: 'gm2', offer: { type: 'offer', sdp: 'v=0' } });
  relayOffer(io, { id: 'stranger' }, { targetPeerId: 'gm2', offer: { type: 'offer', sdp: 'v=0' } });

  assert.deepEqual(io.sent, []);
  signaling.removePeer('p1');
  signaling.removePeer('gm2');
});

// The GM backend's watchdog: Central acknowledges gm-alive with whether the socket is
// still the session's GM, so a backend whose connection died unnoticed can tell.
const { answerGmAlive } = require('../signaling/relay');

test('gm-alive is answered true for the session\'s GM socket, false otherwise', () => {
  signaling.addPeer('gm-alive-sock', { userId: 'u', username: 'gm', isAdmin: false, sessionId: 's-alive', role: 'gm' });
  signaling.registerGm('s-alive', 'gm-alive-sock', 2);
  const answers = [];

  answerGmAlive({ id: 'gm-alive-sock' }, (ok) => answers.push(ok));
  answerGmAlive({ id: 'unknown-sock' }, (ok) => answers.push(ok));
  answerGmAlive({ id: 'gm-alive-sock' }, undefined); // no ack asked: nothing to do

  assert.deepEqual(answers, [true, false]);
  signaling.removePeer('gm-alive-sock');
});
