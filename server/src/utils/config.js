// server/src/utils/config.js
// Centralized configuration management

const path = require('path');

const config = {
  // Server settings
  server: {
    port: process.env.PORT || 8080,
    host: '0.0.0.0'
  },

  // NinjaTrader TCP settings  
  ninjaTrader: {
    port: 9999,
    host: '0.0.0.0',
    heartbeatTimeout: 60000, // 60 seconds
    heartbeatInterval: 30000, // 30 seconds
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
    connectionTimeout: 30000
  },

  // ML Engine settings (from your existing runtimeSettings)
  ml: {
    execThreshold: parseFloat(process.env.EXEC_THRESHOLD || '0.7'),
    autoTradingEnabled: process.env.AUTO_TRADING_ENABLED === 'true' || false,
    predictionCacheSize: 1000,
    predictionCacheTTL: 5 * 60 * 1000, // 5 minutes
    modelUpdateCooldown: 2000,
    changeThreshold: 0.05,
    bufferSize: 10,
    ensembleWeights: {
      lstm: 0.3,
      transformer: 0.25,
      randomForest: 0.2,
      xgboost: 0.15,
      dqn: 0.1
    }
  },

  // Database settings
  database: {
    postgres: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: process.env.POSTGRES_PASSWORD || '3191',
      database: 'trading_ml',
      connectionTimeoutMillis: 5000,
      max: 10,
      idleTimeoutMillis: 30000
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      connectTimeout: 1000,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    }
  },

  // WebSocket settings
  websocket: {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
  },

  // Trading settings
  trading: {
    minSamplesForTraining: 1000,
    maxTrainingDataSize: 50000,
    trainingInterval: 60 * 60 * 1000, // 1 hour
    autoSaveInterval: 30 * 60 * 1000, // 30 minutes
    healthCheckInterval: 60000, // 1 minute
    performanceMonitoringInterval: 10000 // 10 seconds
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined', // 'json' | 'simple' | 'combined'
    files: {
      error: path.join(__dirname, '../../logs/error.log'),
      combined: path.join(__dirname, '../../logs/combined.log'),
      access: path.join(__dirname, '../../logs/access.log')
    },
    console: {
      enabled: true,
      colorize: true
    }
  },

  // Paths
  paths: {
    models: path.join(__dirname, '../../models'),
    data: path.join(__dirname, '../../data'),
    logs: path.join(__dirname, '../../logs'),
    backup: path.join(__dirname, '../../backup'),
    settings: path.join(__dirname, '../../data/runtime-settings.json')
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  config.logging.level = 'warn';
  config.logging.console.enabled = false;
  config.ml.autoTradingEnabled = false; // Safety first in production
}

if (process.env.NODE_ENV === 'development') {
  config.logging.level = 'debug';
  config.ml.execThreshold = 0.6; // Lower threshold for testing
}

module.exports = config;