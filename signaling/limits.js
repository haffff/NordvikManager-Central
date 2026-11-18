'use strict';

// Limits on signaling sockets, so connections alone can't wear the server down: how many
// one client address may hold open, and how long a socket may stay without authenticating.

/**
 * The client's address as Express's req.ip gives it, for a Socket.IO handshake request.
 * `trust` is the app's compiled TRUST_PROXY (app.get('trust proxy fn')): the addresses in
 * X-Forwarded-For are read from the nearest one outward and the first untrusted one wins, so
 * a client can't name itself by adding the header (only hops TRUST_PROXY trusts are believed).
 */
function clientAddress(req, trust) {
  const forwarded = (req.headers?.['x-forwarded-for'] || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .reverse();
  const addrs = [req.socket?.remoteAddress || '', ...forwarded];
  for (let i = 0; i < addrs.length - 1; i++) {
    if (!trust(addrs[i], i)) return addrs[i];
  }
  return addrs[addrs.length - 1];
}

/**
 * Socket.IO middleware: at most `max` open connections per client address (0 = no limit).
 * Generous by default: players behind one router share an address.
 */
function createConnectionLimiter({ max, trust }) {
  const open = new Map();
  return function limitConnections(socket, next) {
    if (!max) return next();
    const address = clientAddress(socket.request, trust);
    const count = open.get(address) ?? 0;
    if (count >= max) {
      const err = new Error('Too many connections from this address');
      err.data = { error: 'Too many connections from this address' };
      return next(err);
    }
    open.set(address, count + 1);
    socket.on('disconnect', () => {
      const left = (open.get(address) ?? 1) - 1;
      if (left > 0) open.set(address, left);
      else open.delete(address);
    });
    next();
  };
}

/** Disconnects `socket` if `isAuthenticated()` is still false after `ms` (0 = never). */
function requireAuthWithin(socket, ms, isAuthenticated) {
  if (!ms) return;
  const timer = setTimeout(() => {
    if (!isAuthenticated()) socket.disconnect(true);
  }, ms);
  timer.unref?.();
  socket.on('disconnect', () => clearTimeout(timer));
}

module.exports = { clientAddress, createConnectionLimiter, requireAuthWithin };
