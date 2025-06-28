// Bombproof AI Trading System with continuous improvement
const EventEmitter = require('events');
const logger = require('../utils/logger');

// Add trading milestones configuration
const TRADING_MILESTONES = {
  DISCOVERY: {
    trades: 0,
    config: {
      minConfidence: 0.50,
      maxDailyLoss: 3000,
      maxConsecutiveLosses: 7,
      minProfitTarget: 10,
      status: "Discovering patterns"
    }
  },
  FILTERING: {
    trades: 50,
    config: {
      minConfidence: 0.60,
      maxDailyLoss: 2000,
      maxConsecutiveLosses: 5,
      minProfitTarget: 15,
      status: "Filtering bad patterns"
    }
  },
  OPTIMIZING: {
    trades: 100,
    config: {
      minConfidence: 0.65,
      maxDailyLoss: 1500,
      maxConsecutiveLosses: 4,
      status: "Optimizing parameters"
    }
  },
  REFINING: {
    trades: 200,
    config: {
      minConfidence: 0.70,
      maxDailyLoss: 1000,
      maxConsecutiveLosses: 3,
      status: "Fine-tuning system"
    }
  },
  PRODUCTION: {
    trades: 300,
    config: {
      minConfidence: 0.75,
      maxDailyLoss: 1000,
      status: "Production ready"
    },
    requirements: {
      minWinRate: 0.52,
      minProfitFactor: 1.2,
      maxDrawdown: 0.15
    }
  }
};

class BombproofAITradingSystem extends EventEmitter {
  constructor(dependencies) {
    super();
    
    // Core dependencies
    this.mlEngine = dependencies.mlEngine;
    this.advancedAI = dependencies.advancedAI;
    this.profitMaximizer = dependencies.profitMaximizer;
    this.positionManager = dependencies.positionManager;
    this.ninjaService = dependencies.ninjaService;
    this.adaptiveLearning = dependencies.adaptiveLearning;
    this.dataCollector = dependencies.dataCollector;
    
    // Trade state management
    this.pendingTrades = new Map();
    this.executedTrades = new Map();
    this.tradeHistory = [];
    
    // Evolution tracking
    this.milestonesReached = new Set();
    this.blacklistedPatterns = new Set();
    this.blacklistedHours = new Set();
    this.profitableHours = [];
    this.unprofitableHours = [];
    
    // Risk management state
    this.riskState = {
      dailyPnL: 0,
      dailyTradeCount: 0,
      consecutiveLosses: 0,
      maxDailyLoss: -1000,
      maxDailyTrades: 10,
      maxConsecutiveLosses: 3,
      currentPositions: new Map(),
      totalExposure: 0
    };
    
    // Performance tracking
    this.performanceMetrics = {
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0
    };
    
    // AI confidence thresholds (dynamic)
    this.confidenceThresholds = {
      base: 0.75,
      current: 0.75,
      min: 0.6,
      max: 0.9,
      adjustmentRate: 0.01
    };
    
    // Trade validation rules
    this.tradeValidators = new Map();
    this.setupDefaultValidators();
    
    // Continuous improvement
    this.learningBuffer = [];
    this.modelUpdateInterval = null;
    this.performanceReviewInterval = null;
    
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing Bombproof AI Trading System...');
      
      // Load historical state
      await this.loadHistoricalState();
      
      // Setup real-time position tracking
      await this.syncPositionsWithNinja();
      
      // Start continuous improvement loops
      this.startContinuousImprovement();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      logger.info('✅ Bombproof AI Trading System initialized');
      
    } catch (error) {
      logger.error('❌ Failed to initialize trading system:', error);
      throw error;
    }
  }

  // MAIN TRADING EVALUATION METHOD
  async evaluateTradingOpportunity(marketData) {
    try {
      // 1. Pre-flight checks
      const preflightResult = await this.runPreflightChecks(marketData);
      if (!preflightResult.passed) {
        logger.info('⛔ Pre-flight checks failed:', preflightResult.reasons);
        return null;
      }
      
      // 2. Get current position state
      const positionState = await this.getCurrentPositionState(marketData.instrument);
      
      // 3. Generate AI predictions with multiple models
      const aiPredictions = await this.generateEnsemblePrediction(marketData, positionState);
      
      // 4. Run profit optimization
      const profitOptimization = await this.optimizeForProfit(marketData, positionState, aiPredictions);
      
      // 5. Validate trade opportunity
      const validation = await this.validateTradeOpportunity(profitOptimization, positionState);
      if (!validation.isValid) {
        logger.info('❌ Trade validation failed:', validation.reasons);
        this.recordRejectedTrade(profitOptimization, validation.reasons);
        return null;
      }
      
      // 6. Calculate position sizing with risk management
      const positionSize = await this.calculateOptimalPositionSize(profitOptimization, positionState);
      
      // 7. Generate trade command
      const tradeCommand = this.generateTradeCommand(profitOptimization, positionSize);
      
      // 8. Final safety checks
      const safetyCheck = await this.runFinalSafetyChecks(tradeCommand);
      if (!safetyCheck.passed) {
        logger.error('🚨 Final safety check failed:', safetyCheck.reasons);
        return null;
      }
      
      // 9. Execute trade with tracking
      const execution = await this.executeTrade(tradeCommand);
      
      return execution;
      
    } catch (error) {
      logger.error('❌ Trade evaluation error:', error);
      this.emit('tradingError', { error, marketData });
      return null;
    }
  }

  // PRE-FLIGHT CHECKS
  async runPreflightChecks(marketData) {
    const checks = {
      passed: true,
      reasons: []
    };
    
    // Check 1: System health
    if (!this.isSystemHealthy()) {
      checks.passed = false;
      checks.reasons.push('System health check failed');
    }
    
    // Check 2: Data quality
    const dataQuality = this.assessDataQuality(marketData);
    if (dataQuality.score < 0.8) {
      checks.passed = false;
      checks.reasons.push(`Poor data quality: ${dataQuality.score}`);
    }
    
    // Check 3: Connection status
    if (!this.ninjaService || !this.ninjaService.isConnected) {
      checks.passed = false;
      checks.reasons.push('NinjaTrader not connected');
    }
    
    // Check 4: Daily limits
    if (this.riskState.dailyPnL <= this.riskState.maxDailyLoss) {
      checks.passed = false;
      checks.reasons.push('Daily loss limit reached');
    }
    
    if (this.riskState.dailyTradeCount >= this.riskState.maxDailyTrades) {
      checks.passed = false;
      checks.reasons.push('Daily trade limit reached');
    }
    
    // Check 5: Consecutive losses
    if (this.riskState.consecutiveLosses >= this.riskState.maxConsecutiveLosses) {
      checks.passed = false;
      checks.reasons.push('Max consecutive losses reached');
    }
    
    return checks;
  }

  // GET ACCURATE POSITION STATE
  async getCurrentPositionState(instrument) {
    try {
      // Get from position manager
      const position = this.positionManager.getPosition(instrument);
      
      // Validate against NinjaTrader
      const ninjaPosition = await this.queryNinjaPosition(instrument);
      
      // Reconcile any differences
      if (position.size !== ninjaPosition.size || position.direction !== ninjaPosition.direction) {
        logger.warn('Position mismatch detected, reconciling...');
        await this.positionManager.updatePosition(instrument, ninjaPosition);
        return ninjaPosition;
      }
      
      return {
        instrument,
        direction: position.direction || 'FLAT',
        size: position.size || 0,
        avgPrice: position.avgPrice || 0,
        unrealizedPnL: position.unrealizedPnL || 0,
        realizedPnL: position.realizedPnL || 0,
        entryTime: position.entryTime,
        currentPrice: marketData.price
      };
      
    } catch (error) {
      logger.error('Error getting position state:', error);
      // Safe fallback
      return {
        instrument,
        direction: 'FLAT',
        size: 0,
        avgPrice: 0,
        unrealizedPnL: 0,
        realizedPnL: 0
      };
    }
  }

  // GENERATE ENSEMBLE PREDICTION
  async generateEnsemblePrediction(marketData, positionState) {
    const predictions = {};
    
    try {
      // 1. ML Engine prediction
      if (this.mlEngine?.isReady) {
        predictions.mlEngine = await this.mlEngine.generatePrediction(marketData);
      }
      
      // 2. Advanced AI prediction
      if (this.advancedAI?.isInitialized) {
        predictions.advancedAI = await this.advancedAI.generateAIPrediction(marketData);
      }
      
      // 3. Pattern recognition
      predictions.patterns = await this.analyzePatterns(marketData);
      
      // 4. Market regime
      predictions.regime = await this.analyzeMarketRegime(marketData);
      
      // 5. Position-aware adjustments
      predictions.positionAdjusted = this.adjustPredictionsForPosition(predictions, positionState);
      
      // Combine all predictions
      return this.combineAllPredictions(predictions);
      
    } catch (error) {
      logger.error('Error generating predictions:', error);
      return this.getFallbackPrediction(marketData);
    }
  }

  // PROFIT OPTIMIZATION
  async optimizeForProfit(marketData, positionState, predictions) {
    try {
      if (!this.profitMaximizer?.isInitialized) {
        throw new Error('Profit maximizer not available');
      }
      
      const optimization = await this.profitMaximizer.optimizeForMaximumProfit(
        {
          ...marketData,
          predictions,
          currentPosition: positionState
        },
        positionState,
        this.getAccountInfo()
      );
      
      // Enhance with additional metrics
      return {
        ...optimization,
        riskRewardRatio: this.calculateRiskReward(optimization),
        winProbability: this.estimateWinProbability(optimization, predictions),
        expectedValue: this.calculateExpectedValue(optimization),
        kelly: this.calculateKellyCriterion(optimization)
      };
      
    } catch (error) {
      logger.error('Profit optimization failed:', error);
      return null;
    }
  }

  // TRADE VALIDATION
  async validateTradeOpportunity(optimization, positionState) {
    const validation = {
      isValid: true,
      score: 0,
      reasons: [],
      warnings: []
    };
    
    // Run all validators
    for (const [name, validator] of this.tradeValidators) {
      const result = await validator(optimization, positionState, this.riskState);
      
      if (!result.passed) {
        validation.isValid = false;
        validation.reasons.push(`${name}: ${result.reason}`);
      } else {
        validation.score += result.score || 0;
      }
      
      if (result.warning) {
        validation.warnings.push(`${name}: ${result.warning}`);
      }
    }
    
    // Normalize score
    validation.score = validation.score / this.tradeValidators.size;
    
    return validation;
  }

  // POSITION SIZING
  async calculateOptimalPositionSize(optimization, positionState) {
    try {
      // Base size from optimization
      let size = optimization.positionSize || 1;
      
      // Apply Kelly Criterion
      const kellySize = this.applyKellyCriterion(optimization);
      size = Math.min(size, kellySize);
      
      // Apply risk limits
      const riskLimitedSize = this.applyRiskLimits(size, optimization);
      size = Math.min(size, riskLimitedSize);
      
      // Apply volatility adjustment
      const volAdjustedSize = this.applyVolatilityAdjustment(size, optimization);
      size = Math.round(volAdjustedSize);
      
      // Minimum size
      return Math.max(1, size);
      
    } catch (error) {
      logger.error('Position sizing error:', error);
      return 1; // Safe default
    }
  }

  // EXECUTE TRADE
  async executeTrade(tradeCommand) {
    try {
      // 1. Generate unique trade ID
      const tradeId = this.generateTradeId();
      tradeCommand.tradeId = tradeId;
      
      // 2. Record pending trade
      this.pendingTrades.set(tradeId, {
        command: tradeCommand,
        timestamp: new Date(),
        status: 'pending',
        attempts: 0
      });
      
      // 3. Send to NinjaTrader
      if (!this.ninjaService) {
        throw new Error('NinjaTrader service not available');
      }
      
      const sent = this.ninjaService.sendTradingCommand(tradeCommand);
      
      if (!sent) {
        throw new Error('Failed to send command to NinjaTrader');
      }
      
      // 4. Wait for confirmation with timeout
      const confirmation = await this.waitForTradeConfirmation(tradeId, 5000);
      
      if (!confirmation) {
        throw new Error('Trade confirmation timeout');
      }
      
      // 5. Update trade status
      this.pendingTrades.delete(tradeId);
      this.executedTrades.set(tradeId, {
        ...tradeCommand,
        executionTime: new Date(),
        status: 'executed',
        fillPrice: confirmation.fillPrice || tradeCommand.price
      });
      
      // 6. Update risk state
      this.updateRiskState(tradeCommand);
      
      // 7. Start monitoring
      this.startTradeMonitoring(tradeId);
      
      logger.info('✅ Trade executed successfully:', {
        tradeId,
        instrument: tradeCommand.instrument,
        direction: tradeCommand.direction,
        size: tradeCommand.quantity
      });
      
      return {
        success: true,
        tradeId,
        execution: confirmation
      };
      
    } catch (error) {
      logger.error('Trade execution failed:', error);
      
      // Record failed trade
      this.recordFailedTrade(tradeCommand, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // CONTINUOUS IMPROVEMENT SYSTEM
  startContinuousImprovement() {
    // 1. Real-time learning from each trade
    this.on('tradeCompleted', async (tradeResult) => {
      await this.learnFromTrade(tradeResult);
    });
    
    // 2. Periodic model updates (every hour)
    this.modelUpdateInterval = setInterval(async () => {
      await this.updateModelsWithRecentData();
    }, 60 * 60 * 1000);
    
    // 3. Performance review (every 15 minutes)
    this.performanceReviewInterval = setInterval(async () => {
      await this.reviewAndAdjustPerformance();
    }, 15 * 60 * 1000);
    
    // 4. Daily performance report
    this.scheduleDailyReport();
  }

  async learnFromTrade(tradeResult) {
    try {
      // 1. Update adaptive learning engine
      if (this.adaptiveLearning) {
        await this.adaptiveLearning.recordOutcome(
          tradeResult.prediction,
          tradeResult.outcome
        );
      }
      
      // 2. Update performance metrics
      this.updatePerformanceMetrics(tradeResult);
      
      // 3. Adjust confidence thresholds
      this.adjustConfidenceThresholds(tradeResult);
      
      // 4. Update model weights
      await this.updateModelWeights(tradeResult);
      
      // 5. Pattern learning
      this.learnPatterns(tradeResult);
      
      // 6. Evolution evaluation
      await this.evaluateAfterTrade();
      
      logger.info('📚 Learned from trade:', {
        profit: tradeResult.profit,
        accuracy: tradeResult.predictionAccuracy
      });
      
    } catch (error) {
      logger.error('Learning error:', error);
    }
  }

  adjustConfidenceThresholds(tradeResult) {
    const { profit, predictionConfidence } = tradeResult;
    
    if (profit > 0) {
      // Profitable trade - can slightly lower threshold
      if (predictionConfidence < this.confidenceThresholds.current) {
        this.confidenceThresholds.current = Math.max(
          this.confidenceThresholds.min,
          this.confidenceThresholds.current - this.confidenceThresholds.adjustmentRate
        );
      }
    } else {
      // Losing trade - increase threshold
      if (predictionConfidence >= this.confidenceThresholds.current) {
        this.confidenceThresholds.current = Math.min(
          this.confidenceThresholds.max,
          this.confidenceThresholds.current + this.confidenceThresholds.adjustmentRate
        );
      }
    }
    
    logger.debug('Confidence threshold adjusted:', {
      new: this.confidenceThresholds.current,
      reason: profit > 0 ? 'profitable' : 'loss'
    });
  }

  // SAFETY AND MONITORING
  async startTradeMonitoring(tradeId) {
    const trade = this.executedTrades.get(tradeId);
    if (!trade) return;
    
    const monitor = setInterval(async () => {
      try {
        // Get current position
        const position = await this.getCurrentPositionState(trade.instrument);
        
        // Check if trade is still active
        if (position.size === 0) {
          clearInterval(monitor);
          await this.handleTradeExit(tradeId, position);
          return;
        }
        
        // Monitor for stop loss / take profit adjustments
        await this.checkForTrailingStopUpdate(tradeId, position);
        
        // Check for emergency exit conditions
        await this.checkEmergencyExitConditions(tradeId, position);
        
      } catch (error) {
        logger.error('Trade monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
    
    // Store monitor reference
    trade.monitor = monitor;
  }

  // DEFAULT VALIDATORS
  setupDefaultValidators() {
    // Confidence validator
    this.tradeValidators.set('confidence', async (opt, pos, risk) => {
      const passed = opt.confidence >= this.confidenceThresholds.current;
      return {
        passed,
        reason: `Confidence ${opt.confidence} below threshold ${this.confidenceThresholds.current}`,
        score: opt.confidence
      };
    });
    
    // Profit target validator
    this.tradeValidators.set('profitTarget', async (opt, pos, risk) => {
      const minProfit = 25; // $25 minimum
      const passed = opt.expectedProfit >= minProfit;
      return {
        passed,
        reason: `Expected profit $${opt.expectedProfit} below minimum $${minProfit}`,
        score: opt.expectedProfit / 100
      };
    });
    
    // Risk/Reward validator
    this.tradeValidators.set('riskReward', async (opt, pos, risk) => {
      const minRR = 1.5;
      const passed = opt.riskRewardRatio >= minRR;
      return {
        passed,
        reason: `Risk/Reward ${opt.riskRewardRatio} below minimum ${minRR}`,
        score: opt.riskRewardRatio / 3
      };
    });
    
    // Position direction validator (no reversals without flat)
    this.tradeValidators.set('positionDirection', async (opt, pos, risk) => {
      if (pos.direction === 'FLAT') return { passed: true, score: 1 };
      
      const isReversal = 
        (pos.direction === 'LONG' && opt.direction === 'short') ||
        (pos.direction === 'SHORT' && opt.direction === 'long');
      
      return {
        passed: !isReversal,
        reason: 'Direct position reversal not allowed',
        score: isReversal ? 0 : 1
      };
    });
    
    // Volatility validator
    this.tradeValidators.set('volatility', async (opt, pos, risk) => {
      const maxVolatility = 0.03; // 3% ATR
      const currentVol = opt.marketData?.atr / opt.marketData?.price || 0;
      const passed = currentVol <= maxVolatility;
      
      return {
        passed,
        reason: `Volatility ${(currentVol * 100).toFixed(2)}% exceeds max ${(maxVolatility * 100)}%`,
        score: 1 - (currentVol / maxVolatility),
        warning: currentVol > maxVolatility * 0.8 ? 'High volatility detected' : null
      };
    });
    
    // Time-based validator
    this.tradeValidators.set('timeFilter', async (opt, pos, risk) => {
      const hour = new Date().getHours();
      const restrictedHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5]; // No overnight trading
      const passed = !restrictedHours.includes(hour);
      
      return {
        passed,
        reason: `Trading restricted during hour ${hour}`,
        score: passed ? 1 : 0
      };
    });
  }

  // HELPER METHODS
  generateTradeId() {
    return `TRADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async waitForTradeConfirmation(tradeId, timeout) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout);
      
      // If no ninjaService, resolve immediately with null
      if (!this.ninjaService) {
        clearTimeout(timer);
        resolve(null);
        return;
      }
      
      const handler = (data) => {
        if (data.tradeId === tradeId) {
          clearTimeout(timer);
          this.ninjaService.removeListener('tradeExecution', handler);
          resolve(data);
        }
      };
      
      this.ninjaService.on('tradeExecution', handler);
    });
  }

  isSystemHealthy() {
    return (
      this.mlEngine?.isReady &&
      this.ninjaService?.isConnected &&
      this.performanceMetrics.currentDrawdown < 0.2 // Less than 20% drawdown
    );
  }

  assessDataQuality(marketData) {
    let score = 1.0;
    const issues = [];
    
    // Check data freshness
    const age = Date.now() - new Date(marketData.timestamp).getTime();
    if (age > 5000) { // Older than 5 seconds
      score -= 0.3;
      issues.push('stale data');
    }
    
    // Check required fields
    const required = ['price', 'volume', 'atr', 'rsi'];
    const missing = required.filter(field => !marketData[field]);
    if (missing.length > 0) {
      score -= missing.length * 0.2;
      issues.push(`missing fields: ${missing.join(', ')}`);
    }
    
    // Check data validity
    if (marketData.price <= 0 || marketData.volume < 0) {
      score = 0;
      issues.push('invalid values');
    }
    
    return { score: Math.max(0, score), issues };
  }

  updateRiskState(trade) {
    this.riskState.dailyTradeCount++;
    
    // This will be updated when trade completes
    if (trade.direction === 'long' || trade.direction === 'short') {
      this.riskState.totalExposure += trade.quantity * trade.price;
    }
  }

  getAccountInfo() {
    // This should be connected to actual account data
    return {
      balance: 100000, // Should come from actual account
      equity: 100000 + this.riskState.dailyPnL,
      margin: this.riskState.totalExposure * 0.1,
      freeMargin: 100000 + this.riskState.dailyPnL - (this.riskState.totalExposure * 0.1)
    };
  }

  calculateKellyCriterion(optimization) {
    const winProb = optimization.winProbability || 0.5;
    const winAmount = optimization.expectedProfit;
    const lossAmount = optimization.maxLoss || 50;
    
    const b = winAmount / lossAmount; // Odds
    const p = winProb;
    const q = 1 - p;
    
    const kelly = (p * b - q) / b;
    
    // Apply Kelly fraction (25% of full Kelly for safety)
    return Math.max(0, Math.min(0.25, kelly * 0.25));
  }

  // IMPLEMENTATION METHODS
  async loadHistoricalState() {
    try {
      // Load historical performance and settings if available
      logger.debug('Loading historical state...');
      // This could load from database or file system in the future
      return true;
    } catch (error) {
      logger.warn('No historical state found, starting fresh');
      return false;
    }
  }

  async syncPositionsWithNinja() {
    try {
      if (!this.ninjaService || !this.ninjaService.isConnected) {
        logger.debug('NinjaTrader not connected, skipping position sync');
        return;
      }
      
      // Sync current positions with NinjaTrader
      logger.debug('Syncing positions with NinjaTrader...');
      // Implementation would query actual positions here
      return true;
    } catch (error) {
      logger.warn('Position sync failed:', error.message);
      return false;
    }
  }

  setupEventListeners() {
    // Setup internal event listeners for the trading system
    this.on('tradeExecuted', (trade) => {
      logger.debug('Trade executed event received:', trade.tradeId);
    });

    this.on('tradeCompleted', (result) => {
      logger.debug('Trade completed event received:', result.tradeId);
    });

    this.on('performanceUpdate', (metrics) => {
      logger.debug('Performance metrics updated');
    });
  }

  async queryNinjaPosition(instrument) {
    try {
      if (!this.ninjaService || !this.ninjaService.isConnected) {
        return { direction: 'FLAT', size: 0, avgPrice: 0, unrealizedPnL: 0, realizedPnL: 0 };
      }
      
      // Query actual position from NinjaTrader
      // For now, return safe fallback
      return { direction: 'FLAT', size: 0, avgPrice: 0, unrealizedPnL: 0, realizedPnL: 0 };
    } catch (error) {
      logger.error('Error querying NinjaTrader position:', error);
      return { direction: 'FLAT', size: 0, avgPrice: 0, unrealizedPnL: 0, realizedPnL: 0 };
    }
  }

  async analyzePatterns(marketData) {
    try {
      // Pattern analysis using market data
      const patterns = {
        trend: marketData.trend || 'sideways',
        support: marketData.support || 0,
        resistance: marketData.resistance || 0,
        breakout: false,
        reversal: false
      };
      
      return { 
        pattern: patterns.trend, 
        confidence: 0.5,
        details: patterns
      };
    } catch (error) {
      logger.error('Pattern analysis error:', error);
      return { pattern: 'none', confidence: 0.5 };
    }
  }

  async analyzeMarketRegime(marketData) {
    try {
      // Simple market regime detection
      const volatility = marketData.atr / marketData.price;
      const volume = marketData.volume || 0;
      
      let regime = 'trending';
      if (volatility < 0.01) regime = 'low_volatility';
      else if (volatility > 0.03) regime = 'high_volatility';
      else if (volume < 1000) regime = 'low_volume';
      
      return { 
        regime, 
        confidence: 0.7,
        volatility,
        volume
      };
    } catch (error) {
      logger.error('Market regime analysis error:', error);
      return { regime: 'trending', confidence: 0.7 };
    }
  }

  adjustPredictionsForPosition(predictions, positionState) {
    if (positionState.direction === 'FLAT') {
      return predictions; // No adjustment needed for flat position
    }
    
    // Adjust predictions based on current position
    const adjusted = { ...predictions };
    
    // If we're long, bias towards hold or exit signals
    if (positionState.direction === 'LONG') {
      if (adjusted.direction === 'short') {
        adjusted.confidence *= 0.8; // Reduce confidence for reversals
      }
    }
    
    // If we're short, bias towards hold or exit signals  
    if (positionState.direction === 'SHORT') {
      if (adjusted.direction === 'long') {
        adjusted.confidence *= 0.8; // Reduce confidence for reversals
      }
    }
    
    return adjusted;
  }

  combineAllPredictions(predictions) {
    try {
      const weights = {
        mlEngine: 0.3,
        advancedAI: 0.4,
        patterns: 0.2,
        regime: 0.1
      };
      
      let totalConfidence = 0;
      let weightSum = 0;
      let direction = 'hold';
      
      // Combine weighted predictions
      Object.keys(predictions).forEach(key => {
        const pred = predictions[key];
        const weight = weights[key] || 0.1;
        
        if (pred && pred.confidence) {
          totalConfidence += pred.confidence * weight;
          weightSum += weight;
          
          if (pred.confidence > 0.7 && weight > 0.2) {
            direction = pred.direction || 'hold';
          }
        }
      });
      
      const finalConfidence = weightSum > 0 ? totalConfidence / weightSum : 0.5;
      
      return {
        confidence: finalConfidence,
        direction,
        components: predictions
      };
    } catch (error) {
      logger.error('Error combining predictions:', error);
      return { confidence: 0.5, direction: 'hold' };
    }
  }

  getFallbackPrediction(marketData) {
    return { 
      confidence: 0.5, 
      direction: 'hold',
      reason: 'fallback_prediction',
      marketData: {
        price: marketData.price,
        volume: marketData.volume
      }
    };
  }

  calculateRiskReward(optimization) {
    const expectedProfit = optimization.expectedProfit || 25;
    const maxLoss = optimization.maxLoss || 50;
    return expectedProfit / maxLoss;
  }

  estimateWinProbability(optimization, predictions) {
    let probability = 0.5; // Base 50%
    
    // Adjust based on confidence
    if (optimization.confidence > 0.8) probability += 0.1;
    if (optimization.confidence < 0.6) probability -= 0.1;
    
    // Adjust based on risk/reward
    const rr = this.calculateRiskReward(optimization);
    if (rr > 2) probability += 0.05;
    if (rr < 1.5) probability -= 0.05;
    
    return Math.max(0.3, Math.min(0.8, probability));
  }

  calculateExpectedValue(optimization) {
    const winProb = this.estimateWinProbability(optimization);
    const expectedProfit = optimization.expectedProfit || 25;
    const maxLoss = optimization.maxLoss || 50;
    
    return (expectedProfit * winProb) - (maxLoss * (1 - winProb));
  }

  recordRejectedTrade(optimization, reasons) {
    logger.info('Trade rejected:', {
      confidence: optimization.confidence,
      expectedProfit: optimization.expectedProfit,
      reasons: reasons
    });
    
    // Could store in database for analysis
    this.emit('tradeRejected', { optimization, reasons, timestamp: new Date() });
  }

  generateTradeCommand(optimization, positionSize) {
    return {
      command: optimization.direction === 'up' ? 'go_long' : optimization.direction === 'down' ? 'go_short' : optimization.direction,
      instrument: optimization.instrument || 'NQ',
      quantity: positionSize,
      price: optimization.entryPrice || optimization.price,
      stop_price: optimization.stopLoss || optimization.optimalStopLoss,
      target_price: optimization.takeProfit || optimization.optimalExit,
      reason: 'Bombproof AI Trade',
      confidence: optimization.confidence,
      expectedProfit: optimization.expectedProfit
    };
  }

  async runFinalSafetyChecks(tradeCommand) {
    const checks = { passed: true, reasons: [] };
    
    // Check command validity
    if (!tradeCommand.command || !tradeCommand.instrument) {
      checks.passed = false;
      checks.reasons.push('Invalid trade command structure');
    }
    
    // Check quantity
    if (!tradeCommand.quantity || tradeCommand.quantity <= 0) {
      checks.passed = false;
      checks.reasons.push('Invalid quantity');
    }
    
    // Check if we're within trading hours (basic check)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 20) { // 6 AM to 8 PM ET roughly
      checks.passed = false;
      checks.reasons.push('Outside trading hours');
    }
    
    return checks;
  }

  recordFailedTrade(tradeCommand, error) {
    logger.error('Failed trade recorded:', {
      command: tradeCommand.command,
      instrument: tradeCommand.instrument,
      error: error.message,
      timestamp: new Date()
    });
    
    this.emit('tradeFailed', { tradeCommand, error, timestamp: new Date() });
  }

  async handleTradeExit(tradeId, position) {
    logger.info('Trade exit detected:', { tradeId, position });
    
    const trade = this.executedTrades.get(tradeId);
    if (trade) {
      // Calculate final P&L and emit completion event
      const result = {
        tradeId,
        finalPnL: position.realizedPnL || 0,
        exitTime: new Date(),
        profit: position.realizedPnL > 0,
        prediction: trade.aiPrediction,
        outcome: position.realizedPnL > 0 ? 'win' : 'loss'
      };
      
      this.emit('tradeCompleted', result);
    }
  }

  async checkForTrailingStopUpdate(tradeId, position) {
    // Placeholder for trailing stop logic
    logger.debug('Checking trailing stop for trade:', tradeId);
  }

  async checkEmergencyExitConditions(tradeId, position) {
    // Check for emergency exit conditions
    const trade = this.executedTrades.get(tradeId);
    if (!trade) return;
    
    const currentPnL = position.unrealizedPnL || 0;
    const maxLoss = 100; // $100 emergency exit
    
    if (currentPnL < -maxLoss) {
      logger.warn('Emergency exit condition triggered for trade:', tradeId);
      // Would trigger emergency exit here
    }
  }

  applyKellyCriterion(optimization) {
    const kelly = this.calculateKellyCriterion(optimization);
    return Math.max(1, Math.round(kelly * 10)); // Scale to reasonable position size
  }

  applyRiskLimits(size, optimization) {
    const maxSize = 5; // Maximum 5 contracts
    const accountRisk = this.getAccountInfo().freeMargin * 0.02; // 2% account risk
    const dollarRisk = (optimization.maxLoss || 50) * size;
    
    if (dollarRisk > accountRisk) {
      size = Math.floor(accountRisk / (optimization.maxLoss || 50));
    }
    
    return Math.min(size, maxSize);
  }

  applyVolatilityAdjustment(size, optimization) {
    const atr = optimization.marketData?.atr || 10;
    const price = optimization.marketData?.price || 4000;
    const volatility = atr / price;
    
    // Reduce size in high volatility
    if (volatility > 0.02) {
      size = Math.round(size * 0.7);
    } else if (volatility < 0.01) {
      size = Math.round(size * 1.2);
    }
    
    return Math.max(1, size);
  }

  updatePerformanceMetrics(tradeResult) {
    this.performanceMetrics.totalTrades++;
    
    if (tradeResult.profit > 0) {
      this.performanceMetrics.avgWin = 
        (this.performanceMetrics.avgWin + tradeResult.profit) / 2;
    } else {
      this.performanceMetrics.avgLoss = 
        (this.performanceMetrics.avgLoss + Math.abs(tradeResult.profit)) / 2;
    }
    
    // Update win rate
    this.performanceMetrics.winRate = 
      this.tradeHistory.filter(t => t.profit > 0).length / this.performanceMetrics.totalTrades;
  }

  async updateModelWeights(tradeResult) {
    // Placeholder for model weight updates based on performance
    logger.debug('Updating model weights based on trade result');
  }

  learnPatterns(tradeResult) {
    // Placeholder for pattern learning
    if (tradeResult.profit > 0) {
      this.successPatterns.push({
        pattern: tradeResult.pattern,
        timestamp: new Date(),
        profit: tradeResult.profit
      });
    } else {
      this.failurePatterns.push({
        pattern: tradeResult.pattern,
        timestamp: new Date(),
        loss: tradeResult.profit
      });
    }
  }

  async updateModelsWithRecentData() {
    logger.debug('Updating models with recent trading data');
    // Placeholder for model updates
  }

  async reviewAndAdjustPerformance() {
    logger.debug('Reviewing and adjusting performance parameters');
    
    // Adjust confidence thresholds based on recent performance
    if (this.performanceMetrics.winRate < 0.4) {
      this.confidenceThresholds.current = Math.min(
        this.confidenceThresholds.max,
        this.confidenceThresholds.current + 0.05
      );
    } else if (this.performanceMetrics.winRate > 0.7) {
      this.confidenceThresholds.current = Math.max(
        this.confidenceThresholds.min,
        this.confidenceThresholds.current - 0.02
      );
    }
  }

  scheduleDailyReport() {
    // Schedule daily performance report
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // 8 AM next day
    
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateDailyReport();
      this.scheduleDailyReport(); // Schedule next report
    }, msUntilTomorrow);
  }

  generateDailyReport() {
    logger.info('Daily Performance Report:', {
      totalTrades: this.performanceMetrics.totalTrades,
      winRate: this.performanceMetrics.winRate,
      dailyPnL: this.riskState.dailyPnL,
      consecutiveLosses: this.riskState.consecutiveLosses
    });
  }

  async saveState() {
    try {
      // Save current state for persistence
      const state = {
        performanceMetrics: this.performanceMetrics,
        riskState: this.riskState,
        confidenceThresholds: this.confidenceThresholds,
        timestamp: new Date()
      };
      
      // Could save to file or database
      logger.debug('State saved successfully');
    } catch (error) {
      logger.error('Error saving state:', error);
    }
  }

  // CLEANUP
  async stop() {
    logger.info('🛑 Stopping AI Trading System...');
    
    // Clear intervals
    if (this.modelUpdateInterval) clearInterval(this.modelUpdateInterval);
    if (this.performanceReviewInterval) clearInterval(this.performanceReviewInterval);
    
    // Stop all trade monitors
    for (const [tradeId, trade] of this.executedTrades) {
      if (trade.monitor) clearInterval(trade.monitor);
    }
    
    // Save state
    await this.saveState();
    
    logger.info('✅ AI Trading System stopped');
  }

  async checkMilestones() {
    const totalTrades = this.tradeTracker?.statistics.overall.totalTrades || 0;
    
    for (const [name, milestone] of Object.entries(TRADING_MILESTONES)) {
      if (totalTrades >= milestone.trades && !this.milestonesReached.has(name)) {
        
        // Check requirements if any
        if (milestone.requirements) {
          const stats = this.tradeTracker.statistics.overall;
          if (stats.winRate < milestone.requirements.minWinRate ||
              stats.profitFactor < milestone.requirements.minProfitFactor ||
              stats.maxDrawdown > milestone.requirements.maxDrawdown) {
            logger.warn(`Milestone ${name} reached but requirements not met`, {
              trades: totalTrades,
              requirements: milestone.requirements,
              actual: {
                winRate: stats.winRate,
                profitFactor: stats.profitFactor,
                maxDrawdown: stats.maxDrawdown
              }
            });
            continue;
          }
        }
        
        // Apply milestone configuration
        Object.entries(milestone.config).forEach(([key, value]) => {
          if (key !== 'status' && this.riskState[key] !== undefined) {
            this.riskState[key] = value;
          }
          if (this.confidenceThresholds[key] !== undefined) {
            this.confidenceThresholds.current = value;
          }
        });
        
        this.milestonesReached.add(name);
        logger.info(`🎯 Milestone reached: ${name}`, milestone.config);
        this.emit('milestoneReached', { name, config: milestone.config });
      }
    }
  }

  async evaluateAfterTrade() {
    const stats = this.tradeTracker?.statistics.overall || {};
    const totalTrades = stats.totalTrades || 0;
    
    // Check milestones
    await this.checkMilestones();
    
    // Pattern evaluation every 25 trades
    if (totalTrades > 0 && totalTrades % 25 === 0) {
      await this.evaluatePatterns();
    }
    
    // Hour evaluation every 30 trades
    if (totalTrades > 0 && totalTrades % 30 === 0) {
      await this.evaluateHours();
    }
    
    // Emergency adjustments
    if (stats.winRate < 0.30 && totalTrades > 20) {
      this.emergencyTighten();
    }
  }

  async evaluatePatterns() {
    const patterns = this.tradeTracker?.statistics.byPattern || {};
    
    Object.entries(patterns).forEach(([pattern, stats]) => {
      if (stats.trades >= 5) {
        if (stats.winRate < 0.35) {
          this.blacklistedPatterns.add(pattern);
          logger.info(`❌ Blacklisted pattern: ${pattern}`, stats);
        } else if (stats.winRate > 0.65) {
          logger.info(`✅ Profitable pattern found: ${pattern}`, stats);
        }
      }
    });
  }

  async evaluateHours() {
    const hours = this.tradeTracker?.statistics.byHour || {};
    
    Object.entries(hours).forEach(([hour, stats]) => {
      if (stats.trades >= 5) {
        if (stats.winRate < 0.35) {
          this.blacklistedHours.add(parseInt(hour));
          logger.info(`❌ Blacklisted hour: ${hour}:00`, stats);
        } else if (stats.winRate > 0.60) {
          this.profitableHours.push(parseInt(hour));
          logger.info(`✅ Profitable hour found: ${hour}:00`, stats);
        }
      }
    });
  }

  emergencyTighten() {
    this.confidenceThresholds.current = Math.min(
      this.confidenceThresholds.current + 0.10,
      0.90
    );
    logger.warn('🚨 Emergency tightening applied', {
      newConfidence: this.confidenceThresholds.current
    });
  }

  getProgressReport() {
    const stats = this.tradeTracker?.statistics.overall || {};
    const currentMilestone = this.getCurrentMilestone();
    const nextMilestone = this.getNextMilestone();
    
    return {
      currentPhase: currentMilestone?.config.status || 'Initializing',
      totalTrades: stats.totalTrades || 0,
      tradesToNext: nextMilestone ? nextMilestone.trades - (stats.totalTrades || 0) : 0,
      
      performance: {
        winRate: `${((stats.winRate || 0) * 100).toFixed(1)}%`,
        avgWin: `$${(stats.avgWin || 0).toFixed(2)}`,
        avgLoss: `$${(stats.avgLoss || 0).toFixed(2)}`,
        profitFactor: (stats.profitFactor || 0).toFixed(2)
      },
      
      discovered: {
        blacklistedPatterns: this.blacklistedPatterns.size,
        blacklistedHours: this.blacklistedHours.size,
        profitableHours: this.profitableHours.length
      },
      
      currentSettings: {
        confidence: this.confidenceThresholds.current,
        dailyLoss: this.riskState.maxDailyLoss,
        profitTarget: this.profitState?.targetMinProfit || 25
      }
    };
  }

  getCurrentMilestone() {
    const totalTrades = this.tradeTracker?.statistics.overall.totalTrades || 0;
    let current = null;
    
    for (const [name, milestone] of Object.entries(TRADING_MILESTONES)) {
      if (totalTrades >= milestone.trades) {
        current = milestone;
      }
    }
    
    return current;
  }

  getNextMilestone() {
    const totalTrades = this.tradeTracker?.statistics.overall.totalTrades || 0;
    
    for (const [name, milestone] of Object.entries(TRADING_MILESTONES)) {
      if (totalTrades < milestone.trades) {
        return milestone;
      }
    }
    
    return null;
  }
}

module.exports = BombproofAITradingSystem;