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
