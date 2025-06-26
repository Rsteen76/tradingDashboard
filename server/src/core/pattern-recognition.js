const logger = require('../utils/logger');

class PatternRecognition {
  constructor() {
    this.patternHistory = [];
    this.regimeHistory = [];
    this.momentumHistory = [];
    this.maxHistorySize = 50;
  }

  async initialize() {
    return this;
  }

  /**
   * Analyze market patterns based on current market data
   * @param {Object} marketData - Current market data including price, indicators
   * @returns {Object} Pattern analysis results
   */
  async analyzePattern(marketData) {
    try {
      const { price, rsi, emaAlignment, atr } = marketData;
      const patterns = [];

      // Pattern 1: Mean Reversion Setup
      if ((rsi < 30 && emaAlignment < -20) || (rsi > 70 && emaAlignment > 20)) {
        patterns.push({
          type: 'MEAN_REVERSION',
          strength: Math.abs(50 - rsi) / 50,
          entryBias: rsi < 30 ? 'LONG' : 'SHORT'
        });
      }

      // Pattern 2: Momentum Continuation
      if (Math.abs(emaAlignment) > 30 && rsi > 40 && rsi < 60) {
        patterns.push({
          type: 'MOMENTUM_CONTINUATION',
          strength: Math.abs(emaAlignment) / 100,
          entryBias: emaAlignment > 0 ? 'LONG' : 'SHORT'
        });
      }

      // Pattern 3: Volatility Breakout
      const normalizedATR = atr / price * 1000;
      if (normalizedATR > 0.8) {
        patterns.push({
          type: 'VOLATILITY_BREAKOUT',
          strength: Math.min(normalizedATR / 2, 1),
          entryBias: emaAlignment > 0 ? 'LONG' : 'SHORT'
        });
      }

      // Pattern 4: Low Volatility Squeeze
      if (normalizedATR < 0.3 && Math.abs(emaAlignment) < 10) {
        patterns.push({
          type: 'LOW_VOLATILITY_SQUEEZE',
          strength: (0.3 - normalizedATR) / 0.3,
          entryBias: 'NEUTRAL'
        });
      }

      // Get strongest pattern
      const strongestPattern = patterns.reduce((max, pattern) =>
        pattern.strength > max.strength ? pattern : max,
        { type: 'NO_PATTERN', strength: 0, entryBias: 'NEUTRAL' }
      );

      // Update history
      this.patternHistory.push({
        timestamp: Date.now(),
        pattern: strongestPattern
      });

      if (this.patternHistory.length > this.maxHistorySize) {
        this.patternHistory.shift();
      }

      return strongestPattern;
    } catch (error) {
      logger.error('Pattern analysis failed', { error: error.message });
      return { type: 'NO_PATTERN', strength: 0, entryBias: 'NEUTRAL' };
    }
  }

  /**
   * Analyze current market regime
   * @param {Object} marketData - Current market data
   * @returns {Object} Regime analysis results
   */
  async analyzeRegime(marketData) {
    try {
      const emaAlignment = this.calculateEMAAlignment(marketData);
      const trendStrength = this.calculateTrendStrength(marketData);
      const volatilityState = this.calculateVolatilityState(marketData);

      // Determine regime type
      let regimeType = 'transitional';
      let strength = 0.5;

      if (Math.abs(emaAlignment) > 0.6 && trendStrength > 0.7) {
        regimeType = 'trending';
        strength = Math.min(0.95, (Math.abs(emaAlignment) + trendStrength) / 2);
      } else if (volatilityState < 0.3 && Math.abs(emaAlignment) < 0.3) {
        regimeType = 'ranging';
        strength = 0.8 - volatilityState;
      } else if (volatilityState > 0.8) {
        regimeType = 'volatile';
        strength = volatilityState;
      }

      const regime = {
        type: regimeType,
        strength: strength,
        stability: this.calculateRegimeStability(),
        expectedDuration: this.estimateRegimeDuration(regimeType),
        confidence: Math.min(0.95, strength * 0.9 + 0.1)
      };

      // Update history
      this.regimeHistory.push({ timestamp: Date.now(), regime });
      if (this.regimeHistory.length > this.maxHistorySize) {
        this.regimeHistory.shift();
      }

      return regime;
    } catch (error) {
      logger.error('Regime analysis failed', { error: error.message });
      return {
        type: 'unknown',
        strength: 0.5,
        stability: 0.5,
        expectedDuration: 15,
        confidence: 0.3
      };
    }
  }

  /**
   * Calculate momentum based on market data
   * @param {Object} marketData - Current market data
   * @returns {Object} Momentum analysis results
   */
  calculateMomentum(marketData) {
    try {
      // RSI-based momentum
      const rsi = marketData.rsi || 50;
      const rsiMomentum = Math.abs(rsi - 50) / 50;

      // EMA-based momentum
      let emaMomentum = 0.5;
      if (marketData.ema5 && marketData.ema21) {
        const emaSpread = Math.abs(marketData.ema5 - marketData.ema21) / marketData.price;
        emaMomentum = Math.min(1.0, emaSpread * 20);
      }

      const momentum = (rsiMomentum + emaMomentum) / 2;

      // Update history
      this.momentumHistory.push({
        timestamp: Date.now(),
        momentum,
        rsiMomentum,
        emaMomentum
      });

      if (this.momentumHistory.length > this.maxHistorySize) {
        this.momentumHistory.shift();
      }

      return {
        value: momentum,
        components: {
          rsi: rsiMomentum,
          ema: emaMomentum
        },
        classification: momentum > 0.7 ? 'strong' :
          momentum > 0.3 ? 'moderate' : 'weak'
      };
    } catch (error) {
      logger.error('Momentum calculation failed', { error: error.message });
      return {
        value: 0.5,
        components: { rsi: 0.5, ema: 0.5 },
        classification: 'moderate'
      };
    }
  }

  // Helper methods
  calculateEMAAlignment(marketData) {
    const { ema5, ema8, ema13, ema21, ema50 } = marketData;
    if (!ema5 || !ema50) return 0;

    const distances = [
      Math.abs(ema5 - ema8),
      Math.abs(ema8 - ema13),
      Math.abs(ema13 - ema21),
      Math.abs(ema21 - ema50)
    ];

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const priceRange = Math.abs(ema5 - ema50);

    const normalizedDistance = avgDistance / marketData.price;
    const normalizedRange = priceRange / marketData.price;

    const alignmentScore = normalizedRange < 0.001 ? 0 : normalizedDistance / normalizedRange;
    return Math.min(1, alignmentScore);
  }

  calculateTrendStrength(marketData) {
    const { adx, price, ema50 } = marketData;
    if (!adx || !price || !ema50) return 0.5;

    const adxStrength = Math.min(adx / 50, 1);
    const priceToEma = Math.abs(price - ema50) / price;
    
    return (adxStrength + Math.min(priceToEma * 10, 1)) / 2;
  }

  calculateVolatilityState(marketData) {
    const { atr, price } = marketData;
    if (!atr || !price) return 0.5;

    return Math.min(atr / price * 100, 1);
  }

  calculateRegimeStability() {
    if (this.regimeHistory.length < 5) return 0.5;

    const recent = this.regimeHistory.slice(-5);
    const regimeTypes = recent.map(r => r.regime.type);
    const uniqueTypes = new Set(regimeTypes);

    return 1.0 - (uniqueTypes.size - 1) / 4;
  }

  estimateRegimeDuration(regimeType) {
    const baseMinutes = {
      'trending': 45,
      'ranging': 30,
      'volatile': 15,
      'transitional': 20,
      'unknown': 15
    };

    return baseMinutes[regimeType] || 15;
  }

  getPatternHistory() {
    return this.patternHistory;
  }

  getRegimeHistory() {
    return this.regimeHistory;
  }

  getMomentumHistory() {
    return this.momentumHistory;
  }
}

module.exports = PatternRecognition;
