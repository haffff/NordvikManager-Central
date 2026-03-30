'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const config = require('../config/config');
const db = require('../db/database');

const SALT_ROUNDS = 12;

function hashPassword(plaintext) {
  return bcrypt.hashSync(plaintext, SALT_ROUNDS);
}

function comparePassword(plaintext, hash) {
  return bcrypt.compareSync(plaintext, hash);
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin === 1,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      isAdmin: payload.isAdmin,
    };
  } catch {
    return null;
  }
}

function generateRefreshToken(userId) {
  const token = randomUUID();
  const now = new Date();
  const expiresMs = parseExpiry(config.refreshToken.expiresIn);
  const expiresAt = new Date(now.getTime() + expiresMs).toISOString();

  db.prepare(
    'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, userId, expiresAt);

  return token;
}

function rotateRefreshToken(oldToken) {
  const record = db
    .prepare(
      'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0'
    )
    .get(oldToken);

  if (!record) return null;
  if (new Date(record.expires_at) < new Date()) return null;

  // Revoke old token
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?').run(oldToken);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(record.user_id);
  if (!user) return null;

  const newRefreshToken = generateRefreshToken(user.id);
  const accessToken = generateAccessToken(user);
  return { accessToken, refreshToken: newRefreshToken, user };
}

function revokeRefreshTokensForUser(userId) {
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId);
}

function parseExpiry(expiry) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = String(expiry).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000; // default 7d
  return parseInt(match[1], 10) * units[match[2]];
}

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshTokensForUser,
};
