'use strict';

// Must be required before anything that loads config/config.js.
// dotenv never overrides variables that are already set, so these win over .env.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret';
process.env.DB_PATH = ':memory:';
process.env.LOG_LEVEL = 'error';
