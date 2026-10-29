'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { parseTrustProxy } = require('../config/trustProxy');

test('production trusts one proxy hop by default, development none', () => {
  assert.equal(parseTrustProxy(undefined, true), 1);
  assert.equal(parseTrustProxy(undefined, false), false);
  assert.equal(parseTrustProxy('', true), 1);
});

test('TRUST_PROXY takes a hop count, true/false, or a list of addresses', () => {
  assert.equal(parseTrustProxy('2', true), 2);
  assert.equal(parseTrustProxy('0', true), 0);
  assert.equal(parseTrustProxy('false', true), false);
  assert.equal(parseTrustProxy('true', false), true);
  assert.equal(parseTrustProxy('loopback, 10.0.0.1', false), 'loopback, 10.0.0.1');
});

test('behind one proxy, the rate limit counts each forwarded client on its own', async () => {
  const app = express();
  app.set('trust proxy', parseTrustProxy(undefined, true));
  app.get('/', rateLimit({ windowMs: 60_000, limit: 1 }), (_req, res) => res.send('ok'));
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const get = (ip) => fetch(url, { headers: { 'X-Forwarded-For': ip } }).then((r) => r.status);
    assert.equal(await get('203.0.113.1'), 200);
    assert.equal(await get('203.0.113.2'), 200); // another client, not the same proxy IP
    assert.equal(await get('203.0.113.1'), 429);
  } finally {
    server.close();
  }
});
