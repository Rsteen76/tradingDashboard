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

    this.defaultValues = {
      instrument: 'ES',
      price: 0,
      volume: 0,
      rsi: 50,
      atr: 1.0,
      ema_alignment: 0,
      timestamp: () => new Date().toISOString()
    };
  }

  validateMarketData(data) {
    const issues = [];
    const warnings = [];
    
    // Basic type check
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Invalid data: must be an object'],
        warnings: [],
        sanitizedData: this.getDefaultData()
      };
    }
    
    // Validate and sanitize each field
    const sanitizedData = { ...this.getDefaultData() };

    // Handle price (critical field)
    if (data.price === undefined && data.last !== undefined) {
      data.price = data.last; // Support 'last' as alias for 'price'
    }
    
    if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
      issues.push('Invalid price: must be a positive number');
    } else {
      sanitizedData.price = data.price;
    }

    // Handle instrument
    if (!data.instrument) {
      warnings.push('Missing instrument field, using default');
      sanitizedData.instrument = this.defaultValues.instrument;
    } else {
      sanitizedData.instrument = data.instrument;
    }

    // Handle volume
    if (data.volume !== undefined) {
      if (typeof data.volume !== 'number' || data.volume < 0) {
        warnings.push(`Invalid volume value (${data.volume}), using default`);
        sanitizedData.volume = this.defaultValues.volume;
      } else {
        sanitizedData.volume = data.volume;
      }
    }

    // Handle RSI
    if (data.rsi !== undefined) {
      const rsiValue = parseFloat(data.rsi);
      if (isNaN(rsiValue) || rsiValue < 0 || rsiValue > 100) {
        warnings.push(`RSI out of range (${data.rsi}), clamping to valid range`);
        sanitizedData.rsi = Math.min(100, Math.max(0, isNaN(rsiValue) ? 50 : rsiValue));
      } else {
        sanitizedData.rsi = rsiValue;
      }
    }

    // Handle ATR
    if (data.atr !== undefined) {
      const atrValue = parseFloat(data.atr);
      if (isNaN(atrValue) || atrValue <= 0) {
        warnings.push(`Invalid ATR value (${data.atr}), using default`);
        sanitizedData.atr = sanitizedData.price ? sanitizedData.price * 0.001 : this.defaultValues.atr;
      } else {
        sanitizedData.atr = atrValue;
      }
    } else {
      warnings.push('Missing ATR field, using default');
      sanitizedData.atr = sanitizedData.price ? sanitizedData.price * 0.001 : this.defaultValues.atr;
    }

    // Add timestamp if missing
    if (!data.timestamp) {
      sanitizedData.timestamp = this.defaultValues.timestamp();
    } else {
      sanitizedData.timestamp = data.timestamp;
    }

    // Log all warnings
    if (warnings.length > 0) {
      warnings.forEach(warning => logger.warn(`⚠️ ${warning}`));
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings,
      sanitizedData
    };
  }

  getDefaultData() {
    return {
      instrument: this.defaultValues.instrument,
      price: this.defaultValues.price,
      volume: this.defaultValues.volume,
      rsi: this.defaultValues.rsi,
      atr: this.defaultValues.atr,
      ema_alignment: this.defaultValues.ema_alignment,
      timestamp: this.defaultValues.timestamp()
    };
  }

  sanitizeData(data) {
    const validationResult = this.validateMarketData(data);
    return validationResult.sanitizedData;
  }

  validatePredictionRequest(data) {
    const validationResult = this.validateMarketData(data);
    
    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }
    
    return validationResult.sanitizedData;
  }
}

module.exports = { DataValidator, ValidationError };