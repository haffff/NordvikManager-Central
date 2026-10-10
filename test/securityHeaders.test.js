'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const securityHeaders = require('../config/securityHeaders');

async function cspOf(path) {
  const app = express();
  app.use(securityHeaders());
  app.use((req, res) => res.send('ok'));
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`);
    return res.headers.get('content-security-policy');
  } finally {
    server.close();
  }
}

const directive = (csp, name) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' '));

test('the app may load images and audio from blob: URLs', async () => {
  const csp = await cspOf('/client/index.html');

  assert.match(csp, /img-src 'self' data: blob:/);
  // Playlist tracks and sounds are played from blob: object URLs (PlaybackManager).
  assert.match(csp, /media-src 'self' blob:/);
});

test('the app itself runs no inline or data: scripts, and frames only its own pages', async () => {
  for (const path of ['/client/index.html', '/client/p3/index.html', '/api/meta']) {
    const csp = await cspOf(path);

    assert.equal(directive(csp, 'script-src'), "script-src 'self'", path);
    assert.equal(directive(csp, 'script-src-attr'), "script-src-attr 'none'", path);
    assert.equal(directive(csp, 'frame-src'), "frame-src 'self'", path);
  }
});

test('the card sandbox page lets cards run inline and data: scripts and styles', async () => {
  for (const path of ['/client/sandbox.html', '/client/p3/sandbox.html']) {
    const csp = await cspOf(path);

    assert.match(csp, /script-src 'self' 'unsafe-inline' data: blob:/, path);
    assert.match(csp, /script-src-attr 'unsafe-inline'/, path);
    assert.match(csp, /style-src 'self' https: 'unsafe-inline' data:/, path);
    assert.match(csp, /frame-ancestors 'self'/, path);
  }
});

test('only the sandbox page itself gets the looser policy', async () => {
  for (const path of ['/sandbox.html', '/client/x/sandbox.html', '/client/sandbox.html.map', '/client-admin/sandbox.html']) {
    const csp = await cspOf(path);

    assert.equal(directive(csp, 'script-src'), "script-src 'self'", path);
  }
});
