'use strict';

require('./setupEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { clientAddress, createConnectionLimiter, requireAuthWithin } = require('../signaling/limits');

// Limits on the signaling socket: how many connections one client address may hold open,
// and how long a socket may stay connected without authenticating. The address is read as
// Express reads req.ip, with the same TRUST_PROXY, so the limits see clients, not the proxy.

const trustFor = (setting) => {
  const app = express();
  app.set('trust proxy', setting);
  return app.get('trust proxy fn');
};

const request = (remoteAddress, forwardedFor) => ({
  headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
  socket: { remoteAddress },
});

function fakeSocket(req) {
  const handlers = {};
  return {
    request: req,
    disconnected: false,
    on(event, fn) { (handlers[event] ??= []).push(fn); },
    disconnect() { this.disconnected = true; },
    leave() { (handlers.disconnect ?? []).forEach((fn) => fn('client namespace disconnect')); },
  };
}

test('the client address: behind one trusted proxy, the address it forwarded', () => {
  assert.equal(clientAddress(request('127.0.0.1', '203.0.113.7'), trustFor(1)), '203.0.113.7');
});

test('the client address: a forwarded address from an untrusted peer is ignored', () => {
  assert.equal(clientAddress(request('198.51.100.9', '203.0.113.7'), trustFor(false)), '198.51.100.9');
});

test('the client address: a client adding its own X-Forwarded-For gets one hop only', () => {
  // The proxy appends the real address; a forged one in front of it isn't believed.
  assert.equal(clientAddress(request('127.0.0.1', '1.2.3.4, 203.0.113.7'), trustFor(1)), '203.0.113.7');
});

test('one address may hold up to the limit of connections, more are refused', () => {
  const limit = createConnectionLimiter({ max: 2, trust: trustFor(false) });
  const results = [];
  const sockets = [1, 2, 3].map(() => fakeSocket(request('198.51.100.1')));
  for (const s of sockets) limit(s, (err) => results.push(err ? err.message : 'ok'));

  assert.deepEqual(results.slice(0, 2), ['ok', 'ok']);
  assert.match(results[2], /too many connections/i);

  // Another address isn't affected, and a closed connection frees its place.
  limit(fakeSocket(request('198.51.100.2')), (err) => results.push(err ? 'refused' : 'other ok'));
  sockets[0].leave();
  limit(fakeSocket(request('198.51.100.1')), (err) => results.push(err ? 'refused' : 'freed ok'));
  assert.deepEqual(results.slice(3), ['other ok', 'freed ok']);
});

test('a socket whose address is unknown is not limited (rather than all sharing one place)', () => {
  const limit = createConnectionLimiter({ max: 1, trust: trustFor(false) });
  let refused = 0;
  for (let i = 0; i < 5; i++) limit(fakeSocket({ headers: {}, socket: {} }), (err) => { if (err) refused++; });
  assert.equal(refused, 0);
});

test('a limit of 0 turns it off', () => {
  const limit = createConnectionLimiter({ max: 0, trust: trustFor(false) });
  let refused = 0;
  for (let i = 0; i < 50; i++) limit(fakeSocket(request('198.51.100.3')), (err) => { if (err) refused++; });
  assert.equal(refused, 0);
});

test('a socket that never authenticates is dropped after the timeout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const idle = fakeSocket(request('198.51.100.4'));
  const authed = fakeSocket(request('198.51.100.4'));
  const left = fakeSocket(request('198.51.100.4'));
  requireAuthWithin(idle, 1000, () => false);
  requireAuthWithin(authed, 1000, () => true);
  requireAuthWithin(left, 1000, () => false);
  left.leave();
  left.disconnected = false;

  t.mock.timers.tick(999);
  assert.equal(idle.disconnected, false);
  t.mock.timers.tick(1);

  assert.equal(idle.disconnected, true);
  assert.equal(authed.disconnected, false);
  assert.equal(left.disconnected, false);
});
