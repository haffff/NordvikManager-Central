'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setClientCacheHeaders } = require('../config/clientCache');

const headerFor = (filePath) => {
  const headers = {};
  setClientCacheHeaders({ setHeader: (name, value) => { headers[name] = value; } }, filePath);
  return headers['Cache-Control'];
};

test('a hashed build asset is kept for a year', () => {
  assert.equal(headerFor('/srv/static/client/assets/index-3f9aB1cd.js'), 'public, max-age=31536000, immutable');
  assert.equal(headerFor(String.raw`C:\srv\static\client\p2\assets\vendor-Ab_12-cdEF.css`), 'public, max-age=31536000, immutable');
});

test('pages are always revalidated', () => {
  assert.equal(headerFor('/srv/static/client/index.html'), 'no-cache');
  assert.equal(headerFor('/srv/static/client/p2/sandbox.html'), 'no-cache');
});

test('other files keep the default', () => {
  assert.equal(headerFor('/srv/static/client/favicon.ico'), undefined);
  assert.equal(headerFor('/srv/static/client/logo192.png'), undefined);
  assert.equal(headerFor('/srv/static/client/assets/notes.js'), undefined);
});
