'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('./config/config');

const logger = createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    config.isProduction
      ? format.json()
      : format.printf(({ timestamp, level, message, stack }) =>
          stack
            ? `${timestamp} [${level}] ${message}\n${stack}`
            : `${timestamp} [${level}] ${message}`
        )
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
