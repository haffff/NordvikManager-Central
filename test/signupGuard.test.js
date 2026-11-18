'use strict';

require('./setupEnv');
// Open registration with the signup guard on, a small puzzle, no minimum age by default
// (one test sets it), and a low daily cap.
process.env.NO_INVITATION = 'true';
process.env.SIGNUP_CHALLENGE = 'true';
process.env.SIGNUP_CHALLENGE_MAX_NUMBER = '200';
process.env.SIGNUP_CHALLENGE_MIN_AGE_MS = '0';
process.env.SIGNUP_DAILY_LIMIT = '40';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const { solveChallenge } = require('altcha-lib/v1');
const db = require('../db/database');
const runMigration = require('../db/migrations/001_initial');
const inviteService = require('../services/inviteService');
const signupGuard = require('../services/signupGuard');
const mountRoutes = require('../routes/index');
const errorHandler = require('../middleware/errorHandler');

// Open registration is guarded three ways: a hidden form field a person never fills (the
// honeypot), a small proof-of-work puzzle (ALTCHA) that is signed by Central, used once
// and must be at least a moment old, and a cap on accounts made in a day. The cap is the
// backstop: a puzzle costs a native bot little.

let server;
let baseUrl;
let ip = 0;

before(async () => {
  runMigration();
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(cookieParser());
  mountRoutes(app);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  process.env.NO_INVITATION = 'true';
  signupGuard.setMinAgeMsForTests(0);
});

const from = () => `10.9.${Math.floor(++ip / 250)}.${ip % 250}`;

async function solved() {
  const res = await fetch(`${baseUrl}/api/user/signupchallenge`, { headers: { 'X-Forwarded-For': from() } });
  assert.equal(res.status, 200);
  const challenge = await res.json();
  const solution = await solveChallenge(challenge.challenge, challenge.salt, challenge.algorithm, challenge.maxnumber).promise;
  const payload = { algorithm: challenge.algorithm, challenge: challenge.challenge, number: solution.number, salt: challenge.salt, signature: challenge.signature };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

const register = (UserName, extra = {}) =>
  fetch(`${baseUrl}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': from() },
    body: JSON.stringify({ UserName, password: 'secret-pw', confirmPassword: 'secret-pw', ...extra }),
  });

test('meta says whether registering needs the puzzle', async () => {
  const meta = await (await fetch(`${baseUrl}/api/meta`)).json();
  assert.equal(meta.signupChallenge, true);
});

test('a solved puzzle registers', async () => {
  assert.equal((await register('guard_ok', { altcha: await solved() })).status, 201);
});

test('without the puzzle, or with a wrong answer, registering is refused', async () => {
  assert.equal((await register('guard_none')).status, 400);
  const wrong = JSON.parse(Buffer.from(await solved(), 'base64').toString());
  wrong.number += 1;
  assert.equal((await register('guard_wrong', { altcha: Buffer.from(JSON.stringify(wrong)).toString('base64') })).status, 400);
  assert.equal((await register('guard_junk', { altcha: 'not base64 json' })).status, 400);
});

test('one solved puzzle registers one account, however many use it at once', async () => {
  const altcha = await solved();

  const results = await Promise.all([1, 2, 3, 4, 5].map((n) => register(`guard_replay_${n}`, { altcha })));

  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400, 400, 400, 400]);
});

test('a puzzle answered too soon after it was handed out is refused', async () => {
  signupGuard.setMinAgeMsForTests(60 * 1000);

  const res = await register('guard_fast', { altcha: await solved() });

  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /moment/i);
});

test('the hidden field filled in is refused, with nothing saying why', async () => {
  const res = await register('guard_bot', { altcha: await solved(), [signupGuard.HONEYPOT_FIELD]: 'http://spam.example' });

  assert.equal(res.status, 400);
  assert.doesNotMatch((await res.json()).error, /field|honeypot|bot/i);
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM users WHERE username = 'guard_bot'").get().c, 0);
});

test('past the daily cap, open registration waits; an invite still registers', async () => {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= datetime('now', '-1 day')").get();
  const insert = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');
  for (let i = count; i < 40; i++) insert.run(randomUUID(), `filler_${i}`, 'x');

  const res = await register('guard_capped', { altcha: await solved() });
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /today|later/i);

  process.env.NO_INVITATION = 'false';
  const admin = db.prepare('SELECT id FROM users LIMIT 1').get().id;
  const code = inviteService.generateInvite(admin, 24, 1);
  assert.equal((await register('guard_invited', { altcha: await solved(), inviteCode: code })).status, 201);
});

test('accounts older than a day no longer count toward the cap', async () => {
  db.prepare("UPDATE users SET created_at = datetime('now', '-2 days') WHERE username LIKE 'filler_%'").run();

  assert.equal((await register('guard_next_day', { altcha: await solved() })).status, 201);
});
