'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const sessionService = require('../services/gameSessionService');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// GET /api/gamelist/getgames
router.get('/getgames', auth, (req, res) => {
  const sessions = sessionService.getSessionsForUser(req.user.id);
  const mapped = sessions.map((s) => ({
    id: s.id,
    name: s.name,
    summary: s.summary,
    description: s.description,
    imageData: s.image_data,
    passwordRequired: s.password_required === 1,
    ownerId: s.owner_id,
    createdAt: s.created_at,
  }));
  res.json(mapped);
});

// POST /api/gamelist/addgame
router.post(
  '/addgame',
  auth,
  [
    body('name').trim().notEmpty().isLength({ max: 200 }),
    body('summary').optional({ checkFalsy: true }).isLength({ max: 500 }),
    body('description').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('passwordRequired').optional().isBoolean().toBoolean(),
    body('password').optional({ checkFalsy: true }).isLength({ max: 128 }),
  ],
  validate,
  (req, res) => {
    const { name, summary, description, image, passwordRequired, password } = req.body;
    const session = sessionService.createSession(req.user.id, {
      name,
      summary,
      description,
      imageData: image || null,
      passwordRequired: !!passwordRequired,
      password,
    });
    res.status(201).json({
      id: session.id,
      name: session.name,
      summary: session.summary,
      description: session.description,
      imageData: session.image_data,
      passwordRequired: session.password_required === 1,
      ownerId: session.owner_id,
      createdAt: session.created_at,
    });
  }
);

// POST /api/gamelist/join
router.post(
  '/join',
  auth,
  [body('gameID').trim().notEmpty()],
  validate,
  (req, res) => {
    const { gameID, password } = req.body;
    const result = sessionService.joinSession(req.user.id, gameID, password);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.sendStatus(200);
  }
);

// DELETE /api/gamelist/DeleteGame
router.delete(
  '/DeleteGame',
  auth,
  [query('gameId').trim().notEmpty()],
  validate,
  (req, res) => {
    const result = sessionService.deleteSession(req.query.gameId, req.user.id, req.user.isAdmin);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.sendStatus(200);
  }
);

// GET /api/gamelist/GetFeaturedAddons
router.get('/GetFeaturedAddons', auth, (_req, res) => {
  // Returns a static list for now; populate via config/addons.json if needed
  res.json([]);
});

// GET /api/gamelist/versioninfo
router.get('/versioninfo', auth, (_req, res) => {
  res.json({ isUpdateAvailable: false, currentVersion: '1.0.0', latestVersion: '1.0.0' });
});

module.exports = router;
