'use strict';

const userRouter = require('./user');
const gamelistRouter = require('./gamelist');
const webrtcRouter = require('./webrtc');
const config = require('../config/config');
const auth = require('../middleware/auth');
const { buildIceServers } = require('../services/iceServers');

function mountRoutes(app) {
  app.use('/api/user', userRouter);
  app.use('/api/gamelist', gamelistRouter);
  app.use('/webrtc', webrtcRouter);

  app.get('/api/meta', (req, res) => {
    //get isInvitationRequired from configuration
    const isInvitationRequired = process.env.NO_INVITATION !== 'true';

    const stunServers = config.stunServers;

    const minBackendVersion = process.env.MIN_GM_BACKEND_VERSION || '1.0.0';

    const publicGamesAllowed = process.env.ALLOW_PUBLIC_GAMES === 'true';

    res.json({ isInvitationRequired, stunServers, minBackendVersion, publicGamesAllowed });
  });

  // Full ICE config incl. short-lived TURN credentials. Authenticated, unlike /api/meta,
  // so the relay is only usable by logged-in users.
  app.get('/api/ice-servers', auth, (req, res) => {
    const result = buildIceServers({ stunServers: config.stunServers, turn: config.turn, userId: req.user.id });
    res.set('Cache-Control', 'no-store');
    res.json(result);
  });

  if (!config.isProduction) {
    const swaggerUi = require('swagger-ui-express');
    const spec = require('../swagger/spec');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
      customSiteTitle: 'NordvikManager API',
      swaggerOptions: { persistAuthorization: true },
    }));
    console.log('[swagger] UI available at /api-docs');
  }
}

module.exports = mountRoutes;
