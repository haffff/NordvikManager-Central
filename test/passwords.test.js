'use strict';

require('./setupEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const passwords = require('../services/passwords');
const authService = require('../services/authService');

// Password hashes are slow on purpose. Hashed synchronously, each login or registration
// stopped the whole server for its duration (signaling for running games included), so a
// spread-out flood of logins could stall every game. Now they run in steps that let other
// work in, and only a few run at once: past that, the request is turned away at once
// (503) rather than queueing CPU work.

test('hashing lets other work run in between', async () => {
  let last = Date.now();
  let longestGap = 0;
  const timer = setInterval(() => {
    const now = Date.now();
    longestGap = Math.max(longestGap, now - last);
    last = now;
  }, 5);

  const started = Date.now();
  const hash = await authService.hashPassword('secret-pw');
  const took = Date.now() - started;
  clearInterval(timer);

  assert.ok(await authService.comparePassword('secret-pw', hash));
  assert.equal(await authService.comparePassword('wrong', hash), false);
  assert.ok(longestGap < took / 2, `the loop waited ${longestGap} ms of a ${took} ms hash`);
});

test('past the cap, a password check is refused at once instead of queueing', async () => {
  const running = Array.from({ length: passwords.MAX_RUNNING }, () => passwords.hash('pw', 4));

  await assert.rejects(passwords.hash('pw', 4), (err) => passwords.isBusy(err));
  await assert.rejects(passwords.compare('pw', '$2b$04$abcdefghijklmnopqrstuuJ0zJ7P6bQqjO6vVJ7Cq2e1b2yQZ5lq'), (err) => passwords.isBusy(err));

  await Promise.all(running);
  assert.ok(await passwords.hash('pw', 4));
});

test('a failed check frees its place', async () => {
  for (let i = 0; i < passwords.MAX_RUNNING + 2; i++)
    assert.equal(await passwords.compare('pw', 'not a hash'), false);
  assert.ok(await passwords.hash('pw', 4));
});
