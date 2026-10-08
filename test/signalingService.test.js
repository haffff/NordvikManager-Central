'use strict';

require('./setupEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const signaling = require('../services/signalingService');

function addGm(socketId, sessionId, protocol) {
  signaling.addPeer(socketId, { userId: 'u-gm', username: 'gm', isAdmin: false, sessionId, role: 'gm', traceId: 't-1' });
  signaling.registerGm(sessionId, socketId, protocol);
}

test('registerGm stores the GM protocol for the session', () => {
  addGm('gm-socket-1', 'session-1', 3);
  assert.equal(signaling.getGmProtocol('session-1'), 3);
  signaling.removePeer('gm-socket-1');
});

test('getGmProtocol is null when no GM is connected', () => {
  assert.equal(signaling.getGmProtocol('no-such-session'), null);
});

test('removing the GM peer clears its protocol', () => {
  addGm('gm-socket-2', 'session-2', 5);
  signaling.removePeer('gm-socket-2');
  assert.equal(signaling.getGmProtocol('session-2'), null);
});

test('addPeer keeps the traceId', () => {
  addGm('gm-socket-3', 'session-3', 1);
  assert.equal(signaling.getPeer('gm-socket-3').traceId, 't-1');
  signaling.removePeer('gm-socket-3');
});
