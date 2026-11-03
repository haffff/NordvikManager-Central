'use strict';

require('./setupEnv');
const { test, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const config = require('../config/config');
const authService = require('../services/authService');
const sessionService = require('../services/gameSessionService');
const signaling = require('../services/signalingService');
const EVENTS = require('../signaling/events');
const { handleAuthenticate, MAX_AUTH_FAILURES } = require('../signaling/authenticate');

// The authenticate handler, driven with fake sockets: what a GM backend or player
// gets back when its token is stale, when it reconnects, and when it uses a ticket.

function createUser(name) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, name, 'x');
  return { id, username: name, email: null, is_admin: 0 };
}

// Records what a handler sends; rooms[room] collects broadcasts to that room.
function fakeIo() {
  const sockets = new Map();
  const rooms = {};
  return {
    sockets: { sockets },
    rooms,
    to(room) {
      return { emit: (event, data) => (rooms[room] ??= []).push({ event, data }) };
    },
  };
}

function fakeSocket(io, id = randomUUID()) {
  const socket = {
    id,
    data: {},
    connected: true,
    emitted: [],
    joined: [],
    emit(event, data) { socket.emitted.push({ event, data }); },
    disconnect() { socket.connected = false; },
    join(room) { socket.joined.push(room); },
    to(room) { return io.to(room); },
  };
  io.sockets.sockets.set(id, socket);
  return socket;
}

const events = (socket, name) => socket.emitted.filter((e) => e.event === name);
const expiredToken = (user) =>
  jwt.sign({ sub: user.id, username: user.username, isAdmin: false }, config.jwt.secret, { expiresIn: -10 });

let owner;
let player;
let io;

before(() => {
  runMigration();
  owner = createUser('auth-owner');
  player = createUser('auth-player');
});

beforeEach(() => {
  io = fakeIo();
  signaling.setIo(io);
});

test('an expired token is refused but the socket stays open, so the client can refresh and retry', () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const socket = fakeSocket(io);

  handleAuthenticate(io, socket, { token: expiredToken(player), sessionId: session.id, role: 'player' });

  assert.equal(events(socket, EVENTS.AUTH_ERROR).length, 1);
  assert.equal(socket.connected, true);

  handleAuthenticate(io, socket, { token: authService.generateAccessToken(player), sessionId: session.id, role: 'player' });
  assert.equal(events(socket, EVENTS.AUTHENTICATED).length, 1);
});

test(`a socket that keeps sending bad tokens is dropped after ${MAX_AUTH_FAILURES} tries`, () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const socket = fakeSocket(io);

  for (let i = 0; i < MAX_AUTH_FAILURES; i++) {
    assert.equal(socket.connected, true);
    handleAuthenticate(io, socket, { token: 'garbage', sessionId: session.id, role: 'player' });
  }
  assert.equal(socket.connected, false);
});

test('the owner reconnecting as GM replaces its stale GM socket instead of being refused', () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const token = authService.generateAccessToken(owner);
  const oldGm = fakeSocket(io);
  handleAuthenticate(io, oldGm, { token, sessionId: session.id, role: 'gm', protocol: 2 });
  assert.equal(signaling.getGmSocket(session.id), oldGm.id);

  const newGm = fakeSocket(io);
  handleAuthenticate(io, newGm, { token, sessionId: session.id, role: 'gm', protocol: 2 });

  assert.equal(events(newGm, EVENTS.AUTHENTICATED).length, 1);
  assert.equal(signaling.getGmSocket(session.id), newGm.id);
  // The old connection is told why (so its backend stops reconnecting) and closed.
  assert.equal(events(oldGm, EVENTS.AUTH_ERROR).length, 1);
  assert.equal(oldGm.connected, false);
  assert.equal(signaling.getPeer(oldGm.id), null);
  // Players learn the old GM peer is gone, so they pick up the new one.
  const left = (io.rooms[`session:${session.id}`] ?? []).filter((e) => e.event === EVENTS.PEER_LEFT);
  assert.deepEqual(left.map((e) => e.data.peerId), [oldGm.id]);
  signaling.removePeer(newGm.id);
});

test('a GM signaling ticket authenticates the owner as GM of that session', () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const ticket = authService.generateSignalingTicket(owner.id, session.id);
  const gm = fakeSocket(io);

  handleAuthenticate(io, gm, { token: ticket, sessionId: session.id, role: 'gm', protocol: 2 });

  assert.equal(events(gm, EVENTS.AUTHENTICATED).length, 1);
  assert.equal(signaling.getGmSocket(session.id), gm.id);
  assert.equal(signaling.getPeer(gm.id).username, owner.username);
  signaling.removePeer(gm.id);
});

test('a GM signaling ticket is refused for another session and for the player role', () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const other = sessionService.createSession(owner.id, { name: 'Other' });
  const ticket = authService.generateSignalingTicket(owner.id, session.id);

  const wrongSession = fakeSocket(io);
  handleAuthenticate(io, wrongSession, { token: ticket, sessionId: other.id, role: 'gm', protocol: 2 });
  assert.equal(events(wrongSession, EVENTS.AUTHENTICATED).length, 0);

  const asPlayer = fakeSocket(io);
  handleAuthenticate(io, asPlayer, { token: ticket, sessionId: session.id, role: 'player' });
  assert.equal(events(asPlayer, EVENTS.AUTHENTICATED).length, 0);
});

test('a GM signaling ticket is not an access token', () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const ticket = authService.generateSignalingTicket(owner.id, session.id);

  assert.equal(authService.verifyAccessToken(ticket), null);
  assert.equal(authService.verifySignalingTicket(authService.generateAccessToken(owner), session.id), null);
  assert.equal(authService.verifySignalingTicket(ticket, session.id).id, owner.id);
});

test('evicting an unresponsive GM tells the session the GM peer left', async () => {
  const session = sessionService.createSession(owner.id, { name: 'G' });
  const gm = fakeSocket(io);
  // Never acknowledges a ping.
  gm.timeout = () => ({ emit: (_event, cb) => cb(new Error('timeout')) });
  handleAuthenticate(io, gm, { token: authService.generateAccessToken(owner), sessionId: session.id, role: 'gm', protocol: 2 });

  for (let i = 0; i < 3; i++) await signaling.pingGmSocket(session.id);

  assert.equal(gm.connected, false);
  assert.equal(signaling.getGmSocket(session.id), null);
  const left = (io.rooms[`session:${session.id}`] ?? []).filter((e) => e.event === EVENTS.PEER_LEFT);
  assert.deepEqual(left.map((e) => e.data.peerId), [gm.id]);
});

test('a GM connecting marks its session as seen, so session expiry keeps it', () => {
  const session = sessionService.createSession(owner.id, { name: 'Seen' });
  db.prepare('UPDATE game_sessions SET last_gm_seen_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', session.id);
  const gm = fakeSocket(io);

  handleAuthenticate(io, gm, { token: authService.generateSignalingTicket(owner.id, session.id), sessionId: session.id, role: 'gm', protocol: 2 });

  assert.equal(events(gm, EVENTS.AUTHENTICATED).length, 1);
  const seen = Date.parse(sessionService.getSessionById(session.id).last_gm_seen_at);
  assert.ok(Date.now() - seen < 5000);
});
