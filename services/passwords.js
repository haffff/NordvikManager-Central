'use strict';

const bcrypt = require('bcryptjs');

// Every password hash and check (accounts and game passwords) goes through here.
//
// bcryptjs is plain JavaScript: its async calls do the same work in small steps, so the
// event loop (signaling for running games, every other request) keeps going while a hash
// runs. They still use the CPU, so only MAX_RUNNING run at once. Past that a check is
// refused straight away (PasswordBusyError, a 503 for the client) instead of queueing: a
// flood of logins then fails fast rather than slowing everything down.
const MAX_RUNNING = Math.max(1, parseInt(process.env.PASSWORD_CHECKS_MAX || '4', 10) || 4);

let running = 0;

class PasswordBusyError extends Error {
  constructor() {
    super('The server is busy, please try again in a moment');
    this.name = 'PasswordBusyError';
    this.status = 503;
    this.expose = true;
    this.retryAfter = 5;
  }
}

const isBusy = (err) => err instanceof PasswordBusyError;

async function withSlot(work) {
  if (running >= MAX_RUNNING) throw new PasswordBusyError();
  running++;
  try {
    return await work();
  } finally {
    running--;
  }
}

function hash(plaintext, rounds) {
  return withSlot(() => bcrypt.hash(plaintext, rounds));
}

/** False for a wrong password and for a stored hash that isn't one. */
function compare(plaintext, hashed) {
  return withSlot(async () => {
    try {
      return await bcrypt.compare(plaintext, hashed);
    } catch {
      return false;
    }
  });
}

module.exports = { hash, compare, isBusy, PasswordBusyError, MAX_RUNNING };
