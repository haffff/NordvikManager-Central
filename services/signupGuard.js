'use strict';

const { createHmac } = require('crypto');
const { createChallenge, verifySolution, extractParams } = require('altcha-lib/v1');
const config = require('../config/config');
const db = require('../db/database');
const logger = require('../logger');

// Guards open registration (routes/user.js register) against scripted signups:
//
// - A honeypot: a form field people never see or fill. A bot filling in the rendered form
//   fills it too. (A script posting JSON straight to the API never sends it.)
// - An ALTCHA proof-of-work puzzle: the client tries numbers until a hash matches. Central
//   signs each puzzle with its creation time, accepts each answer once, and only after a
//   moment (a person takes longer than that to fill in the form). A browser needs from a
//   fraction of a second to a few seconds (config.js); native code needs far less, so it
//   slows bots down rather than stopping them.
// - A daily cap on accounts registered without an invite: the backstop. Past it, open
//   registration waits, and the log says so once.

/** The honeypot's name: nothing a password manager or browser would fill in by itself. */
const HONEYPOT_FIELD = 'nmTrapField';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
// Answers already used, until their puzzle expires. Bounded: past it, new answers wait.
const MAX_REMEMBERED = 50000;

// The puzzles' signing key, derived from the JWT secret so no new setting is needed.
const hmacKey = createHmac('sha256', config.jwt.secret).update('nordvik-signup-challenge').digest('hex');

let minAgeMs = config.signupChallengeMinAgeMs;
const used = new Map(); // signature -> expiry (ms)
let warnedCapDay = null;

/** A new puzzle for the register form, or null while the guard is off. */
async function newChallenge() {
  if (!config.signupChallenge) return null;
  const challenge = await createChallenge({
    hmacKey,
    maxNumber: config.signupChallengeMaxNumber,
    expires: new Date(Date.now() + CHALLENGE_TTL_MS),
    params: { created: String(Date.now()) },
  });
  return { ...challenge, minAgeMs };
}

function forget(now) {
  for (const [signature, expires] of used) {
    if (expires > now) break; // inserted in order of expiry
    used.delete(signature);
  }
}

function decode(altcha) {
  if (typeof altcha !== 'string' || altcha.length > 2000) return null;
  try {
    const payload = JSON.parse(Buffer.from(altcha, 'base64').toString('utf8'));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Checks a registration's honeypot and puzzle answer. Resolves to null when it may go on,
 * or { status, error } for the client. A valid answer is used up here, before the caller
 * waits for anything else, so one answer registers one account at most.
 */
async function checkSignup(body) {
  if (body?.[HONEYPOT_FIELD]) {
    logger.warn('[signup] refused a registration that filled in the hidden field');
    return { status: 400, error: 'Registration failed' };
  }
  if (!config.signupChallenge) return null;

  const payload = decode(body?.altcha);
  if (!payload || !(await verifySolution(payload, hmacKey, true))) {
    return { status: 400, error: 'The registration check failed. Please reload the page and try again.' };
  }
  const created = parseInt(extractParams(payload).created, 10);
  const now = Date.now();
  if (!Number.isFinite(created) || now - created < minAgeMs) {
    return { status: 400, error: 'Please take a moment and try again.' };
  }

  // From here to used.set nothing waits, so two requests with one answer can't both pass.
  forget(now);
  if (used.has(payload.signature)) {
    return { status: 400, error: 'The registration check failed. Please reload the page and try again.' };
  }
  if (used.size >= MAX_REMEMBERED) {
    return { status: 503, error: 'Registration is busy, please try again in a few minutes.' };
  }
  used.set(payload.signature, created + CHALLENGE_TTL_MS);
  return null;
}

/** True while the accounts made in the last 24 hours reach SIGNUP_DAILY_LIMIT. */
function dailyCapReached() {
  const limit = config.signupDailyLimit;
  if (!limit) return false;
  // created_at is datetime('now') text: compared in SQL, in the same format.
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= datetime('now', '-1 day')").get();
  if (count < limit) return false;
  const day = new Date().toISOString().slice(0, 10);
  if (warnedCapDay !== day) {
    warnedCapDay = day;
    logger.warn(`[signup] the daily cap of ${limit} new accounts was reached: open registration waits (SIGNUP_DAILY_LIMIT)`);
  }
  return true;
}

const DAILY_CAP_ERROR = { status: 429, error: 'Registration is closed for today. Please try again later.' };

module.exports = {
  HONEYPOT_FIELD,
  newChallenge,
  checkSignup,
  dailyCapReached,
  DAILY_CAP_ERROR,
  setMinAgeMsForTests: (ms) => { minAgeMs = ms; },
};
