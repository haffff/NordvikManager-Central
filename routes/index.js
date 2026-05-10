'use strict';

const userRouter = require('./user');
const gamelistRouter = require('./gamelist');
const webrtcRouter = require('./webrtc');
const config = require('../config/config');

function mountRoutes(app) {
  app.use('/api/user', userRouter);
  app.use('/api/gamelist', gamelistRouter);
  app.use('/webrtc', webrtcRouter);

  app.get('/api/meta', (req, res) => {
    //get isInvitationRequired from configuration
    const isInvitationRequired = process.env.NO_INVITATION !== 'true';

    const stunServers = process.env.STUN_SERVERS
      ? process.env.STUN_SERVERS.split(',').map((s) => s.trim())
      : [];

    const turnServer = process.env.TURN_SERVER || null;

    const minBackendVersion = process.env.MIN_GM_BACKEND_VERSION || '1.0.0';

    const publicGamesAllowed = process.env.ALLOW_PUBLIC_GAMES === 'true';

    res.json({ isInvitationRequired, stunServers, turnServer, minBackendVersion, publicGamesAllowed });
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
