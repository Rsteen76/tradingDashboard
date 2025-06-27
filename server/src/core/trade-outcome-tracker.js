// Trade Outcome Tracking System for Continuous Learning
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class TradeOutcomeTracker extends EventEmitter {
  constructor(dependencies) {
    super();
    
    this.adaptiveLearning = dependencies.adaptiveLearning;
    this.dataCollector = dependencies.dataCollector;
    this.logger = dependencies.logger;
    
    // Active trades being tracked
    this.activeTrades = new Map();
    
    // Completed trades with full lifecycle
    this.completedTrades = [];
    
    // Performance statistics
    this.statistics = {
      byHour: {},
      byDay: {},
      byPattern: {},
      byConfidence: {},
      byMarketRegime: {},
      overall: {
        totalTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        sharpeRatio: 0,
        maxDrawdown: 0
      }
    };
    
    // Learning patterns
    this.successPatterns = [];
    this.failurePatterns = [];
    
    this.saveInterval = null;
  }

  async initialize() {
    // Load historical data
    await this.loadHistoricalData();
    
    // Start auto-save interval
    this.saveInterval = setInterval(() => this.saveData(), 5 * 60 * 1000); // Every 5 minutes
    
    this.logger.info('✅ Trade Outcome Tracker initialized');
  }

  // Track new trade entry
  async trackTradeEntry(trade) {
    const tradeRecord = {
      id: trade.tradeId,
      instrument: trade.instrument,
      direction: trade.direction,
      entryTime: new Date(),
      entryPrice: trade.price,
      quantity: trade.quantity,
      stopLoss: trade.stop_price,
      takeProfit: trade.target_price,
      
      // AI/ML context
      aiPrediction: trade.aiPrediction,
      confidence: trade.confidence,
      expectedProfit: trade.expectedProfit,
      riskRewardRatio: trade.riskRewardRatio,
      marketRegime: trade.marketRegime,
      patterns: trade.patterns || [],
      
      // Market context at entry
      entryMarketData: {
        atr: trade.marketData?.atr,
        rsi: trade.marketData?.rsi,
        volume: trade.marketData?.volume,
        volatility: trade.marketData?.volatility,
        trend: trade.marketData?.trend,
        support: trade.marketData?.support,
        resistance: trade.marketData?.resistance
      },
      
      // Tracking data
      maxFavorable: 0,
      maxAdverse: 0,
      updates: [],
      warnings: []
    };
    
    this.activeTrades.set(trade.tradeId, tradeRecord);
    
    this.logger.info('📊 Tracking new trade:', {
      id: trade.tradeId,
      instrument: trade.instrument,
      direction: trade.direction,
      confidence: trade.confidence
    });
    
    return tradeRecord;
  }

  // Update trade with price movements
  async updateTrade(tradeId, marketData) {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return;
    
    const currentPrice = marketData.price;
    const entryPrice = trade.entryPrice;
    
    // Calculate current P&L
    const priceDiff = trade.direction === 'long' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    const currentPnL = priceDiff * trade.quantity;
    
    // Update max favorable/adverse excursion
    if (currentPnL > trade.maxFavorable) {
      trade.maxFavorable = currentPnL;
    }
    if (currentPnL < trade.maxAdverse) {
      trade.maxAdverse = currentPnL;
    }
    
    // Record update
    trade.updates.push({
      timestamp: new Date(),
      price: currentPrice,
      pnl: currentPnL,
      marketData: {
        volume: marketData.volume,
        rsi: marketData.rsi,
        atr: marketData.atr
      }
    });
    
    // Check for warnings
    this.checkTradeWarnings(trade, currentPnL, marketData);
    
    return {
      tradeId,
      currentPnL,
      maxFavorable: trade.maxFavorable,
      maxAdverse: trade.maxAdverse
    };
  }

  // Complete trade and calculate final metrics
  async completeTrade(tradeId, exitData) {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) {
      this.logger.warn('Trade not found for completion:', tradeId);
      return;
    }
    
    // Record exit details
    trade.exitTime = new Date();
    trade.exitPrice = exitData.price;
    trade.exitReason = exitData.reason; // 'stop_loss', 'take_profit', 'manual', 'trailing_stop'
    trade.slippage = Math.abs(exitData.price - (exitData.expectedPrice || exitData.price));
    
    // Calculate final P&L
    const priceDiff = trade.direction === 'long' 
      ? trade.exitPrice - trade.entryPrice 
      : trade.entryPrice - trade.exitPrice;
    
    trade.finalPnL = priceDiff * trade.quantity;
    trade.finalPnLPercent = (priceDiff / trade.entryPrice) * 100;
    trade.success = trade.finalPnL > 0;
    
    // Calculate trade metrics
    trade.metrics = this.calculateTradeMetrics(trade);
    
    // Market context at exit
    trade.exitMarketData = {
      atr: exitData.marketData?.atr,
      rsi: exitData.marketData?.rsi,
      volume: exitData.marketData?.volume,
      volatility: exitData.marketData?.volatility,
      trend: exitData.marketData?.trend
    };
    
    // Move to completed trades
    this.activeTrades.delete(tradeId);
    this.completedTrades.push(trade);
    
    // Update statistics
    await this.updateStatistics(trade);
    
    // Learn from outcome
    await this.learnFromOutcome(trade);
    
    // Emit completion event
    this.emit('tradeCompleted', trade);
    
    this.logger.info('✅ Trade completed:', {
      id: tradeId,
      pnl: trade.finalPnL.toFixed(2),
      success: trade.success,
      duration: (trade.exitTime - trade.entryTime) / 1000 / 60, // minutes
      reason: trade.exitReason
    });
    
    return trade;
  }

  // Calculate comprehensive trade metrics
  calculateTradeMetrics(trade) {
    const duration = trade.exitTime - trade.entryTime;
    const durationMinutes = duration / 1000 / 60;
    
    return {
      // Performance metrics
      roi: trade.finalPnLPercent,
      riskRewardRealized: Math.abs(trade.finalPnL / trade.maxAdverse),
      
      // Efficiency metrics
      efficiency: trade.maxFavorable > 0 ? trade.finalPnL / trade.maxFavorable : 0,
      capturedMove: trade.finalPnL / (trade.maxFavorable - trade.maxAdverse),
      
      // Risk metrics
      maxDrawdownPercent: (trade.maxAdverse / trade.entryPrice) * 100,
      timeInDrawdown: this.calculateTimeInDrawdown(trade),
      
      // Timing metrics
      durationMinutes,
      entryTiming: this.evaluateEntryTiming(trade),
      exitTiming: this.evaluateExitTiming(trade),
      
      // AI/ML accuracy
      predictionAccuracy: this.calculatePredictionAccuracy(trade),
      confidenceCalibration: this.evaluateConfidenceCalibration(trade)
    };
  }

  // Learn from trade outcome
  async learnFromOutcome(trade) {
    // 1. Send to adaptive learning engine
    if (this.adaptiveLearning) {
      await this.adaptiveLearning.recordOutcome(
        {
          instrument: trade.instrument,
          timestamp: trade.entryTime,
          direction: trade.direction === 'long' ? 1 : -1,
          confidence: trade.confidence,
          features: trade.entryMarketData
        },
        {
          direction: trade.success ? trade.direction : (trade.direction === 'long' ? 'short' : 'long'),
          actualProfit: trade.finalPnL,
          duration: trade.metrics.durationMinutes
        }
      );
    }
    
    // 2. Extract patterns
    const pattern = {
      marketRegime: trade.marketRegime,
      confidence: trade.confidence,
      rsi: trade.entryMarketData.rsi,
      volatility: trade.entryMarketData.volatility,
      timeOfDay: trade.entryTime.getHours(),
      dayOfWeek: trade.entryTime.getDay(),
      patterns: trade.patterns
    };
    
    if (trade.success) {
      this.successPatterns.push({
        pattern,
        profit: trade.finalPnL,
        roi: trade.finalPnLPercent,
        efficiency: trade.metrics.efficiency
      });
    } else {
      this.failurePatterns.push({
        pattern,
        loss: Math.abs(trade.finalPnL),
        maxAdverse: trade.maxAdverse,
        reason: trade.exitReason
      });
    }
    
    // 3. Update pattern statistics
    await this.updatePatternStatistics(pattern, trade);
  }

  // Update running statistics
  async updateStatistics(trade) {
    // Overall statistics
    this.statistics.overall.totalTrades++;
    
    const wins = this.completedTrades.filter(t => t.success).length;
    this.statistics.overall.winRate = wins / this.statistics.overall.totalTrades;
    
    // Average win/loss
    const winningTrades = this.completedTrades.filter(t => t.success);
    const losingTrades = this.completedTrades.filter(t => !t.success);
    
    this.statistics.overall.avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.finalPnL, 0) / winningTrades.length
      : 0;
      
    this.statistics.overall.avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.finalPnL, 0) / losingTrades.length)
      : 0;
    
    // Profit factor
    const totalWins = winningTrades.reduce((sum, t) => sum + t.finalPnL, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.finalPnL, 0));
    this.statistics.overall.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
    
    // Expectancy
    this.statistics.overall.expectancy = 
      (this.statistics.overall.winRate * this.statistics.overall.avgWin) -
      ((1 - this.statistics.overall.winRate) * this.statistics.overall.avgLoss);
    
    // Time-based statistics
    const hour = trade.entryTime.getHours();
    const day = trade.entryTime.getDay();
    
    this.updateTimeStatistics('byHour', hour, trade);
    this.updateTimeStatistics('byDay', day, trade);
    
    // Pattern-based statistics
    if (trade.patterns && trade.patterns.length > 0) {
      trade.patterns.forEach(pattern => {
        this.updatePatternStatistic(pattern, trade);
      });
    }
    
    // Confidence-based statistics
    const confBucket = Math.floor(trade.confidence * 10) / 10; // Round to nearest 0.1
    this.updateConfidenceStatistics(confBucket, trade);
    
    // Emit statistics update
    this.emit('statisticsUpdated', this.statistics);
  }

  // Helper methods
  checkTradeWarnings(trade, currentPnL, marketData) {
    // Warning: Approaching stop loss
    const stopDistance = Math.abs(currentPnL - (trade.stopLoss - trade.entryPrice) * trade.quantity);
    if (stopDistance < trade.entryPrice * 0.001) { // Within 0.1% of stop
      trade.warnings.push({
        type: 'approaching_stop',
        timestamp: new Date(),
        distance: stopDistance
      });
    }
    
    // Warning: Profit giveback
    if (trade.maxFavorable > 50 && currentPnL < trade.maxFavorable * 0.5) {
      trade.warnings.push({
        type: 'profit_giveback',
        timestamp: new Date(),
        givebackPercent: (1 - currentPnL / trade.maxFavorable) * 100
      });
    }
    
    // Warning: Market regime change
    if (marketData.regime && marketData.regime !== trade.marketRegime) {
      trade.warnings.push({
        type: 'regime_change',
        timestamp: new Date(),
        oldRegime: trade.marketRegime,
        newRegime: marketData.regime
      });
    }
  }

  calculateTimeInDrawdown(trade) {
    let timeInDrawdown = 0;
    let inDrawdown = false;
    let drawdownStart = null;
    
    trade.updates.forEach(update => {
      if (update.pnl < 0 && !inDrawdown) {
        inDrawdown = true;
        drawdownStart = update.timestamp;
      } else if (update.pnl >= 0 && inDrawdown) {
        inDrawdown = false;
        timeInDrawdown += update.timestamp - drawdownStart;
      }
    });
    
    if (inDrawdown && trade.exitTime) {
      timeInDrawdown += trade.exitTime - drawdownStart;
    }
    
    return timeInDrawdown / 1000 / 60; // Convert to minutes
  }

  evaluateEntryTiming(trade) {
    // Compare entry to optimal entry (lowest/highest point before favorable move)
    const optimalEntry = trade.direction === 'long'
      ? Math.min(...trade.updates.map(u => u.price))
      : Math.max(...trade.updates.map(u => u.price));
    
    const entryEfficiency = trade.direction === 'long'
      ? (optimalEntry / trade.entryPrice)
      : (trade.entryPrice / optimalEntry);
    
    return {
      efficiency: entryEfficiency,
      rating: entryEfficiency > 0.99 ? 'excellent' : 
               entryEfficiency > 0.97 ? 'good' : 
               entryEfficiency > 0.95 ? 'fair' : 'poor'
    };
  }

  evaluateExitTiming(trade) {
    // Compare exit to optimal exit
    const optimalExit = trade.direction === 'long'
      ? Math.max(...trade.updates.map(u => u.price))
      : Math.min(...trade.updates.map(u => u.price));
    
    const exitEfficiency = trade.direction === 'long'
      ? (trade.exitPrice / optimalExit)
      : (optimalExit / trade.exitPrice);
    
    return {
      efficiency: exitEfficiency,
      rating: exitEfficiency > 0.95 ? 'excellent' : 
               exitEfficiency > 0.90 ? 'good' : 
               exitEfficiency > 0.85 ? 'fair' : 'poor'
    };
  }

  calculatePredictionAccuracy(trade) {
    // Was the direction prediction correct?
    const directionCorrect = trade.success;
    
    // How close was the profit prediction?
    const profitError = Math.abs(trade.finalPnL - trade.expectedProfit) / Math.abs(trade.expectedProfit);
    const profitAccuracy = Math.max(0, 1 - profitError);
    
    return {
      direction: directionCorrect,
      profit: profitAccuracy,
      overall: (directionCorrect ? 0.7 : 0) + (profitAccuracy * 0.3)
    };
  }

  evaluateConfidenceCalibration(trade) {
    // Is high confidence correlated with success?
    const expectedSuccess = trade.confidence;
    const actualSuccess = trade.success ? 1 : 0;
    
    return {
      expected: expectedSuccess,
      actual: actualSuccess,
      calibrationError: Math.abs(expectedSuccess - actualSuccess),
      wellCalibrated: Math.abs(expectedSuccess - actualSuccess) < 0.2
    };
  }

  updateTimeStatistics(category, key, trade) {
    if (!this.statistics[category][key]) {
      this.statistics[category][key] = {
        trades: 0,
        wins: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0
      };
    }
    
    const stat = this.statistics[category][key];
    stat.trades++;
    if (trade.success) stat.wins++;
    stat.totalPnL += trade.finalPnL;
    stat.avgPnL = stat.totalPnL / stat.trades;
    stat.winRate = stat.wins / stat.trades;
  }

  updatePatternStatistic(pattern, trade) {
    if (!this.statistics.byPattern[pattern]) {
      this.statistics.byPattern[pattern] = {
        trades: 0,
        wins: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0,
        avgEfficiency: 0
      };
    }
    
    const stat = this.statistics.byPattern[pattern];
    stat.trades++;
    if (trade.success) stat.wins++;
    stat.totalPnL += trade.finalPnL;
    stat.avgPnL = stat.totalPnL / stat.trades;
    stat.winRate = stat.wins / stat.trades;
    stat.avgEfficiency = (stat.avgEfficiency * (stat.trades - 1) + trade.metrics.efficiency) / stat.trades;
  }

  updateConfidenceStatistics(confBucket, trade) {
    if (!this.statistics.byConfidence[confBucket]) {
      this.statistics.byConfidence[confBucket] = {
        trades: 0,
        wins: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0,
        calibration: 0
      };
    }
    
    const stat = this.statistics.byConfidence[confBucket];
    stat.trades++;
    if (trade.success) stat.wins++;
    stat.totalPnL += trade.finalPnL;
    stat.avgPnL = stat.totalPnL / stat.trades;
    stat.winRate = stat.wins / stat.trades;
    stat.calibration = Math.abs(confBucket - stat.winRate);
  }

  // Generate insights from patterns
  generateInsights() {
    const insights = [];
    
    // Time-based insights
    const bestHour = this.findBestTimeUnit(this.statistics.byHour);
    const worstHour = this.findWorstTimeUnit(this.statistics.byHour);
    
    if (bestHour) {
      insights.push({
        type: 'time_optimization',
        message: `Best trading hour: ${bestHour.key}:00 with ${(bestHour.winRate * 100).toFixed(1)}% win rate`,
        importance: 'high',
        actionable: true
      });
    }
    
    // Pattern insights
    const bestPattern = this.findBestPattern();
    if (bestPattern) {
      insights.push({
        type: 'pattern_optimization',
        message: `Most profitable pattern: ${bestPattern.name} with avg profit $${bestPattern.avgPnL.toFixed(2)}`,
        importance: 'high',
        actionable: true
      });
    }
    
    // Confidence calibration insights
    const calibrationIssues = this.findCalibrationIssues();
    if (calibrationIssues.length > 0) {
      insights.push({
        type: 'confidence_calibration',
        message: `Confidence calibration issues detected: ${calibrationIssues.join(', ')}`,
        importance: 'medium',
        actionable: true
      });
    }
    
    // Risk management insights
    if (this.statistics.overall.maxDrawdown > 0.15) {
      insights.push({
        type: 'risk_management',
        message: `High drawdown detected: ${(this.statistics.overall.maxDrawdown * 100).toFixed(1)}%`,
        importance: 'critical',
        actionable: true
      });
    }
    
    return insights;
  }

  findBestTimeUnit(timeStats) {
    let best = null;
    let bestScore = -Infinity;
    
    Object.entries(timeStats).forEach(([key, stats]) => {
      if (stats.trades >= 5) { // Minimum sample size
        const score = stats.winRate * stats.avgPnL;
        if (score > bestScore) {
          bestScore = score;
          best = { key, ...stats };
        }
      }
    });
    
    return best;
  }

  findWorstTimeUnit(timeStats) {
    let worst = null;
    let worstScore = Infinity;
    
    Object.entries(timeStats).forEach(([key, stats]) => {
      if (stats.trades >= 5) { // Minimum sample size
        const score = stats.winRate * stats.avgPnL;
        if (score < worstScore) {
          worstScore = score;
          worst = { key, ...stats };
        }
      }
    });
    
    return worst;
  }

  findBestPattern() {
    let best = null;
    let bestScore = -Infinity;
    
    Object.entries(this.statistics.byPattern).forEach(([pattern, stats]) => {
      if (stats.trades >= 3) { // Minimum sample size
        const score = stats.winRate * stats.avgPnL * stats.avgEfficiency;
        if (score > bestScore) {
          bestScore = score;
          best = { name: pattern, ...stats };
        }
      }
    });
    
    return best;
  }

  findCalibrationIssues() {
    const issues = [];
    
    Object.entries(this.statistics.byConfidence).forEach(([conf, stats]) => {
      if (stats.trades >= 10 && stats.calibration > 0.2) {
        if (stats.winRate > parseFloat(conf)) {
          issues.push(`Underconfident at ${conf} level`);
        } else {
          issues.push(`Overconfident at ${conf} level`);
        }
      }
    });
    
    return issues;
  }

  // Data persistence
  async saveData() {
    try {
      const data = {
        completedTrades: this.completedTrades,
        statistics: this.statistics,
        successPatterns: this.successPatterns,
        failurePatterns: this.failurePatterns,
        lastSaved: new Date().toISOString()
      };
      
      const filePath = path.join(__dirname, '../../data/trade-outcomes.json');
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      this.logger.debug('Trade outcomes saved');
    } catch (error) {
      this.logger.error('Failed to save trade outcomes:', error);
    }
  }

  async loadHistoricalData() {
    try {
      const filePath = path.join(__dirname, '../../data/trade-outcomes.json');
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      this.completedTrades = parsed.completedTrades || [];
      this.statistics = parsed.statistics || this.statistics;
      this.successPatterns = parsed.successPatterns || [];
      this.failurePatterns = parsed.failurePatterns || [];
      
      this.logger.info(`Loaded ${this.completedTrades.length} historical trades`);
    } catch (error) {
      this.logger.debug('No historical trade data found');
    }
  }

  // Cleanup
  async stop() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    await this.saveData();
    this.logger.info('Trade outcome tracker stopped');
  }
}

module.exports = TradeOutcomeTracker;