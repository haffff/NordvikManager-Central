'use strict';

require('./setupEnv');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseProtocol, checkGmProtocol } = require('../services/protocol');

test('parseProtocol accepts positive integers', () => {
  assert.equal(parseProtocol(1), 1);
  assert.equal(parseProtocol(42), 42);
});

test('parseProtocol rejects anything that is not a positive integer', () => {
  for (const value of [undefined, null, 0, -1, 1.5, NaN, Infinity, '1', '../x', {}, [], true]) {
    assert.equal(parseProtocol(value), null, `expected null for ${String(value)}`);
  }
});

test('checkGmProtocol passes a protocol at or above the minimum', () => {
  assert.deepEqual(checkGmProtocol(2, 2), { ok: true, protocol: 2 });
  assert.deepEqual(checkGmProtocol(3, 2), { ok: true, protocol: 3 });
});

test('checkGmProtocol rejects a protocol below the minimum with a message for the GM', () => {
  const result = checkGmProtocol(1, 2);
  assert.equal(result.ok, false);
  assert.match(result.error, /outdated/i);
  assert.match(result.error, /protocol 1/);
  assert.match(result.error, /minimum 2/);
});

test('checkGmProtocol treats a missing or invalid protocol as outdated', () => {
  for (const value of [undefined, 'abc', -3]) {
    const result = checkGmProtocol(value, 1);
    assert.equal(result.ok, false);
    assert.match(result.error, /outdated/i);
  }
});
