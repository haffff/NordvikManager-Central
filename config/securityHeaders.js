'use strict';

const helmet = require('helmet');

// Which outside hosts addon cards and Html chat messages may load from is the GM's call
// (the GM backend's Security:SandboxAllowedOrigins). The player client fetches that list
// and enforces it itself: a CSP first in each card's <head>, and one in each chat
// message frame. A CSP added there can only tighten these, so these allow any https:
// host (never plain http:) and leave the list to the client.

// CSP for everything we serve, the player client included.
const appDirectives = {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  // blob: is required for fabric.js canvas image rendering on the player client;
  // https: for Html chat messages (srcdoc frames inherit this policy), see above
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  // Playlist tracks and sounds are played from blob: object URLs
  'media-src': ["'self'", 'blob:'],
  // Cards are framed from the client's own sandbox.html (below)
  'frame-src': ["'self'"],
};

// The player client's card sandbox page (public/sandbox.html in the frontend). It's
// framed with sandbox="allow-scripts" (null origin, no access to the app) and writes
// the card's HTML into itself, so cards run under this policy, not the app's: the
// CardAPI bridge is an inline script, addon JS/CSS arrive as data: URIs, and addon
// HTML may use inline handlers. CSP can't cover WebRTC, so installing an addon still
// means trusting it.
const sandboxDirectives = {
  ...appDirectives,
  'script-src': ["'self'", "'unsafe-inline'", 'data:', 'blob:'],
  'script-src-attr': ["'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:', 'https:'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': ["'self'", 'https:'],
  'media-src': ["'self'", 'data:', 'blob:'],
  'frame-src': ["'self'", 'blob:', 'data:'],
  'form-action': ["'none'"],
};

// /client/sandbox.html, and the same page in the frozen builds at /client/p<N>/, in
// the public demo at /client/demo/, and the dev build at /client/dev/.
const SANDBOX_PAGE = /^\/client\/(?:p\d+\/|demo\/|dev\/)?sandbox\.html$/;

const options = (directives) => ({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: { directives },
});

/** Security headers middleware: the app's policy, or the card sandbox page's. */
module.exports = function securityHeaders() {
  const app = helmet(options(appDirectives));
  const sandbox = helmet(options(sandboxDirectives));
  return (req, res, next) => (SANDBOX_PAGE.test(req.path) ? sandbox : app)(req, res, next);
};
