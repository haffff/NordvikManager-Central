'use strict';

require('dotenv').config();

const required = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
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

  // Optional log level override. If not set, defaults to 'debug' in development and 'info' in production.
  logLevel: process.env.LOG_LEVEL || null,
});

module.exports = config;
