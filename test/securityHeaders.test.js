'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const securityHeaders = require('../config/securityHeaders');

async function cspOf(path, options) {
  const app = express();
  app.use(securityHeaders(options));
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

// Html chat messages render in srcdoc frames, which inherit the app's policy. Which hosts
// they may load from is the GM's call (backend Security:SandboxAllowedOrigins); the client
// enforces that list in each message frame, so the page itself allows any https: image.
test("the app may show https: images (the GM's host list is enforced per chat message)", async () => {
  assert.equal(directive(await cspOf('/client/index.html'), 'img-src'), "img-src 'self' data: blob: https:");
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
  for (const path of ['/client/sandbox.html', '/client/p3/sandbox.html', '/client/demo/sandbox.html', '/client/dev/sandbox.html']) {
    const csp = await cspOf(path);

    assert.match(csp, /script-src 'self' 'unsafe-inline' data: blob:/, path);
    assert.match(csp, /script-src-attr 'unsafe-inline'/, path);
    assert.match(directive(csp, 'style-src'), /^style-src 'self' 'unsafe-inline' data:/, path);
    assert.match(csp, /frame-ancestors 'self'/, path);
  }
});

// Which hosts card code may reach is the GM's call (backend Security:SandboxAllowedOrigins):
// the client puts a CSP with that list first in each card's <head>, which can only tighten
// this one. So this page allows any https: host, and never plain http:.
test("the card sandbox page leaves the host list to the card's own CSP", async () => {
  const csp = await cspOf('/client/sandbox.html');

  assert.equal(directive(csp, 'connect-src'), "connect-src 'self' https:");
  assert.equal(directive(csp, 'img-src'), "img-src 'self' data: blob: https:");
  assert.equal(directive(csp, 'style-src'), "style-src 'self' 'unsafe-inline' data: https:");
  assert.equal(directive(csp, 'font-src'), "font-src 'self' data: https:");
  assert.equal(directive(csp, 'form-action'), "form-action 'none'");
});

test('only the sandbox page itself gets the looser policy', async () => {
  for (const path of ['/sandbox.html', '/client/x/sandbox.html', '/client/sandbox.html.map', '/client-admin/sandbox.html']) {
    const csp = await cspOf(path);

    assert.equal(directive(csp, 'script-src'), "script-src 'self'", path);
  }
});
