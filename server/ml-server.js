const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const net = require('net')
const tf = require('@tensorflow/tfjs-node')
const { RandomForestRegressor, RandomForestClassifier } = require('ml-random-forest')
const { XGBoost } = require('ml-xgboost')
const Queue = require('bull')
const Redis = require('ioredis')
const { Pool } = require('pg')

// Initialize components
const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Redis for caching and pub/sub
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
})

// PostgreSQL for historical data
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/trading_ml'
})

// Bull queue for async ML processing
const mlQueue = new Queue('ml-predictions', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
})

// Middleware
app.use(express.json())
app.use(express.static('public'))

// ML Model Manager
class MLModelManager {
  constructor() {
    this.models = new Map()
    this.modelVersions = new Map()
    this.performanceMetrics = new Map()
    this.isInitialized = false
  }

  async initialize() {
    console.log('🤖 Initializing ML models...')
    
    try {
      // Load pre-trained models
      await this.loadLSTMModel()
      await this.loadTransformerModel()
      await this.loadRandomForestModel()
      await this.loadXGBoostModel()
      await this.loadReinforcementLearningModel()
      
      this.isInitialized = true
      console.log('✅ All ML models loaded successfully')
    } catch (error) {
      console.error('❌ Error initializing ML models:', error)
      throw error
    }
  }

  async loadLSTMModel() {
    // LSTM for time series prediction
    const modelPath = './models/lstm_price_predictor/model.json'
    try {
      const model = await tf.loadLayersModel(`file://${modelPath}`)
      this.models.set('lstm', {
        model: model,
        type: 'timeseries',
        inputShape: [60, 15], // 60 timesteps, 15 features
        outputShape: [3], // [price_direction, confidence, volatility]
        version: '2.1.0'
      })
      console.log('✅ LSTM model loaded')
    } catch (error) {
      // Create new LSTM model if not found
      const model = this.createLSTMModel()
      this.models.set('lstm', {
        model: model,
        type: 'timeseries',
        inputShape: [60, 15],
        outputShape: [3],
        version: '2.1.0'
      })
      console.log('✅ LSTM model created')
    }
  }

  createLSTMModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 128,
          returnSequences: true,
          inputShape: [60, 15]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 64,
          returnSequences: true
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 32,
          returnSequences: false
        }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({ units: 3, activation: 'sigmoid' })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    })

    return model
  }

  async loadTransformerModel() {
    // Transformer for pattern recognition
    const model = this.createTransformerModel()
    this.models.set('transformer', {
      model: model,
      type: 'pattern',
      inputShape: [100, 20], // 100 timesteps, 20 features
      outputShape: [5], // [trend_strength, reversal_prob, breakout_prob, volatility, confidence]
      version: '1.3.0'
    })
    console.log('✅ Transformer model created')
  }

  createTransformerModel() {
    // Simplified transformer architecture
    const inputs = tf.input({ shape: [100, 20] })
    
    // Multi-head attention
    const attention = tf.layers.multiHeadAttention({
      numHeads: 4,
      keyDim: 32
    }).apply([inputs, inputs])
    
    // Feed forward network
    const ffn = tf.layers.dense({ units: 128, activation: 'relu' }).apply(attention)
    const ffn2 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(ffn)
    
    // Global average pooling
    const pooled = tf.layers.globalAveragePooling1D().apply(ffn2)
    
    // Output layers
    const dense1 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(pooled)
    const outputs = tf.layers.dense({ units: 5, activation: 'sigmoid' }).apply(dense1)
    
    const model = tf.model({ inputs: inputs, outputs: outputs })
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    })
    
    return model
  }

  async loadRandomForestModel() {
    // Random Forest for feature importance and classification
    const options = {
      nEstimators: 100,
      maxDepth: 10,
      minSamplesSplit: 5,
      minSamplesLeaf: 2
    }
    
    const classifier = new RandomForestClassifier(options)
    const regressor = new RandomForestRegressor(options)
    
    this.models.set('randomForest', {
      classifier: classifier,
      regressor: regressor,
      type: 'ensemble',
      version: '1.2.0',
      featureImportance: null
    })
    console.log('✅ Random Forest models created')
  }

  async loadXGBoostModel() {
    // XGBoost for high-performance gradient boosting
    this.models.set('xgboost', {
      model: null, // Will be loaded/trained on demand
      type: 'boosting',
      version: '2.0.0',
      params: {
        max_depth: 6,
        eta: 0.3,
        objective: 'binary:logistic',
        eval_metric: 'auc'
      }
    })
    console.log('✅ XGBoost configuration loaded')
  }

  async loadReinforcementLearningModel() {
    // Deep Q-Network for trading decisions
    const model = this.createDQNModel()
    this.models.set('dqn', {
      model: model,
      type: 'reinforcement',
      inputShape: [30], // State vector size
      outputShape: [3], // Actions: [BUY, HOLD, SELL]
      version: '1.1.0',
      epsilon: 0.1, // Exploration rate
      replayBuffer: []
    })
    console.log('✅ DQN model created')
  }

  createDQNModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [30]
        }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 3,
          activation: 'linear' // Q-values
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    })

    return model
  }

  async predict(modelName, data) {
    const modelInfo = this.models.get(modelName)
    if (!modelInfo) {
      throw new Error(`Model ${modelName} not found`)
    }

    switch (modelInfo.type) {
      case 'timeseries':
        return await this.predictTimeSeries(modelInfo, data)
      case 'pattern':
        return await this.predictPattern(modelInfo, data)
      case 'ensemble':
        return await this.predictEnsemble(modelInfo, data)
      case 'reinforcement':
        return await this.predictRL(modelInfo, data)
      default:
        throw new Error(`Unknown model type: ${modelInfo.type}`)
    }
  }

  async predictTimeSeries(modelInfo, data) {
    const tensor = tf.tensor3d([data], modelInfo.inputShape)
    const prediction = await modelInfo.model.predict(tensor).array()
    tensor.dispose()
    
    return {
      priceDirection: prediction[0][0],
      confidence: prediction[0][1],
      volatility: prediction[0][2]
    }
  }

  async predictPattern(modelInfo, data) {
    const tensor = tf.tensor3d([data], modelInfo.inputShape)
    const prediction = await modelInfo.model.predict(tensor).array()
    tensor.dispose()
    
    return {
      trendStrength: prediction[0][0],
      reversalProbability: prediction[0][1],
      breakoutProbability: prediction[0][2],
      volatility: prediction[0][3],
      confidence: prediction[0][4]
    }
  }

  async predictEnsemble(modelInfo, features) {
    // Random Forest predictions
    if (modelInfo.classifier.trained) {
      const classification = await modelInfo.classifier.predict([features])
      return { direction: classification[0], confidence: 0.8 }
    }
    return { direction: 0, confidence: 0.5 }
  }

  async predictRL(modelInfo, state) {
    const stateTensor = tf.tensor2d([state], [1, 30])
    const qValues = await modelInfo.model.predict(stateTensor).array()
    stateTensor.dispose()
    
    // Epsilon-greedy action selection
    if (Math.random() < modelInfo.epsilon) {
      return {
        action: Math.floor(Math.random() * 3),
        qValues: qValues[0]
      }
    }
    
    const action = qValues[0].indexOf(Math.max(...qValues[0]))
    return {
      action: action,
      qValues: qValues[0]
    }
  }

  async updateModel(modelName, trainingData, labels) {
    const modelInfo = this.models.get(modelName)
    if (!modelInfo) {
      throw new Error(`Model ${modelName} not found`)
    }

    console.log(`📊 Updating ${modelName} with ${trainingData.length} samples`)
    
    // Create tensors
    const xTensor = tf.tensor(trainingData)
    const yTensor = tf.tensor(labels)
    
    // Train the model
    const history = await modelInfo.model.fit(xTensor, yTensor, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`)
        }
      }
    })
    
    // Clean up tensors
    xTensor.dispose()
    yTensor.dispose()
    
    // Update version
    const version = modelInfo.version.split('.')
    version[2] = (parseInt(version[2]) + 1).toString()
    modelInfo.version = version.join('.')
    
    // Save model
    await this.saveModel(modelName)
    
    return history
  }

  async saveModel(modelName) {
    const modelInfo = this.models.get(modelName)
    if (!modelInfo || !modelInfo.model) return
    
    const savePath = `./models/${modelName}_v${modelInfo.version.replace(/\./g, '_')}`
    await modelInfo.model.save(`file://${savePath}`)
    console.log(`💾 Model ${modelName} saved to ${savePath}`)
  }
}

// Feature Engineering Pipeline
class FeatureEngineer {
  constructor() {
    this.featureCache = new Map()
    this.scalers = new Map()
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
    
    return {
      // Price ratios
      highLowRatio: high / low,
      closeToHigh: close / high,
      closeToLow: close / low,
      
      // Price changes
      priceChange: (close - marketData.prevClose) / marketData.prevClose,
      priceChangeAbs: Math.abs(close - marketData.prevClose),
      
      // Log returns
      logReturn: Math.log(close / marketData.prevClose),
      
      // Price position
      pricePosition: (close - low) / (high - low),
      
      // Volatility estimates
      garmanKlass: Math.sqrt(Math.log(high / low) ** 2 / 2),
      parkinson: Math.sqrt(Math.log(high / low) ** 2 / (4 * Math.log(2))),
      
      // Price momentum
      momentum5: (close - marketData.close5) / marketData.close5,
      momentum10: (close - marketData.close10) / marketData.close10,
      momentum20: (close - marketData.close20) / marketData.close20
    }
  }

  async extractTechnicalFeatures(marketData) {
    // Calculate various technical indicators
    const rsi = marketData.rsi || 50
    const macd = marketData.macd || { macd: 0, signal: 0, histogram: 0 }
    const bb = marketData.bollingerBands || { upper: 0, middle: 0, lower: 0 }
    const stoch = marketData.stochastic || { k: 50, d: 50 }
    
    return {
      // Momentum indicators
      rsi: rsi / 100,
      rsiSlope: (rsi - marketData.prevRsi) / 100,
      stochK: stoch.k / 100,
      stochD: stoch.d / 100,
      stochCross: (stoch.k - stoch.d) / 100,
      
      // Trend indicators
      macdLine: macd.macd,
      macdSignal: macd.signal,
      macdHistogram: macd.histogram,
      macdCross: macd.macd > macd.signal ? 1 : 0,
      
      // Volatility indicators
      bbPosition: (marketData.price - bb.lower) / (bb.upper - bb.lower),
      bbWidth: (bb.upper - bb.lower) / bb.middle,
      atrRatio: marketData.atr / marketData.price,
      
      // Volume indicators
      volumeRatio: marketData.volume / marketData.avgVolume,
      obv: marketData.obv || 0,
      vwap: marketData.vwap || marketData.price,
      vwapDistance: (marketData.price - marketData.vwap) / marketData.vwap,
      
      // Market structure
      supportDistance: (marketData.price - marketData.support) / marketData.price,
      resistanceDistance: (marketData.resistance - marketData.price) / marketData.price,
      pivotPoint: (marketData.high + marketData.low + marketData.close) / 3
    }
  }

  extractMicrostructureFeatures(marketData) {
    const bid = marketData.bid || marketData.price
    const ask = marketData.ask || marketData.price
    const spread = ask - bid
    const midPrice = (bid + ask) / 2
    
    return {
      // Spread metrics
      spread: spread,
      spreadBps: (spread / midPrice) * 10000,
      
      // Order book imbalance
      bidAskRatio: marketData.bidVolume / marketData.askVolume,
      orderImbalance: (marketData.bidVolume - marketData.askVolume) / 
                      (marketData.bidVolume + marketData.askVolume),
      
      // Trade flow
      tradeDirection: marketData.price > midPrice ? 1 : -1,
      tradeSizeRatio: marketData.lastTradeSize / marketData.avgTradeSize,
      
      // Market depth
      depthRatio: marketData.bidDepth / marketData.askDepth,
      liquidityScore: Math.log(marketData.bidDepth + marketData.askDepth),
      
      // Price impact
      kyleSlope: spread / Math.sqrt(marketData.volume),
      amihudIlliquidity: Math.abs(marketData.priceChange) / marketData.volume
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
    const date = new Date(marketData.timestamp)
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
      const normalized = (f - 0) / 1 // Simplified, should use actual mean/std
      return Math.max(-3, Math.min(3, normalized)) // Clip to [-3, 3]
    })
  }
}

// ML Prediction Service
class MLPredictionService {
  constructor(modelManager, featureEngineer) {
    this.modelManager = modelManager
    this.featureEngineer = featureEngineer
    this.predictionCache = new LRU({ max: 1000 })
    this.ensembleWeights = {
      lstm: 0.3,
      transformer: 0.25,
      randomForest: 0.2,
      xgboost: 0.15,
      dqn: 0.1
    }
  }

  async generatePrediction(marketData) {
    const startTime = Date.now()
    
    try {
      // Extract features
      const features = await this.featureEngineer.extractFeatures(marketData)
      
      // Get predictions from all models in parallel
      const [lstmPred, transformerPred, rfPred, dqnPred] = await Promise.all([
        this.modelManager.predict('lstm', features),
        this.modelManager.predict('transformer', features),
        this.modelManager.predict('randomForest', features),
        this.modelManager.predict('dqn', features)
      ])
      
      // Ensemble predictions with adaptive weighting
      const ensemblePrediction = this.calculateEnsemble({
        lstm: lstmPred,
        transformer: transformerPred,
        randomForest: rfPred,
        dqn: dqnPred
      })
      
      // Add metadata
      const prediction = {
        ...ensemblePrediction,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        modelVersions: this.getModelVersions(),
        features: {
          count: features.length,
          quality: this.assessFeatureQuality(features)
        }
      }
      
      // Store for online learning
      await this.storePrediction(marketData.instrument, prediction)
      
      return prediction
    } catch (error) {
      console.error('❌ ML Prediction error:', error)
      throw error
    }
  }

  calculateEnsemble(predictions) {
    let weightedLong = 0
    let weightedShort = 0
    let weightedConfidence = 0
    let totalWeight = 0
    
    // Dynamic weight adjustment based on recent performance
    const adjustedWeights = this.adjustWeightsBasedOnPerformance()
    
    for (const [model, pred] of Object.entries(predictions)) {
      const weight = adjustedWeights[model] || this.ensembleWeights[model]
      
      // Convert different prediction formats to common format
      const { longProb, shortProb, confidence } = this.normalizePrediction(pred)
      
      weightedLong += longProb * weight
      weightedShort += shortProb * weight
      weightedConfidence += confidence * weight
      totalWeight += weight
    }
    
    const direction = weightedLong > weightedShort ? 'LONG' : 'SHORT'
    const strength = Math.abs(weightedLong - weightedShort) / totalWeight
    
    return {
      direction: direction,
      longProbability: weightedLong / totalWeight,
      shortProbability: weightedShort / totalWeight,
      confidence: weightedConfidence / totalWeight,
      strength: strength,
      recommendation: this.generateRecommendation(strength, weightedConfidence / totalWeight),
      modelContributions: this.calculateModelContributions(predictions, adjustedWeights)
    }
  }

  normalizePrediction(pred) {
    // Handle different prediction formats from different models
    if (pred.priceDirection !== undefined) {
      // LSTM format
      return {
        longProb: pred.priceDirection,
        shortProb: 1 - pred.priceDirection,
        confidence: pred.confidence
      }
    } else if (pred.action !== undefined) {
      // DQN format
      const qValues = pred.qValues
      const softmax = this.softmax(qValues)
      return {
        longProb: softmax[0], // BUY
        shortProb: softmax[2], // SELL
        confidence: Math.max(...softmax)
      }
    } else if (pred.direction !== undefined) {
      // Random Forest format
      return {
        longProb: pred.direction === 1 ? pred.confidence : 1 - pred.confidence,
        shortProb: pred.direction === -1 ? pred.confidence : 1 - pred.confidence,
        confidence: pred.confidence
      }
    }
    
    // Default
    return {
      longProb: 0.5,
      shortProb: 0.5,
      confidence: 0.5
    }
  }

  softmax(values) {
    const max = Math.max(...values)
    const exp = values.map(v => Math.exp(v - max))
    const sum = exp.reduce((a, b) => a + b, 0)
    return exp.map(e => e / sum)
  }

  adjustWeightsBasedOnPerformance() {
    // This would use actual performance metrics
    // For now, returning base weights
    return this.ensembleWeights
  }

  generateRecommendation(strength, confidence) {
    if (confidence < 0.6) return 'NEUTRAL'
    if (strength < 0.1) return 'NEUTRAL'
    
    if (confidence > 0.8 && strength > 0.3) {
      return 'STRONG_SIGNAL'
    } else if (confidence > 0.7 && strength > 0.2) {
      return 'MODERATE_SIGNAL'
    } else {
      return 'WEAK_SIGNAL'
    }
  }

  calculateModelContributions(predictions, weights) {
    const contributions = {}
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
    
    for (const [model, weight] of Object.entries(weights)) {
      contributions[model] = (weight / totalWeight * 100).toFixed(1) + '%'
    }
    
    return contributions
  }

  assessFeatureQuality(features) {
    // Check for missing values, outliers, etc.
    const nonZero = features.filter(f => f !== 0).length
    const quality = nonZero / features.length
    
    if (quality > 0.9) return 'EXCELLENT'
    if (quality > 0.7) return 'GOOD'
    if (quality > 0.5) return 'FAIR'
    return 'POOR'
  }

  async storePrediction(instrument, prediction) {
    // Store in database for online learning
    const query = `
      INSERT INTO ml_predictions 
      (instrument, timestamp, direction, long_prob, short_prob, confidence, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
    
    try {
      await pgPool.query(query, [
        instrument,
        prediction.timestamp,
        prediction.direction,
        prediction.longProbability,
        prediction.shortProbability,
        prediction.confidence,
        JSON.stringify(prediction.features)
      ])
    } catch (error) {
      console.error('Error storing prediction:', error)
    }
  }

  getModelVersions() {
    const versions = {}
    for (const [name, info] of this.modelManager.models) {
      versions[name] = info.version
    }
    return versions
  }
}

// Online Learning System
class OnlineLearningSystem {
  constructor(modelManager, predictionService) {
    this.modelManager = modelManager
    this.predictionService = predictionService
    this.learningBuffer = []
    this.bufferSize = 1000
    this.updateFrequency = 100 // Update models every 100 samples
  }

  async recordOutcome(prediction, actualOutcome) {
    // Store prediction-outcome pair
    this.learningBuffer.push({
      timestamp: new Date(),
      prediction: prediction,
      outcome: actualOutcome,
      features: prediction.features
    })
    
    // Trigger learning if buffer is full
    if (this.learningBuffer.length >= this.updateFrequency) {
      await this.performOnlineLearning()
    }
    
    // Maintain buffer size
    if (this.learningBuffer.length > this.bufferSize) {
      this.learningBuffer.shift()
    }
  }

  async performOnlineLearning() {
    console.log('🧠 Performing online learning update...')
    
    try {
      // Prepare training data
      const trainingData = this.prepareTrainingData()
      
      // Update each model
      for (const [modelName, data] of Object.entries(trainingData)) {
        if (data.features.length > 0) {
          await this.modelManager.updateModel(modelName, data.features, data.labels)
        }
      }
      
      // Update ensemble weights based on performance
      await this.updateEnsembleWeights()
      
      // Clear processed data
      this.learningBuffer = this.learningBuffer.slice(-100) // Keep last 100 for context
      
      console.log('✅ Online learning update completed')
    } catch (error) {
      console.error('❌ Online learning error:', error)
    }
  }

  prepareTrainingData() {
    const trainingData = {
      lstm: { features: [], labels: [] },
      transformer: { features: [], labels: [] },
      randomForest: { features: [], labels: [] }
    }
    
    for (const sample of this.learningBuffer) {
      const features = sample.features
      const label = this.createLabel(sample.prediction, sample.outcome)
      
      // Add to appropriate model training sets
      trainingData.lstm.features.push(features)
      trainingData.lstm.labels.push(label)
      
      trainingData.transformer.features.push(features)
      trainingData.transformer.labels.push(label)
      
      trainingData.randomForest.features.push(features)
      trainingData.randomForest.labels.push(label.direction)
    }
    
    return trainingData
  }

  createLabel(prediction, outcome) {
    // Create supervised learning labels from outcomes
    return {
      direction: outcome.priceChange > 0 ? 1 : 0,
      magnitude: Math.abs(outcome.priceChange),
      accuracy: outcome.direction === prediction.direction ? 1 : 0
    }
  }

  async updateEnsembleWeights() {
    // Calculate model performance
    const performances = this.calculateModelPerformances()
    
    // Update weights using softmax of performances
    const weights = this.softmaxWeights(performances)
    
    // Apply to prediction service
    this.predictionService.ensembleWeights = weights
    
    console.log('📊 Updated ensemble weights:', weights)
  }

  calculateModelPerformances() {
    const performances = {}
    
    // Calculate accuracy for each model
    for (const [model, predictions] of Object.entries(this.modelPredictions)) {
      const correct = predictions.filter(p => p.correct).length
      performances[model] = correct / predictions.length
    }
    
    return performances
  }

  softmaxWeights(performances, temperature = 2.0) {
    const values = Object.values(performances)
    const exp = values.map(v => Math.exp(v / temperature))
    const sum = exp.reduce((a, b) => a + b, 0)
    
    const weights = {}
    Object.keys(performances).forEach((model, i) => {
      weights[model] = exp[i] / sum
    })
    
    return weights
  }
}

// Store connected clients and strategy state
let connectedClients = []
let latestStrategyData = {}
let strategyState = {
  isActive: false,
  ninjaTraderConnected: false,
  startTime: null,
  lastHeartbeat: null,
  instruments: {},
  positions: {},
  mlMetrics: {
    totalPredictions: 0,
    accuracy: 0,
    avgConfidence: 0,
    modelPerformance: {}
  }
}

// Initialize ML components
const modelManager = new MLModelManager()
const featureEngineer = new FeatureEngineer()
const predictionService = new MLPredictionService(modelManager, featureEngineer)
const onlineLearning = new OnlineLearningSystem(modelManager, predictionService)

// Initialize ML models on startup
async function initializeML() {
  try {
    await modelManager.initialize()
    console.log('🚀 ML system initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize ML system:', error)
    process.exit(1)
  }
}

// ML Queue Processor
mlQueue.process(async (job) => {
  const { marketData } = job.data
  
  try {
    // Generate ML prediction
    const prediction = await predictionService.generatePrediction(marketData)
    
    // Cache prediction
    await redis.setex(
      `prediction:${marketData.instrument}:${marketData.timestamp}`,
      300, // 5 minute TTL
      JSON.stringify(prediction)
    )
    
    // Update metrics
    strategyState.mlMetrics.totalPredictions++
    strategyState.mlMetrics.avgConfidence = 
      (strategyState.mlMetrics.avgConfidence * (strategyState.mlMetrics.totalPredictions - 1) + 
       prediction.confidence) / strategyState.mlMetrics.totalPredictions
    
    return prediction
  } catch (error) {
    console.error('ML Queue processing error:', error)
    throw error
  }
})

// WebSocket connection for dashboard
io.on('connection', (socket) => {
  console.log('🌐 Dashboard client connected:', socket.id)
  connectedClients.push(socket)
  
  // Send current state to new client
  socket.emit('strategy_state', strategyState)
  socket.emit('ml_metrics', strategyState.mlMetrics)
  
  if (strategyState.ninjaTraderConnected && Object.keys(latestStrategyData).length > 0) {
    socket.emit('strategy_data', latestStrategyData)
    socket.emit('connection_status', { status: 'connected', timestamp: new Date().toISOString() })
  } else {
    socket.emit('connection_status', { status: 'disconnected', timestamp: new Date().toISOString() })
  }
  
  // Handle ML prediction requests
  socket.on('request_ml_prediction', async (data) => {
    try {
      const job = await mlQueue.add('prediction', { marketData: data })
      const result = await job.finished()
      socket.emit('ml_prediction_result', result)
    } catch (error) {
      socket.emit('ml_prediction_error', { error: error.message })
    }
  })
  
  // Handle model performance requests
  socket.on('request_model_performance', async () => {
    const performance = await getModelPerformance()
    socket.emit('model_performance', performance)
  })
  
  // Handle model retraining requests
  socket.on('request_model_retrain', async (modelName) => {
    try {
      const result = await retrainModel(modelName)
      socket.emit('model_retrain_result', result)
    } catch (error) {
      socket.emit('model_retrain_error', { error: error.message })
    }
  })
  
  socket.on('disconnect', () => {
    console.log('❌ Dashboard client disconnected:', socket.id)
    connectedClients = connectedClients.filter(client => client.id !== socket.id)
  })
})

// TCP Server for NinjaTrader connection
const tcpServer = net.createServer((socket) => {
  console.log('🎯 NinjaTrader TCP connection established from:', socket.remoteAddress)
  
  let buffer = ''
  socket.on('data', async (data) => {
    buffer += data.toString()
    let lines = buffer.split('\n')
    buffer = lines.pop() // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const jsonData = JSON.parse(line.trim())
          await processNinjaTraderData(jsonData, socket)
        } catch (error) {
          console.error('❌ Error parsing JSON:', error.message)
        }
      }
    }
  })
  
  socket.on('close', () => {
    console.log('🎯 NinjaTrader disconnected')
    strategyState.ninjaTraderConnected = false
    broadcastConnectionStatus('disconnected')
  })
  
  socket.on('error', (error) => {
    console.error('🎯 TCP Socket error:', error.message)
  })
})

async function processNinjaTraderData(jsonData, socket) {
  const { type } = jsonData
  
  switch (type) {
    case 'strategy_status':
      await handleStrategyStatus(jsonData)
      break
      
    case 'ml_prediction_request':
      await handleMLPredictionRequest(jsonData, socket)
      break
      
    case 'trade_execution':
      await handleTradeExecution(jsonData)
      break
      
    case 'market_data':
      await handleMarketData(jsonData)
      break
      
    default:
      console.log('📥 Received data type:', type)
  }
}

async function handleStrategyStatus(data) {
  // Update connection state
  if (!strategyState.ninjaTraderConnected) {
    strategyState.ninjaTraderConnected = true
    strategyState.isActive = true
    strategyState.startTime = new Date()
    broadcastConnectionStatus('connected')
  }
  
  strategyState.lastHeartbeat = new Date()
  
  // Update strategy data
  latestStrategyData = {
    ...latestStrategyData,
    ...data,
    timestamp: new Date().toISOString()
  }
  
  // Broadcast to all clients
  connectedClients.forEach(client => {
    client.emit('strategy_data', latestStrategyData)
    client.emit('strategy_state', strategyState)
  })
}

async function handleMLPredictionRequest(data, socket) {
  console.log('🤖 ML Prediction requested:', data.instrument)
  
  try {
    // Check cache first
    const cached = await redis.get(`prediction:${data.instrument}:latest`)
    if (cached) {
      const prediction = JSON.parse(cached)
      socket.write(JSON.stringify({
        type: 'ml_prediction_response',
        ...prediction
      }) + '\n')
      return
    }
    
    // Generate new prediction
    const prediction = await predictionService.generatePrediction(data)
    
    // Send response to NinjaTrader
    const response = {
      type: 'ml_prediction_response',
      instrument: data.instrument,
      timestamp: prediction.timestamp,
      direction: prediction.direction,
      long_probability: prediction.longProbability,
      short_probability: prediction.shortProbability,
      confidence: prediction.confidence,
      strength: prediction.strength,
      recommendation: prediction.recommendation,
      model_versions: prediction.modelVersions,
      processing_time: prediction.processingTime
    }
    
    socket.write(JSON.stringify(response) + '\n')
    
    // Cache latest prediction
    await redis.setex(
      `prediction:${data.instrument}:latest`,
      60, // 1 minute TTL for latest
      JSON.stringify(prediction)
    )
    
    // Broadcast to dashboard
    connectedClients.forEach(client => {
      client.emit('ml_prediction', prediction)
    })
    
    // Update metrics
    updateMLMetrics(prediction)
    
  } catch (error) {
    console.error('❌ ML prediction error:', error)
    socket.write(JSON.stringify({
      type: 'ml_prediction_error',
      error: error.message
    }) + '\n')
  }
}

async function handleTradeExecution(data) {
  console.log('💰 Trade executed:', data.action, data.quantity, 'at', data.price)
  
  // Record outcome for online learning
  const outcome = {
    direction: data.action,
    price: data.price,
    quantity: data.quantity,
    pnl: data.pnl || 0,
    timestamp: data.timestamp
  }
  
  // Get corresponding prediction
  const predKey = `prediction:${data.instrument}:${data.predictionTimestamp}`
  const predictionData = await redis.get(predKey)
  
  if (predictionData) {
    const prediction = JSON.parse(predictionData)
    await onlineLearning.recordOutcome(prediction, outcome)
  }
  
  // Broadcast to dashboard
  connectedClients.forEach(client => {
    client.emit('trade_execution', data)
  })
}

async function handleMarketData(data) {
  // Store in time series database
  const query = `
    INSERT INTO market_data 
    (instrument, timestamp, price, volume, bid, ask, rsi, ema_alignment)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `
  
  try {
    await pgPool.query(query, [
      data.instrument,
      data.timestamp,
      data.price,
      data.volume,
      data.bid,
      data.ask,
      data.rsi,
      data.ema_alignment
    ])
  } catch (error) {
    console.error('Error storing market data:', error)
  }
  
  // Update latest data
  latestStrategyData = {
    ...latestStrategyData,
    ...data
  }
  
  // Broadcast to dashboard
  connectedClients.forEach(client => {
    client.emit('market_data', data)
  })
}

function updateMLMetrics(prediction) {
  strategyState.mlMetrics.totalPredictions++
  strategyState.mlMetrics.avgConfidence = 
    (strategyState.mlMetrics.avgConfidence * (strategyState.mlMetrics.totalPredictions - 1) + 
     prediction.confidence) / strategyState.mlMetrics.totalPredictions
  
  // Update model-specific metrics
  for (const [model, contribution] of Object.entries(prediction.modelContributions)) {
    if (!strategyState.mlMetrics.modelPerformance[model]) {
      strategyState.mlMetrics.modelPerformance[model] = {
        predictions: 0,
        avgContribution: 0
      }
    }
    
    const perf = strategyState.mlMetrics.modelPerformance[model]
    perf.predictions++
    perf.avgContribution = contribution
  }
  
  // Broadcast updated metrics
  connectedClients.forEach(client => {
    client.emit('ml_metrics', strategyState.mlMetrics)
  })
}

async function getModelPerformance() {
  const query = `
    SELECT 
      model_name,
      COUNT(*) as predictions,
      AVG(CASE WHEN correct THEN 1 ELSE 0 END) as accuracy,
      AVG(confidence) as avg_confidence,
      AVG(processing_time) as avg_time
    FROM ml_predictions
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY model_name
  `
  
  try {
    const result = await pgPool.query(query)
    return result.rows
  } catch (error) {
    console.error('Error getting model performance:', error)
    return []
  }
}

async function retrainModel(modelName) {
  console.log(`🔄 Retraining model: ${modelName}`)
  
  // Get training data from database
  const query = `
    SELECT features, label 
    FROM training_data 
    WHERE model_name = $1 
    ORDER BY timestamp DESC 
    LIMIT 10000
  `
  
  try {
    const result = await pgPool.query(query, [modelName])
    
    if (result.rows.length < 100) {
      throw new Error('Insufficient training data')
    }
    
    const features = result.rows.map(r => r.features)
    const labels = result.rows.map(r => r.label)
    
    // Retrain model
    const history = await modelManager.updateModel(modelName, features, labels)
    
    return {
      success: true,
      modelName: modelName,
      samplesUsed: result.rows.length,
      finalLoss: history.history.loss[history.history.loss.length - 1]
    }
  } catch (error) {
    console.error('Error retraining model:', error)
    throw error
  }
}

function broadcastConnectionStatus(status) {
  connectedClients.forEach(client => {
    client.emit('connection_status', { 
      status: status, 
      timestamp: new Date().toISOString() 
    })
  })
}

// Start servers
tcpServer.listen(9999, () => {
  console.log('🚀 TCP Server listening on port 9999 for NinjaTrader')
})

const PORT = process.env.PORT || 8080
server.listen(PORT, async () => {
  console.log(`🌐 Dashboard server running on port ${PORT}`)
  console.log(`📊 Dashboard URL: http://localhost:${PORT}`)
  console.log(`🎯 NinjaTrader TCP: localhost:9999`)
  
  // Initialize ML system
  await initializeML()
  
  console.log('🤖 ML Trading Server ready!')
  console.log('📈 Models loaded:', Array.from(modelManager.models.keys()).join(', '))
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down servers...')
  
  // Save models before shutdown
  for (const [modelName] of modelManager.models) {
    await modelManager.saveModel(modelName)
  }
  
  tcpServer.close()
  server.close()
  await redis.quit()
  await pgPool.end()
  
  process.exit(0)
})

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})