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
    },
  },
};
