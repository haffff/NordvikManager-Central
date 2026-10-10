'use strict';

const helmet = require('helmet');

// helmet() options for the security headers (see index.js).
module.exports = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // blob: is required for fabric.js canvas image rendering on the player client
      'img-src': ["'self'", 'data:', 'blob:'],
      // Playlist tracks and sounds are played from blob: object URLs
      'media-src': ["'self'", 'blob:'],
      // Cards run in sandboxed blob: iframes, which inherit this whole policy: the card
      // bridge is an inline script, addon JS/CSS arrive as data: URIs, and addon HTML may
      // use inline handlers. Temporary relaxation for the whole player client — the plan
      // is a dedicated sandbox page with its own policy, so the app itself can be strict again.
      'frame-src': ["'self'", 'blob:'],
      'script-src': ["'self'", "'unsafe-inline'", 'data:', 'blob:'],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': ["'self'", 'https:', "'unsafe-inline'", 'data:'],
    },
  },
};
