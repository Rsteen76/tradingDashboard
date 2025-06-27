// Bombproof AI Trading System with continuous improvement
const EventEmitter = require('events');
const logger = require('../utils/logger');

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
    if (!this.ninjaService.isConnected) {
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
}

module.exports = BombproofAITradingSystem;