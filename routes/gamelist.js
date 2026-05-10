'use strict';

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const config = require('../config/config');
const sessionService = require('../services/gameSessionService');
const signalingService = require('../services/signalingService');

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
  const sessions = sessionService.getSessionsForUser(req.user.id)
    .filter((s) => signalingService.isGmAlreadyConnected(s.id));
  const mapped = sessions.map((s) => ({
    id: s.id,
    name: s.name,
    summary: s.summary,
    description: s.description,
    imageData: s.image_data,
    passwordRequired: s.password_required === 1,
    isPublic: s.is_public === 1,
    ownerId: s.owner_id,
    createdAt: s.created_at,
  }));
  res.json(mapped);
});

// GET /api/gamelist/publicgames
// No auth required — public games are public information.
router.get('/publicgames', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const count = Math.max(1, Math.min(100, parseInt(req.query.count) || 20));

  const candidates = sessionService.getPublicSessions()
    .filter((s) => signalingService.isGmAlreadyConnected(s.id));

  // Ping each GM to confirm the channel is still live (filters out stale/timed-out entries)
  const aliveResults = await Promise.all(
    candidates.map(async (s) => {
      const alive = await signalingService.pingGmSocket(s.id);
      return alive ? s : null;
    })
  );
  const live = aliveResults.filter(Boolean);

  const total = live.length;
  const offset = (page - 1) * count;
  const data = live.slice(offset, offset + count).map((s) => ({
    id: s.id,
    name: s.name,
    summary: s.summary,
    description: s.description,
    imageData: s.image_data,
    passwordRequired: s.password_required === 1,
    isPublic: true,
    ownerId: s.owner_id,
    createdAt: s.created_at,
  }));

  res.json({ data, page, total, count: data.length });
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
    body('isPublic').optional().isBoolean().toBoolean(),
  ],
  validate,
  (req, res) => {
    const { name, summary, description, image, passwordRequired, password, isPublic } = req.body;

    if (isPublic && !config.allowPublicGames) {
      return res.status(403).json({ error: 'Public games are not allowed on this server' });
    }

    const session = sessionService.createSession(req.user.id, {
      name,
      summary,
      description,
      imageData: image || null,
      passwordRequired: !!passwordRequired,
      password,
      isPublic: !!isPublic,
    });
    res.status(201).json({
      id: session.id,
      name: session.name,
      summary: session.summary,
      description: session.description,
      imageData: session.image_data,
      passwordRequired: session.password_required === 1,
      isPublic: session.is_public === 1,
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
    if (result.error && result.status !== 409) {
      return res.status(result.status).json({ error: result.error });
    }
    // 409 = already a member — still allow entry, return centralSessionId so client can connect
    const status = result.status === 409 ? 409 : 200;
    res.status(status).json({ centralSessionId: result.sessionId });
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
  
  const addonsUrl = process.env.ADDON_REPO;
  if (!addonsUrl) {
    return res.status(500).json({ error: 'Addon repository URL not configured' });
  }

  // return list of featured addons from configured repository
  fetch(addonsUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch addons: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      res.json(data);
    })
    .catch((error) => {
      console.error('Error fetching addons:', error);
      res.status(500).json({ error: 'Failed to fetch addons' });
    });
});

// GET /api/gamelist/versioninfo
router.get('/versioninfo', auth, (_req, res) => {
  res.json({ isUpdateAvailable: false, currentVersion: '1.0.0', latestVersion: '1.0.0' });
});

module.exports = router;
