const winston = require('winston');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Ensure log directory exists (only if config is properly loaded)
if (config.logging && config.logging.file) {
  const logDir = path.dirname(config.logging.file);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

const transports = [
  new winston.transports.Console({
    format: winston.format.simple(),
  }),
];

// Only add file transport if config is properly loaded
if (config.logging && config.logging.file) {
  transports.unshift(new winston.transports.File({ filename: config.logging.file }));
}

const logger = winston.createLogger({
  level: (config.logging && config.logging.level) || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
});

module.exports = logger;