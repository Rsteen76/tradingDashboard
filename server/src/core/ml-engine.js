// server/src/core/ml-engine.js
// Main ML Engine - extracted from your ml-server.backup.js

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');
const { LRUCache } = require('lru-cache');
const fsExtra = require('fs-extra');
const path = require('path');

const logger = require('../utils/logger');
const config = require('../utils/config');

// Import your existing ML components (we'll extract these next)
const MLModelManager = require('../models/model-manager');
const FeatureEngineer = require('./feature-engineer');
const SmartTrailingManager = require('./smart-trailing');
const PatternRecognition = require('./pattern-recognition');
const { DataValidator } = require('../utils/data-validator');

class MLEngine {
  constructor(options = {}) {
    this.config = { ...config.ml, ...options };
    
    // Core ML components (from your existing code)
    this.modelManager = null;
    this.featureEngineer = null;
    this.smartTrailingManager = null;
    this.patternRecognition = null;
    this.dataValidator = null;
    
    // Runtime settings (from your existing runtimeSettings)
    this.runtimeSettings = {
      execThreshold: this.config.execThreshold,
      autoTradingEnabled: this.config.autoTradingEnabled
    };
    
    // Caching and performance (from your existing code)
    this.predictionCache = new LRUCache({ 
      max: this.config.predictionCacheSize,
      ttl: this.config.predictionCacheTTL 
    });
    
    // Prediction stabilization (from your existing code)
    this.lastMLPrediction = null;
    this.mlPredictionHistory = [];
    this.lastMLUpdateTime = 0;
    
    // Data smoothing buffers (from your existing code)
    this.dataBuffers = {
      price: [],
      rsi: [],
      emaAlignment: [],
      signalStrength: []
    };
    
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing Enhanced ML Engine...');
      
      // Ensure directories exist (from your existing code)
      await this.ensureDirectories();
      
      // Initialize data validator
      this.dataValidator = new DataValidator();
      logger.info('✅ Data validator initialized');
      
      // Initialize feature engineer (your existing FeatureEngineer)
      this.featureEngineer = new FeatureEngineer();
      logger.info('✅ Feature engineer initialized');
      
      // Initialize model manager (your existing MLModelManager)
      this.modelManager = new MLModelManager();
      await this.modelManager.initialize();
      logger.info('✅ ML models initialized');
      
      // Initialize smart trailing (your existing SmartTrailingManager)
      this.smartTrailingManager = new SmartTrailingManager();
      logger.info('✅ Smart trailing manager initialized');
      
      // Initialize pattern recognition (your existing pattern detection)
      this.patternRecognition = new PatternRecognition();
      await this.patternRecognition.initialize();
      logger.info('✅ Pattern recognition initialized');
      
      // Load persisted settings (from your existing loadPersistedSettings)
      await this.loadPersistedSettings();
      
      this.isInitialized = true;
      logger.info('✅ Enhanced ML Engine fully initialized');
      
      return this;
      
    } catch (error) {
      logger.error('❌ ML Engine initialization failed:', error);
      throw error;
    }
  }

  async ensureDirectories() {
    const dirs = [
      config.paths.models,
      config.paths.data,
      config.paths.logs,
      config.paths.backup,
      path.join(config.paths.models, 'lstm_price_predictor'),
      path.join(config.paths.models, 'transformer_pattern'),
      path.join(config.paths.models, 'random_forest'),
      path.join(config.paths.models, 'xgboost'),
      path.join(config.paths.models, 'rl_agent')
    ];
    
    for (const dir of dirs) {
      await fsExtra.ensureDir(dir);
    }
  }

  // Main prediction method (from your existing generateMLPrediction)
  async generatePrediction(marketData) {
    if (!this.isInitialized) {
      throw new Error('ML Engine not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Validate input data (from your existing validatePredictionRequest)
      const validatedData = this.validateAndSanitizeInput(marketData);
      
      // Extract features (from your existing feature extraction)
      const features = await this.featureEngineer.extractFeatures(validatedData);
      
      // Generate predictions from all models (from your existing ensemble)
      const predictions = await this.generateEnsemblePrediction(features, validatedData);
      
      // Apply prediction stabilization (from your existing stabilization logic)
      const stabilizedPrediction = this.stabilizePrediction(predictions);
      
      // Add metadata and performance metrics
      const finalPrediction = {
        ...stabilizedPrediction,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        instrument: validatedData.instrument,
        modelVersions: this.getModelVersions(),
        features: {
          count: features.length,
          quality: this.assessFeatureQuality(features)
        },
        aiReasoning: this.generateAIReasoning(stabilizedPrediction, validatedData)
      };
      
      // Cache prediction
      const cacheKey = `${validatedData.instrument}_${Date.now()}`;
      this.predictionCache.set(cacheKey, finalPrediction);
      
      // Update prediction history for stabilization
      this.updatePredictionHistory(finalPrediction);
      
      logger.logMLPrediction(
        finalPrediction.direction, 
        finalPrediction.confidence
      );
      
      return finalPrediction;
      
    } catch (error) {
      logger.error('❌ ML prediction generation failed:', error);
      return this.generateFallbackPrediction(marketData);
    }
  }

  validateAndSanitizeInput(marketData) {
    try {
      // Use your existing data validation logic
      this.dataValidator.validateMarketData(marketData);
      return this.dataValidator.sanitizeData(marketData);
    } catch (error) {
      logger.warn('⚠️ Data validation failed, using raw data:', error.message);
      return {
        instrument: marketData.instrument || 'Unknown',
        price: marketData.price || 0,
        rsi: marketData.rsi || 50,
        ema_alignment: marketData.ema_alignment || 0,
        atr: marketData.atr || 1.0,
        volume: marketData.volume || 1000,
        timestamp: marketData.timestamp || new Date().toISOString(),
        ...marketData
      };
    }
  }

  async generateEnsemblePrediction(features, marketData) {
    try {
      // Get predictions from all models (from your existing ensemble logic)
      const [lstmPred, transformerPred, rfPred, dqnPred] = await Promise.all([
        this.modelManager.predict('lstm', features).catch(err => {
          logger.warn('LSTM prediction failed:', err.message);
          return { priceDirection: 0.5, confidence: 0.1, volatility: 0.5 };
        }),
        this.modelManager.predict('transformer', features).catch(err => {
          logger.warn('Transformer prediction failed:', err.message);
          return { trendStrength: 0.5, reversalProbability: 0.5, confidence: 0.1 };
        }),
        this.modelManager.predict('randomForest', features).catch(err => {
          logger.warn('RandomForest prediction failed:', err.message);
          return { direction: 0, confidence: 0.1 };
        }),
        this.modelManager.predict('dqn', features).catch(err => {
          logger.warn('DQN prediction failed:', err.message);
          return { action: 1, qValues: [0.33, 0.34, 0.33] };
        })
      ]);

      // Combine predictions using your existing ensemble logic
      return this.calculateEnsemble({
        lstm: lstmPred,
        transformer: transformerPred,
        randomForest: rfPred,
        dqn: dqnPred
      }, marketData);
      
    } catch (error) {
      logger.error('❌ Ensemble prediction failed:', error);
      return this.generateFallbackPrediction(marketData);
    }
  }

  calculateEnsemble(predictions, marketData) {
    // Your existing ensemble calculation logic
    const weights = this.config.ensembleWeights;
    
    let weightedLong = 0;
    let weightedShort = 0; 
    let weightedConfidence = 0;
    let totalWeight = 0;
    
    // Convert predictions to common format (from your existing normalizePrediction)
    Object.entries(predictions).forEach(([model, pred]) => {
      const weight = weights[model] || 0.1;
      const normalized = this.normalizePrediction(pred);
      
      weightedLong += normalized.longProb * weight;
      weightedShort += normalized.shortProb * weight;
      weightedConfidence += normalized.confidence * weight;
      totalWeight += weight;
    });
    
    const direction = weightedLong > weightedShort ? 'LONG' : 'SHORT';
    const strength = Math.abs(weightedLong - weightedShort) / totalWeight;
    
    return {
      direction,
      longProbability: weightedLong / totalWeight,
      shortProbability: weightedShort / totalWeight,
      confidence: weightedConfidence / totalWeight,
      strength,
      recommendation: this.generateRecommendation(strength, weightedConfidence / totalWeight),
      modelContributions: this.calculateModelContributions(predictions, weights)
    };
  }

  normalizePrediction(pred) {
    // Your existing prediction normalization logic
    if (pred.priceDirection !== undefined) {
      return {
        longProb: pred.priceDirection,
        shortProb: 1 - pred.priceDirection,
        confidence: pred.confidence || 0.5
      };
    } else if (pred.action !== undefined) {
      const qValues = pred.qValues || [0.33, 0.34, 0.33];
      const softmax = this.softmax(qValues);
      return {
        longProb: softmax[0],
        shortProb: softmax[2], 
        confidence: Math.max(...softmax)
      };
    } else if (pred.direction !== undefined) {
      return {
        longProb: pred.direction === 1 ? pred.confidence : 1 - pred.confidence,
        shortProb: pred.direction === -1 ? pred.confidence : 1 - pred.confidence,
        confidence: pred.confidence || 0.5
      };
    }
    
    return { longProb: 0.5, shortProb: 0.5, confidence: 0.5 };
  }

  softmax(values) {
    const max = Math.max(...values);
    const exp = values.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(e => e / sum);
  }

  // Smart trailing stop calculation (from your existing SmartTrailingManager)
  async calculateSmartTrailing(positionData, marketData) {
    if (!this.smartTrailingManager) {
      throw new Error('Smart trailing manager not initialized');
    }

    try {
      return await this.smartTrailingManager.calculateOptimalTrailingStop(
        positionData, 
        marketData
      );
    } catch (error) {
      logger.error('❌ Smart trailing calculation failed:', error);
      return this.smartTrailingManager.getFallbackTrailingStop(positionData, marketData);
    }
  }

  // Automated trading evaluation (from your existing evaluateAndSendTradingCommand)
  async evaluateTradingOpportunity(marketData) {
    logger.info('🔍 Evaluating trading opportunity...', {
      autoTradingEnabled: this.runtimeSettings.autoTradingEnabled,
      execThreshold: this.runtimeSettings.execThreshold,
      instrument: marketData.instrument || 'Unknown',
      price: marketData.price
    });

    if (!this.runtimeSettings.autoTradingEnabled) {
      logger.warn('❌ Auto trading is DISABLED in settings');
      return null;
    }

    try {
      const prediction = await this.generatePrediction(marketData);
      const threshold = this.runtimeSettings.execThreshold;
      
      logger.info('📊 Prediction generated for auto-trading evaluation:', {
        direction: prediction.direction,
        confidence: prediction.confidence,
        confidencePercent: (prediction.confidence * 100).toFixed(1) + '%',
        threshold: threshold,
        thresholdPercent: (threshold * 100).toFixed(1) + '%',
        meetsThreshold: prediction.confidence > threshold,
        longProbability: prediction.longProbability,
        shortProbability: prediction.shortProbability,
        strength: prediction.strength,
        recommendation: prediction.recommendation
      });

      if (prediction.confidence > threshold) {
        logger.info('✅ AUTO TRADE THRESHOLD MET - Generating trading command', {
          confidence: (prediction.confidence * 100).toFixed(1) + '%',
          requiredThreshold: (threshold * 100).toFixed(1) + '%',
          direction: prediction.direction
        });
        return this.generateTradingCommand(prediction, marketData);
      } else {
        logger.info('⏸️ Auto trade threshold NOT met', {
          confidence: (prediction.confidence * 100).toFixed(1) + '%',
          requiredThreshold: (threshold * 100).toFixed(1) + '%',
          shortfall: ((threshold - prediction.confidence) * 100).toFixed(1) + '%'
        });
      }
      
      return null;
      
    } catch (error) {
      logger.error('❌ Trading opportunity evaluation failed:', error);
      return null;
    }
  }

  generateTradingCommand(prediction, marketData) {
    // Your existing trading command generation logic
    const atr = marketData.atr || (marketData.price * 0.001);
    
    if (prediction.direction === 'LONG') {
      return {
        type: 'command',
        timestamp: new Date().toISOString(),
        instrument: marketData.instrument || 'Unknown',
        command: 'go_long',
        quantity: 1,
        entry_price: marketData.price,
        stop_price: marketData.price - atr,
        target_price: marketData.price + (atr * 2),
        reason: `ML ${prediction.direction} (conf ${(prediction.confidence*100).toFixed(1)}%)`
      };
    } else if (prediction.direction === 'SHORT') {
      return {
        type: 'command',
        timestamp: new Date().toISOString(),
        instrument: marketData.instrument || 'Unknown',
        command: 'go_short',
        quantity: 1,
        entry_price: marketData.price,
        stop_price: marketData.price + atr,
        target_price: marketData.price - (atr * 2),
        reason: `ML ${prediction.direction} (conf ${(prediction.confidence*100).toFixed(1)}%)`
      };
    }
    
    return null;
  }

  // Settings management (from your existing settings logic)
  updateSettings(newSettings) {
    const oldSettings = { ...this.runtimeSettings };
    this.runtimeSettings = { ...this.runtimeSettings, ...newSettings };
    
    logger.info('⚙️ ML Engine settings updated:', {
      old: oldSettings,
      new: this.runtimeSettings
    });
    
    this.persistSettings();
    return this.runtimeSettings;
  }

  async loadPersistedSettings() {
    try {
      const fs = require('fs');
      const settingsPath = config.paths.settings;
      
      if (fs.existsSync(settingsPath)) {
        const persistedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        this.runtimeSettings = { ...this.runtimeSettings, ...persistedSettings };
        logger.info('✅ Loaded persisted ML settings:', this.runtimeSettings);
      }
    } catch (error) {
      logger.warn('⚠️ Failed to load persisted settings:', error.message);
    }
  }

  persistSettings() {
    try {
      const fs = require('fs');
      fs.writeFileSync(config.paths.settings, JSON.stringify(this.runtimeSettings, null, 2));
      logger.debug('💾 ML settings persisted');
    } catch (error) {
      logger.warn('⚠️ Failed to persist settings:', error.message);
    }
  }

  // Helper methods (from your existing code)
  stabilizePrediction(prediction) {
    // Your existing prediction stabilization logic
    if (!this.shouldUpdateMLPrediction(prediction)) {
      return this.getStabilizedMLPrediction();
    }
    
    this.lastMLPrediction = prediction;
    this.lastMLUpdateTime = Date.now();
    return prediction;
  }

  shouldUpdateMLPrediction(newPrediction) {
    const currentTime = Date.now();
    
    if (!this.lastMLPrediction) return true;
    if (currentTime - this.lastMLUpdateTime < this.config.modelUpdateCooldown) return false;
    
    const longChange = Math.abs(newPrediction.longProbability - this.lastMLPrediction.longProbability);
    const confidenceChange = Math.abs(newPrediction.confidence - this.lastMLPrediction.confidence);
    
    return longChange > this.config.changeThreshold || 
           confidenceChange > this.config.changeThreshold ||
           newPrediction.recommendation !== this.lastMLPrediction.recommendation;
  }

  getStabilizedMLPrediction() {
    if (this.mlPredictionHistory.length === 0) {
      return this.lastMLPrediction;
    }
    
    const recent = this.mlPredictionHistory.slice(-3);
    const avgLongProb = recent.reduce((sum, p) => sum + p.longProbability, 0) / recent.length;
    const avgConfidence = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length;
    
    return {
      ...this.lastMLPrediction,
      longProbability: avgLongProb,
      shortProbability: 1 - avgLongProb,
      confidence: avgConfidence
    };
  }

  updatePredictionHistory(prediction) {
    this.mlPredictionHistory.push({
      ...prediction,
      timestamp: Date.now()
    });
    
    if (this.mlPredictionHistory.length > 10) {
      this.mlPredictionHistory.shift();
    }
  }

  generateFallbackPrediction(marketData) {
    logger.warn('🔄 Generating fallback prediction');
    
    return {
      direction: 'NEUTRAL',
      longProbability: 0.5,
      shortProbability: 0.5,
      confidence: 0.3,
      strength: 0.1,
      recommendation: 'NEUTRAL',
      fallbackMode: true,
      reason: 'ML system unavailable - using basic fallback',
      timestamp: new Date().toISOString(),
      instrument: marketData.instrument || 'Unknown'
    };
  }

  generateRecommendation(strength, confidence) {
    if (confidence < 0.6) return 'NEUTRAL';
    if (strength < 0.1) return 'NEUTRAL';
    
    if (confidence > 0.8 && strength > 0.3) return 'STRONG_SIGNAL';
    if (confidence > 0.7 && strength > 0.2) return 'MODERATE_SIGNAL';
    return 'WEAK_SIGNAL';
  }

  calculateModelContributions(predictions, weights) {
    const contributions = {};
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    
    Object.entries(weights).forEach(([model, weight]) => {
      contributions[model] = `${(weight / totalWeight * 100).toFixed(1)}%`;
    });
    
    return contributions;
  }

  assessFeatureQuality(features) {
    const nonZero = features.filter(f => f !== 0).length;
    const quality = nonZero / features.length;
    
    if (quality > 0.9) return 'EXCELLENT';
    if (quality > 0.7) return 'GOOD'; 
    if (quality > 0.5) return 'FAIR';
    return 'POOR';
  }

  generateAIReasoning(prediction, marketData) {
    // Your existing AI reasoning generation
    return [
      {
        category: 'Model Confidence',
        explanation: `AI ensemble shows ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        impact: prediction.confidence > 0.7 ? 'High conviction signal' : 'Moderate signal strength',
        strength: prediction.confidence > 0.8 ? 'Strong' : prediction.confidence > 0.6 ? 'Medium' : 'Weak'
      }
    ];
  }

  getModelVersions() {
    return this.modelManager ? this.modelManager.getModelVersions() : {};
  }

  async stop() {
    logger.info('🛑 Stopping ML Engine...');
    
    try {
      if (this.modelManager) {
        await this.modelManager.saveAllModels();
      }
      
      this.persistSettings();
      logger.info('✅ ML Engine stopped gracefully');
    } catch (error) {
      logger.error('❌ Error stopping ML Engine:', error);
      throw error;
    }
  }

  // Getters
  get isReady() {
    return this.isInitialized;
  }

  get settings() {
    return { ...this.runtimeSettings };
  }

  get stats() {
    return {
      predictionsGenerated: this.mlPredictionHistory.length,
      cacheSize: this.predictionCache.size,
      lastPrediction: this.lastMLPrediction?.timestamp,
      modelsLoaded: this.modelManager ? this.modelManager.models.size : 0
    };
  }
}

module.exports = MLEngine;