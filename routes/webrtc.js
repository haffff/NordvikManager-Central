'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const signalingService = require('../services/signalingService');

const router = express.Router();

// GET /webrtc/sessions — list all active signaling sessions
router.get('/sessions', auth, (_req, res) => {
  const sessions = signalingService.getActiveSessions();
  res.json(sessions);
});

// GET /webrtc/sessions/:sessionId/peers — list peers in a session
router.get('/sessions/:sessionId/peers', auth, (req, res) => {
  const sessions = signalingService.getActiveSessions();
  const session = sessions.find((s) => s.sessionId === req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'No active signaling session found' });
  res.json(session.peers);
});

module.exports = router;
