const logger = require('../utils/logger');
const { LRUCache } = require('lru-cache');

// Comprehensive Feature Engineering Pipeline
class FeatureEngineer {
  constructor() {
    // Fix LRUCache constructor for newer versions
    this.featureCache = new LRUCache({ 
      max: 500,
      ttl: 1000 * 60 * 5  // 5 minute TTL
    });
    this.scalers = new Map();
    this.batchSize = 10;
    this.pendingFeatures = [];
    this.processingBatch = false;
    this.lastCleanup = Date.now();
    this.cleanupInterval = 10 * 60 * 1000; // 10 minutes
    logger.info('✅ FeatureEngineer initialized with comprehensive feature extraction');
  }

  // Batch processing for performance
  async extractFeaturesAsync(marketData, lookback = 60) {
    return new Promise((resolve, reject) => {
      this.pendingFeatures.push({ marketData, lookback, resolve, reject });
      this.processBatch();
    });
  }

  async processBatch() {
    if (this.processingBatch || this.pendingFeatures.length === 0) return;
    
    this.processingBatch = true;
    
    try {
      const batch = this.pendingFeatures.splice(0, this.batchSize);
      
      const results = await Promise.all(
        batch.map(async ({ marketData, lookback }) => {
          return await this.extractFeatures(marketData, lookback);
        })
      );
      
      batch.forEach(({ resolve }, index) => {
        resolve(results[index]);
      });
      
    } catch (error) {
      this.pendingFeatures.forEach(({ reject }) => reject(error));
    } finally {
      this.processingBatch = false;
      
      // Continue processing if more pending
      if (this.pendingFeatures.length > 0) {
        setImmediate(() => this.processBatch());
      }
    }
  }

  cleanup() {
    if (Date.now() - this.lastCleanup > this.cleanupInterval) {
      // Clear old cache entries
      this.featureCache.clear();
      
      // Limit scaler size
      if (this.scalers.size > 100) {
        const entries = Array.from(this.scalers.entries());
        this.scalers.clear();
        entries.slice(-50).forEach(([key, value]) => {
          this.scalers.set(key, value);
        });
      }
      
      this.lastCleanup = Date.now();
      logger.debug('Feature engineer cleanup completed');
    }
  }

  async extractFeatures(marketData, lookback = 60) {
    const cacheKey = `${marketData.instrument}_${marketData.timestamp}`
    
    // Check cache
    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)
    }

    // Extract comprehensive features
    const features = {
      // Price features
      priceFeatures: this.extractPriceFeatures(marketData),
      
      // Technical indicators
      technicalFeatures: await this.extractTechnicalFeatures(marketData),
      
      // Market microstructure
      microstructureFeatures: this.extractMicrostructureFeatures(marketData),
      
      // Sentiment features
      sentimentFeatures: await this.extractSentimentFeatures(marketData),
      
      // Time-based features
      temporalFeatures: this.extractTemporalFeatures(marketData),
      
      // Cross-asset features
      crossAssetFeatures: await this.extractCrossAssetFeatures(marketData)
    }

    // Flatten and normalize
    const flatFeatures = this.flattenFeatures(features)
    const normalizedFeatures = this.normalizeFeatures(flatFeatures)
    
    // Cache for performance
    this.featureCache.set(cacheKey, normalizedFeatures)
    
    // Clean old cache entries
    if (this.featureCache.size > 1000) {
      const firstKey = this.featureCache.keys().next().value
      this.featureCache.delete(firstKey)
    }

    return normalizedFeatures
  }

  extractPriceFeatures(marketData) {
    const price = marketData.price || 0
    const high = marketData.high || price
    const low = marketData.low || price
    const close = marketData.close || price
    const prevClose = marketData.prevClose || price
    
    return {
      // Price ratios
      highLowRatio: high > 0 && low > 0 ? high / low : 1,
      closeToHigh: high > 0 ? close / high : 1,
      closeToLow: low > 0 ? close / low : 1,
      
      // Price changes
      priceChange: prevClose > 0 ? (close - prevClose) / prevClose : 0,
      priceChangeAbs: Math.abs(close - prevClose),
      
      // Log returns
      logReturn: prevClose > 0 ? Math.log(close / prevClose) : 0,
      
      // Price position
      pricePosition: (high - low) > 0 ? (close - low) / (high - low) : 0.5,
      
      // Volatility estimates
      garmanKlass: high > 0 && low > 0 ? Math.sqrt(Math.log(high / low) ** 2 / 2) : 0,
      parkinson: high > 0 && low > 0 ? Math.sqrt(Math.log(high / low) ** 2 / (4 * Math.log(2))) : 0,
      
      // Price momentum
      momentum5: (marketData.close5 || price) > 0 ? (close - (marketData.close5 || price)) / (marketData.close5 || price) : 0,
      momentum10: (marketData.close10 || price) > 0 ? (close - (marketData.close10 || price)) / (marketData.close10 || price) : 0,
      momentum20: (marketData.close20 || price) > 0 ? (close - (marketData.close20 || price)) / (marketData.close20 || price) : 0
    }
  }

  async extractTechnicalFeatures(marketData) {
    // Calculate various technical indicators
    const rsi = marketData.rsi || 50
    const macd = marketData.macd || { macd: 0, signal: 0, histogram: 0 }
    const bb = marketData.bollingerBands || { upper: marketData.price || 0, middle: marketData.price || 0, lower: marketData.price || 0 }
    const stoch = marketData.stochastic || { k: 50, d: 50 }
    
    return {
      // Momentum indicators
      rsi: rsi / 100,
      rsiSlope: ((rsi - (marketData.prevRsi || rsi)) / 100),
      stochK: stoch.k / 100,
      stochD: stoch.d / 100,
      stochCross: (stoch.k - stoch.d) / 100,
      
      // Trend indicators
      macdLine: macd.macd || 0,
      macdSignal: macd.signal || 0,
      macdHistogram: macd.histogram || 0,
      macdCross: (macd.macd || 0) > (macd.signal || 0) ? 1 : 0,
      
      // Volatility indicators
      bbPosition: (bb.upper - bb.lower) > 0 ? (marketData.price - bb.lower) / (bb.upper - bb.lower) : 0.5,
      bbWidth: bb.middle > 0 ? (bb.upper - bb.lower) / bb.middle : 0,
      atrRatio: marketData.price > 0 ? (marketData.atr || 0) / marketData.price : 0,
      
      // Volume indicators
      volumeRatio: (marketData.avgVolume || 1) > 0 ? (marketData.volume || 0) / (marketData.avgVolume || 1) : 1,
      obv: marketData.obv || 0,
      vwap: marketData.vwap || marketData.price || 0,
      vwapDistance: (marketData.vwap || marketData.price) > 0 ? (marketData.price - (marketData.vwap || marketData.price)) / (marketData.vwap || marketData.price) : 0,
      
      // Market structure
      supportDistance: marketData.price > 0 ? ((marketData.price || 0) - (marketData.support || marketData.price || 0)) / marketData.price : 0,
      resistanceDistance: marketData.price > 0 ? ((marketData.resistance || marketData.price || 0) - (marketData.price || 0)) / marketData.price : 0,
      pivotPoint: ((marketData.high || 0) + (marketData.low || 0) + (marketData.close || marketData.price || 0)) / 3
    }
  }

  extractMicrostructureFeatures(marketData) {
    const bid = marketData.bid || marketData.price || 0
    const ask = marketData.ask || marketData.price || 0
    const spread = ask - bid
    const midPrice = (bid + ask) / 2
    
    return {
      // Spread metrics
      spread: spread,
      spreadBps: midPrice > 0 ? (spread / midPrice) * 10000 : 0,
      
      // Order book imbalance
      bidAskRatio: (marketData.askVolume || 1) > 0 ? (marketData.bidVolume || 1) / (marketData.askVolume || 1) : 1,
      orderImbalance: ((marketData.bidVolume || 0) + (marketData.askVolume || 0)) > 0 ? 
                      ((marketData.bidVolume || 0) - (marketData.askVolume || 0)) / 
                      ((marketData.bidVolume || 0) + (marketData.askVolume || 0)) : 0,
      
      // Trade flow
      tradeDirection: (marketData.price || 0) > midPrice ? 1 : -1,
      tradeSizeRatio: (marketData.avgTradeSize || 1) > 0 ? (marketData.lastTradeSize || 1) / (marketData.avgTradeSize || 1) : 1,
      
      // Market depth
      depthRatio: (marketData.askDepth || 1) > 0 ? (marketData.bidDepth || 1) / (marketData.askDepth || 1) : 1,
      liquidityScore: Math.log((marketData.bidDepth || 1) + (marketData.askDepth || 1)),
      
      // Price impact
      kyleSlope: (marketData.volume || 1) > 0 ? spread / Math.sqrt(marketData.volume) : spread,
      amihudIlliquidity: (marketData.volume || 1) > 0 ? Math.abs(marketData.priceChange || 0) / (marketData.volume || 1) : 0
    }
  }

  async extractSentimentFeatures(marketData) {
    // This would typically involve NLP on news/social media
    // For now, using simulated sentiment scores
    return {
      newsSentiment: marketData.newsSentiment || 0.5,
      socialSentiment: marketData.socialSentiment || 0.5,
      optionSentiment: marketData.putCallRatio || 1.0,
      fearGreedIndex: marketData.fearGreedIndex || 50,
      marketMood: marketData.vix ? (100 - marketData.vix) / 100 : 0.5
    }
  }

  extractTemporalFeatures(marketData) {
    const date = new Date(marketData.timestamp || Date.now())
    const hour = date.getHours()
    const dayOfWeek = date.getDay()
    const dayOfMonth = date.getDate()
    const month = date.getMonth()
    
    return {
      // Time of day features (cyclical encoding)
      hourSin: Math.sin(2 * Math.PI * hour / 24),
      hourCos: Math.cos(2 * Math.PI * hour / 24),
      
      // Day of week features
      dayOfWeekSin: Math.sin(2 * Math.PI * dayOfWeek / 7),
      dayOfWeekCos: Math.cos(2 * Math.PI * dayOfWeek / 7),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
      
      // Month features
      monthSin: Math.sin(2 * Math.PI * month / 12),
      monthCos: Math.cos(2 * Math.PI * month / 12),
      
      // Trading session
      isMarketOpen: hour >= 9 && hour < 16 ? 1 : 0,
      isPreMarket: hour >= 4 && hour < 9 ? 1 : 0,
      isAfterHours: hour >= 16 && hour < 20 ? 1 : 0,
      
      // Special periods
      isMonthEnd: dayOfMonth >= 25 ? 1 : 0,
      isQuarterEnd: (month % 3 === 2 && dayOfMonth >= 25) ? 1 : 0
    }
  }

  async extractCrossAssetFeatures(marketData) {
    // Correlations with other assets
    return {
      sp500Correlation: marketData.sp500Corr || 0,
      vixCorrelation: marketData.vixCorr || 0,
      dollarIndexCorr: marketData.dxyCorr || 0,
      goldCorrelation: marketData.goldCorr || 0,
      bondYieldCorr: marketData.bondCorr || 0,
      sectorRotation: marketData.sectorRotation || 0
    }
  }

  flattenFeatures(features) {
    const flat = []
    
    const flatten = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          flatten(value, `${prefix}${key}_`)
        } else {
          flat.push(value || 0)
        }
      }
    }
    
    flatten(features)
    return flat
  }

  normalizeFeatures(features) {
    // Z-score normalization with clipping
    return features.map(f => {
      // Handle NaN and infinite values
      if (isNaN(f) || !isFinite(f)) return 0
      
      const normalized = (f - 0) / 1 // Simplified, should use actual mean/std
      return Math.max(-3, Math.min(3, normalized)) // Clip to [-3, 3]
    })
  }
}

module.exports = FeatureEngineer;
