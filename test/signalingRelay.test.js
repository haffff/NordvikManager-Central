'use strict';

require('./setupEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const signaling = require('../services/signalingService');
const EVENTS = require('../signaling/events');
const { relayOffer, relayAnswer, relayIceCandidate } = require('../signaling/relay');

// The GM backend learns who sent an offer from the relay itself, so it can answer a player
// whose peer-joined it never saw (the player joined before the backend reached signaling).

function fakeIo() {
  const sent = [];
  return { sent, to: (room) => ({ emit: (event, data) => sent.push({ room, event, data }) }) };
}

test('an offer reaches its target with the sender\'s user', () => {
  signaling.addPeer('player-sock', { userId: 'u-player', username: 'alice', isAdmin: false, sessionId: 's-relay', role: 'player' });
  signaling.addPeer('gm-sock', { userId: 'u-gm', username: 'gm', isAdmin: false, sessionId: 's-relay', role: 'gm' });
  signaling.registerGm('s-relay', 'gm-sock', 2);
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

// Players talk to the GM backend only. Relaying answers and ICE between any two members let
// a player answer another player's offer before the GM did, and so stand in for the GM.
function session(id) {
  const gm = `${id}-gm`, alice = `${id}-alice`, bob = `${id}-bob`;
  signaling.addPeer(gm, { userId: 'u-gm', username: 'gm', isAdmin: false, sessionId: id, role: 'gm' });
  signaling.registerGm(id, gm, 2);
  signaling.addPeer(alice, { userId: 'u-a', username: 'alice', isAdmin: false, sessionId: id, role: 'player' });
  signaling.addPeer(bob, { userId: 'u-b', username: 'bob', isAdmin: false, sessionId: id, role: 'player' });
  return { gm, alice, bob, done: () => [gm, alice, bob].forEach((s) => signaling.removePeer(s)) };
}
const answer = { type: 'answer', sdp: 'v=0' };
const offer = { type: 'offer', sdp: 'v=0' };
const candidate = { candidate: 'candidate:1 1 udp 1 10.0.0.1 9 typ host' };

test('an offer goes from a player to the GM only, never to another player', () => {
  const s = session('s-offer');
  const io = fakeIo();

  relayOffer(io, { id: s.alice }, { targetPeerId: s.bob, offer });
  relayOffer(io, { id: s.gm }, { targetPeerId: s.alice, offer });
  assert.deepEqual(io.sent, []);

  relayOffer(io, { id: s.alice }, { targetPeerId: s.gm, offer });
  assert.deepEqual(io.sent.map((m) => m.room), [s.gm]);
  s.done();
});

test('an answer goes from the GM to a player only', () => {
  const s = session('s-answer');
  const io = fakeIo();

  relayAnswer(io, { id: s.bob }, { targetPeerId: s.alice, answer });
  relayAnswer(io, { id: s.alice }, { targetPeerId: s.gm, answer });
  relayAnswer(io, { id: 'stranger' }, { targetPeerId: s.alice, answer });
  assert.deepEqual(io.sent, []);

  relayAnswer(io, { id: s.gm }, { targetPeerId: s.alice, answer });
  assert.deepEqual(io.sent, [{ room: s.alice, event: EVENTS.WEBRTC_ANSWER, data: { fromPeerId: s.gm, answer } }]);
  s.done();
});

test('a GM socket that was replaced can no longer answer', () => {
  const s = session('s-old-gm');
  signaling.addPeer('s-old-gm-new', { userId: 'u-gm', username: 'gm', isAdmin: false, sessionId: 's-old-gm', role: 'gm' });
  signaling.registerGm('s-old-gm', 's-old-gm-new', 2);
  const io = fakeIo();

  relayAnswer(io, { id: s.gm }, { targetPeerId: s.alice, answer });

  assert.deepEqual(io.sent, []);
  signaling.removePeer('s-old-gm-new');
  s.done();
});

test('ICE candidates go between the GM and a player, either way, never between players', () => {
  const s = session('s-ice');
  const io = fakeIo();

  relayIceCandidate(io, { id: s.alice }, { targetPeerId: s.bob, candidate });
  relayIceCandidate(io, { id: s.bob }, { targetPeerId: s.alice, candidate });
  assert.deepEqual(io.sent, []);

  relayIceCandidate(io, { id: s.alice }, { targetPeerId: s.gm, candidate });
  relayIceCandidate(io, { id: s.gm }, { targetPeerId: s.bob, candidate });
  assert.deepEqual(io.sent.map((m) => [m.room, m.data.fromPeerId]), [[s.gm, s.alice], [s.bob, s.gm]]);
  s.done();
});
