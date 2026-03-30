'use strict';

require('dotenv').config();

const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

// Run migration first so tables exist
const runMigration = require('./migrations/001_initial');
runMigration();

const db = require('./database');

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const email = process.env.ADMIN_EMAIL || null;

if (!username || !password) {
  console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE is_admin = 1').get();
if (existing) {
  console.log('[seed] Admin user already exists, skipping.');
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 12);
const id = randomUUID();

db.prepare(
  'INSERT INTO users (id, username, email, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)'
).run(id, username, email, hash);

console.log(`[seed] Admin user '${username}' created with id ${id}`);
