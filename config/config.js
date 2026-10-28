'use strict';

const path = require('path');

require('dotenv').config();

const required = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

function splitList(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

const config = Object.freeze({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },

  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  dbPath: process.env.DB_PATH || './data/nordvik.db',

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim()),

  allowPublicGames: process.env.ALLOW_PUBLIC_GAMES === 'true',

  // ICE servers handed to WebRTC peers. TURN is enabled only when TURN_URLS and TURN_SECRET are both set;
  // TURN_SECRET must match coturn's static-auth-secret (see coturn/turnserver.conf).
  stunServers: splitList(process.env.STUN_SERVERS),
  turn: {
    urls: splitList(process.env.TURN_URLS),
    secret: process.env.TURN_SECRET || null,
    ttlSeconds: parseInt(process.env.TURN_TTL_SECONDS || '86400', 10),
  },

  // Lowest GM backend protocol version allowed to start a session (see services/protocol.js).
  minGmProtocol: parseInt(process.env.MIN_GM_PROTOCOL || '1', 10),

  // Optional log level override. If not set, defaults to 'debug' in development and 'info' in production.
  logLevel: process.env.LOG_LEVEL || null,

  // Built docs site (docs-site/build) served at /quickstart, /user-guide, /documentation and
  // /addon-guide. On the hosting, point it at the folder the docs deploy uploads to (DOCS_FTP_DIR).
  docsDir: process.env.DOCS_DIR || path.join(__dirname, '..', 'docs-site', 'build'),

  // The addon registry (addons.json) the public addons page (/addons, via /api/addons) shows.
  addonRegistryUrl: process.env.ADDON_REGISTRY_URL
    || 'https://raw.githubusercontent.com/haffff/NordvikManager-Addons/main/addons.json',

  // GitHub repo whose releases the landing page's Download section offers (via /api/releases),
  // and an optional token for GitHub's API (raises its rate limit; replies are cached anyway).
  releasesRepo: process.env.RELEASES_REPO || 'haffff/NordvikManager',
  githubToken: process.env.GITHUB_TOKEN || null,
});

module.exports = config;
