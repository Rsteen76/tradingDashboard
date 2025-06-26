// server/src/utils/data-validator.js
// Extracted from your existing DataValidator class

const logger = require('./logger');

class ValidationError extends Error {
  constructor(issues) {
    super(Array.isArray(issues) ? issues.join('; ') : issues);
    this.name = 'ValidationError';
    this.issues = Array.isArray(issues) ? issues : [issues];
  }
}

class DataValidator {
  constructor() {
    this.validationRules = {
      price: { min: 0, max: 1000000 },
      volume: { min: 0, max: 100000000 },
      rsi: { min: 0, max: 100 },
      atr: { min: 0, max: 1000 },
      ema: { min: 0, max: 1000000 }
    };
  }

  validateMarketData(data) {
    const issues = [];
    
    // Only validate critical fields, be more permissive
    if (!data || typeof data !== 'object') {
      issues.push('Invalid data: must be an object');
    }
    
    // Price is the only truly critical field
    if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
      issues.push('Invalid price: must be a positive number');
    }
    
    // Warn about questionable values but don't fail validation
    if (data.volume !== undefined && data.volume < 0) {
      logger.warn('Negative volume detected, will be sanitized');
    }
    
    if (data.rsi !== undefined && (data.rsi < 0 || data.rsi > 100)) {
      logger.warn('RSI out of range, will be clamped');
    }
    
    if (data.atr !== undefined && data.atr < 0) {
      logger.warn('Negative ATR detected, will be sanitized');
    }
    
    // Only throw for critical issues
    if (issues.length > 0) {
      throw new ValidationError(issues);
    }
    
    return true;
  }

  sanitizeData(data) {
    const sanitized = { ...data };
    
    // Clamp RSI to valid range
    if (sanitized.rsi !== undefined) {
      sanitized.rsi = Math.max(0, Math.min(100, sanitized.rsi));
    }
    
    // Ensure positive price
    if (sanitized.price !== undefined) {
      sanitized.price = Math.max(0.01, sanitized.price);
    }
    
    // Ensure non-negative volume
    if (sanitized.volume !== undefined) {
      sanitized.volume = Math.max(0, sanitized.volume);
    }
    
    // Ensure non-negative ATR
    if (sanitized.atr !== undefined) {
      sanitized.atr = Math.max(0, sanitized.atr);
    }
    
    // Set defaults for missing critical fields
    if (!sanitized.instrument) {
      sanitized.instrument = 'Unknown';
    }
    
    if (!sanitized.timestamp) {
      sanitized.timestamp = new Date().toISOString();
    }
    
    return sanitized;
  }

  validatePredictionRequest(data) {
    const issues = [];
    
    if (!data || typeof data !== 'object') {
      issues.push('Request data must be an object');
    }
    
    if (!data.price || typeof data.price !== 'number') {
      issues.push('Price is required and must be a number');
    }
    
    if (data.rsi !== undefined && (typeof data.rsi !== 'number' || data.rsi < 0 || data.rsi > 100)) {
      issues.push('RSI must be a number between 0 and 100');
    }
    
    if (issues.length > 0) {
      throw new ValidationError(issues);
    }
    
    return this.sanitizeData(data);
  }
}

module.exports = { DataValidator, ValidationError };