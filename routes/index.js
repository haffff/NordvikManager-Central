'use strict';

const userRouter = require('./user');
const gamelistRouter = require('./gamelist');
const webrtcRouter = require('./webrtc');
const config = require('../config/config');

function mountRoutes(app) {
  app.use('/api/user', userRouter);
  app.use('/api/gamelist', gamelistRouter);
  app.use('/webrtc', webrtcRouter);

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
