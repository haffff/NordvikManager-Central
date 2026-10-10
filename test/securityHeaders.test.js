'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const helmet = require('helmet');
const helmetOptions = require('../config/securityHeaders');

async function cspOf() {
  const app = express();
  app.use(helmet(helmetOptions));
  app.get('/', (req, res) => res.send('ok'));
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    return res.headers.get('content-security-policy');
  } finally {
    server.close();
  }
}

test('CSP lets the player client load images and audio from blob: URLs', async () => {
  const csp = await cspOf();

  assert.match(csp, /img-src 'self' data: blob:/);
  // Playlist tracks and sounds are played from blob: object URLs (PlaybackManager).
  assert.match(csp, /media-src 'self' blob:/);
});

test('CSP lets card iframes run: blob: frames inherit this policy for their own scripts and styles', async () => {
  const csp = await cspOf();

  assert.match(csp, /frame-src 'self' blob:/);
  // The card bridge is an inline script; addon JS and CSS come as data: URIs.
  assert.match(csp, /script-src 'self' 'unsafe-inline' data: blob:/);
  assert.match(csp, /script-src-attr 'unsafe-inline'/);
  assert.match(csp, /style-src 'self' https: 'unsafe-inline' data:/);
});
