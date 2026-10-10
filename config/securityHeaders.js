'use strict';

const helmet = require('helmet');

// CSP for everything we serve, the player client included.
const appDirectives = {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  // blob: is required for fabric.js canvas image rendering on the player client
  'img-src': ["'self'", 'data:', 'blob:'],
  // Playlist tracks and sounds are played from blob: object URLs
  'media-src': ["'self'", 'blob:'],
  // Cards are framed from the client's own sandbox.html (below)
  'frame-src': ["'self'"],
};

// The player client's card sandbox page (public/sandbox.html in the frontend). It's
// framed with sandbox="allow-scripts" (null origin, no access to the app) and writes
// the card's HTML into itself, so cards run under this policy, not the app's: the
// CardAPI bridge is an inline script, addon JS/CSS arrive as data: URIs, and addon
// HTML may use inline handlers.
const sandboxDirectives = {
  ...appDirectives,
  'script-src': ["'self'", "'unsafe-inline'", 'data:', 'blob:'],
  'script-src-attr': ["'unsafe-inline'"],
  'style-src': ["'self'", 'https:', "'unsafe-inline'", 'data:'],
  'media-src': ["'self'", 'data:', 'blob:'],
  'frame-src': ["'self'", 'blob:', 'data:'],
};

// /client/sandbox.html, and the same page in the frozen builds at /client/p<N>/.
const SANDBOX_PAGE = /^\/client\/(?:p\d+\/)?sandbox\.html$/;

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
