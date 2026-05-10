'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const rateLimit = require('express-rate-limit');

const db = require('../db/database');
const authService = require('../services/authService');
const inviteService = require('../services/inviteService');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const config = require('../config/config');

const router = express.Router();
const PAGE_SIZE = 10;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later' },
});

function setCookieToken(res, token) {
  res.cookie('Authorization', token, {
    httpOnly: true,
    sameSite: config.isProduction ? 'None' : 'Lax',
    secure: config.isProduction,
    maxAge: 15 * 60 * 1000,
  });
}

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// POST /api/user/login
router.post(
  '/login',
  loginLimiter,
  [
    body('UserName').trim().notEmpty().isLength({ max: 100 }),
    body('password').notEmpty().isLength({ max: 128 }),
  ],
  validate,
  (req, res) => {
    const { UserName, password } = req.body;

    const user = db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .get(UserName);

    if (!user || !authService.comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user.id);

    setCookieToken(res, accessToken);
    res.json({ refreshToken, accessToken });
  }
);

// GET /api/user/checklogin
router.get('/checklogin', auth, (_req, res) => {
  res.sendStatus(200);
});

// GET /api/user/logout
router.get('/logout', auth, (req, res) => {
  authService.revokeRefreshTokensForUser(req.user.id);
  res.clearCookie('Authorization');
  res.sendStatus(200);
});

// GET /api/user/userinfo
router.get('/userinfo', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    admin: user.is_admin === 1,
    userName: user.username,
    email: user.email,
  });
});

// POST /api/user/register
router.post(
  '/register',
  registerLimiter,
  [
    body('UserName').trim().notEmpty().isLength({ max: 100 }).matches(/^[a-zA-Z0-9_]+$/),
    body('password').notEmpty().isLength({ min: 6, max: 128 }),
    body('confirmPassword').notEmpty(),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('inviteCode').if(() => process.env.NO_INVITATION !== 'true').trim().notEmpty(),
  ],
  validate,
  (req, res) => {
    const { UserName, password, confirmPassword, email, inviteCode } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    //check configuration of nodejs if invitation is required 
    if (process.env.NO_INVITATION !== 'true') {
      if (!inviteService.validateInvite(inviteCode)) {
        return res.status(400).json({ error: 'Invalid or expired invite code' });
      }
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
      .get(UserName);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const id = randomUUID();
    const hash = authService.hashPassword(password);

    db.prepare(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(id, UserName, email || null, hash);

    inviteService.consumeInvite(inviteCode);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(id);

    setCookieToken(res, accessToken);
    res.status(201).json({ refreshToken, accessToken });
  }
);

// GET /api/user/CheckRegistrationKey
router.get(
  '/CheckRegistrationKey',
  [query('key').trim().notEmpty()],
  validate,
  (req, res) => {
    const valid = inviteService.validateInvite(req.query.key);
    if (!valid) return res.status(400).json({ error: 'Invalid or expired invite code' });
    res.sendStatus(200);
  }
);

// GET /api/user/GenerateInvite
router.get(
  '/GenerateInvite',
  auth,
  requireAdmin,
  [query('hours').optional().isInt({ min: 1, max: 720 }).toInt()],
  validate,
  (req, res) => {
    const hours = req.query.hours || 24;
    const key = inviteService.generateInvite(req.user.id, hours);
    res.json({ key });
  }
);

// GET /api/user/invites
router.get('/invites', auth, requireAdmin, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  res.json(inviteService.listInvites(page));
});

// DELETE /api/user/deleteinvite
router.delete(
  '/deleteinvite',
  auth,
  requireAdmin,
  [query('key').trim().notEmpty()],
  validate,
  (req, res) => {
    const deleted = inviteService.deleteInvite(req.query.key);
    if (!deleted) return res.status(404).json({ error: 'Invite not found' });
    res.sendStatus(200);
  }
);

// GET /api/user/users
router.get('/users', auth, requireAdmin, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;
  const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const data = db
    .prepare(
      `SELECT id, username, email, is_admin, nickname, avatar_url, created_at
       FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(PAGE_SIZE, offset);

  const mapped = data.map((u) => ({
    id: u.id,
    userName: u.username,
    email: u.email,
    admin: u.is_admin === 1,
    nickname: u.nickname,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
  }));

  res.json({ data: mapped, page, total, count: mapped.length });
});

// DELETE /api/user/deleteuser
router.delete(
  '/deleteuser',
  auth,
  requireAdmin,
  [query('userID').trim().notEmpty()],
  validate,
  (req, res) => {
    if (req.query.userID === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.query.userID);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.sendStatus(200);
  }
);

// POST /api/user/createuser
router.post(
  '/createuser',
  auth,
  requireAdmin,
  [
    body('userName').trim().notEmpty().isLength({ max: 100 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('password').notEmpty().isLength({ min: 6, max: 128 }),
    body('isAdmin').optional().isBoolean().toBoolean(),
  ],
  validate,
  (req, res) => {
    const { userName, email, password, isAdmin } = req.body;

    const existing = db
      .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
      .get(userName);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const id = randomUUID();
    const hash = authService.hashPassword(password);

    db.prepare(
      'INSERT INTO users (id, username, email, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).run(id, userName, email || null, hash, isAdmin ? 1 : 0);

    res.status(201).json({ id });
  }
);

// POST /api/user/resetpassword
router.post(
  '/resetpassword',
  auth,
  requireAdmin,
  [
    body('userID').trim().notEmpty(),
    body('newPassword').notEmpty().isLength({ min: 6, max: 128 }),
  ],
  validate,
  (req, res) => {
    const { userID, newPassword } = req.body;
    const hash = authService.hashPassword(newPassword);
    const result = db
      .prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hash, userID);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    authService.revokeRefreshTokensForUser(userID);
    res.sendStatus(200);
  }
);

// POST /api/user/toggleadmin
router.post(
  '/toggleadmin',
  auth,
  requireAdmin,
  [body('userID').trim().notEmpty(), body('isAdmin').isBoolean().toBoolean()],
  validate,
  (req, res) => {
    const { userID, isAdmin } = req.body;
    if (userID === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own admin status' });
    }
    const result = db
      .prepare('UPDATE users SET is_admin = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(isAdmin ? 1 : 0, userID);
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.sendStatus(200);
  }
);

// GET /api/user/KeyboardBindings
router.get('/KeyboardBindings', auth, (req, res) => {
  const user = db
    .prepare('SELECT key_bindings FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    res.json(JSON.parse(user.key_bindings || '{}'));
  } catch {
    res.json({});
  }
});

// POST /api/user/KeyboardBindings
router.post(
  '/KeyboardBindings',
  auth,
  [body().isObject()],
  validate,
  (req, res) => {
    const bindings = req.body;
    db.prepare(
      'UPDATE users SET key_bindings = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(JSON.stringify(bindings), req.user.id);
    res.sendStatus(200);
  }
);

// GET /api/user/GetUserNameById
router.get(
  '/GetUserNameById',
  auth,
  [query('id').trim().notEmpty()],
  validate,
  (req, res) => {
    const user = db
      .prepare('SELECT username FROM users WHERE id = ?')
      .get(req.query.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ userName: user.username });
  }
);

// POST /api/user/refresh
router.post(
  '/refresh',
  [body('refreshToken').trim().notEmpty()],
  validate,
  (req, res) => {
    const result = authService.rotateRefreshToken(req.body.refreshToken);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    setCookieToken(res, result.accessToken);
    res.json({ refreshToken: result.refreshToken, accessToken: result.accessToken });
  }
);

module.exports = router;
