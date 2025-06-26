// server/src/utils/logger.js
// Centralized logging (extracted from your existing winston setup)

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'ml-trading-server' },
    transports: [
        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// If we're not in production, log to the console with a simpler format
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level}]: ${message}`;
                if (Object.keys(metadata).length > 0 && metadata.service !== 'ml-trading-server') {
                    msg += JSON.stringify(metadata);
                }
                return msg;
            })
        )
    }));
}

// Create log directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'exceptions.log'),
    format: logFormat
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'rejections.log'),
    format: logFormat
  })
);

// Add helpful methods for common patterns from your existing code
logger.logTrade = (action, data) => {
  logger.info(`💰 Trade: ${action}`, {
    type: 'trade',
    action,
    ...data
  });
};

logger.logMLPrediction = (prediction, confidence) => {
  logger.info(`🤖 ML Prediction: ${prediction}`, {
    type: 'ml_prediction',
    prediction,
    confidence
  });
};

logger.logConnection = (type, status, details = {}) => {
  const emoji = status === 'connected' ? '✅' : '❌';
  logger.info(`${emoji} ${type} ${status}`, {
    type: 'connection',
    service: type,
    status,
    ...details
  });
};

logger.logPerformance = (operation, duration, details = {}) => {
  logger.debug(`⏱️ Performance: ${operation} took ${duration}ms`, {
    type: 'performance',
    operation,
    duration,
    ...details
  });
};

// Stream for Express access logs
logger.stream = {
  write: (message) => {
    logger.info(message.trim(), { type: 'http_access' });
  }
};

module.exports = logger;