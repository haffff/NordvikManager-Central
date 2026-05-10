'use strict';

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config/config');
const runMigration = require('./db/migrations/001_initial');
const mountRoutes = require('./routes/index');
const { attachSignalingServer } = require('./signaling/signalingServer');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./logger');

// Run DB migrations before anything else
runMigration();

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // blob: is required for fabric.js canvas image rendering on the player client
        'img-src': ["'self'", 'data:', 'blob:'],
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// HTTP request logging
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// Static files
app.use('/client', express.static('static/client'));
app.use('/client-admin', express.static('static/client-admin'));
app.get('/', (_req, res) => {
  res.sendFile('static/landing/index.html', { root: __dirname });
});

// API routes
mountRoutes(app);

// Global error handler (must be last)
app.use(errorHandler);

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
attachSignalingServer(server);

server.listen(config.port, () => {
  logger.info(`NordvikManager Central Server listening on port ${config.port} [${config.nodeEnv}]`);
});

module.exports = { app, server };
