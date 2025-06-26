const tf = require('@tensorflow/tfjs');
const fs = require('fs').promises;
const path = require('path');

class AdaptiveLearningEngine {
  constructor() {
    this.performanceHistory = [];
    this.marketPatterns = new Map();
    this.strategyMetrics = {
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      avgWin: 0,
      avgLoss: 0
    };
    
    // Learning parameters
    this.learningRate = 0.001;
    this.adaptationThreshold = 0.05; // 5% performance change triggers adaptation
    this.minSamplesForLearning = 50;
    
    // Market regime detection
    this.marketRegimes = ['trending', 'ranging', 'volatile', 'calm'];
    this.currentRegime = 'unknown';
    this.regimeConfidence = 0;
    
    // Pattern recognition
    this.patternDatabase = new Map();
    this.successfulPatterns = [];
    this.failedPatterns = [];
    
    this.initializeLearningSystem();
  }

  async initializeLearningSystem() {
    console.log('🧠 Initializing Adaptive Learning Engine...');
    
    try {
      // Load historical performance data
      await this.loadHistoricalData();
      
      // Initialize pattern recognition models
      await this.initializePatternRecognition();
      
      // Setup real-time learning pipeline
      this.setupLearningPipeline();
      
      console.log('✅ Adaptive Learning Engine initialized');
    } catch (error) {
      console.error('❌ Error initializing learning engine:', error);
    }
  }

  // Real-time learning from trade outcomes
  async learnFromTrade(tradeData) {
    const {
      direction,
      entryPrice,
      exitPrice,
      pnl,
      entryTime,
      exitTime,
      marketConditions,
      signalStrength,
      mlConfidence,
      indicators
    } = tradeData;

    // Record trade outcome
    const tradeOutcome = {
      timestamp: new Date().toISOString(),
      direction,
      entryPrice,
      exitPrice,
      pnl,
      duration: new Date(exitTime) - new Date(entryTime),
      marketConditions,
      signalStrength,
      mlConfidence,
      indicators,
      success: pnl > 0,
      roi: (pnl / entryPrice) * 100
    };

    this.performanceHistory.push(tradeOutcome);

    // Extract and learn from patterns
    await this.extractTradePatterns(tradeOutcome);
    
    // Update strategy metrics
    this.updateStrategyMetrics();
    
    // Trigger adaptation if needed
    await this.checkForAdaptation();
    
    // Update market regime understanding
    this.updateMarketRegimeDetection(marketConditions);

    console.log(`📊 Learned from trade: ${direction} ${pnl > 0 ? '✅' : '❌'} PnL: ${pnl.toFixed(2)}`);
  }

  // Extract patterns from successful and failed trades
  async extractTradePatterns(tradeOutcome) {
    const pattern = {
      marketRegime: this.currentRegime,
      timeOfDay: new Date(tradeOutcome.timestamp).getHours(),
      dayOfWeek: new Date(tradeOutcome.timestamp).getDay(),
      volatility: tradeOutcome.marketConditions?.volatility || 0,
      volume: tradeOutcome.marketConditions?.volume || 0,
      trend: tradeOutcome.marketConditions?.trend || 'neutral',
      signalStrength: tradeOutcome.signalStrength,
      mlConfidence: tradeOutcome.mlConfidence,
      indicators: tradeOutcome.indicators
    };

    const patternKey = this.generatePatternKey(pattern);
    
    if (!this.patternDatabase.has(patternKey)) {
      this.patternDatabase.set(patternKey, {
        pattern,
        trades: [],
        successRate: 0,
        avgPnL: 0,
        count: 0
      });
    }

    const patternData = this.patternDatabase.get(patternKey);
    patternData.trades.push(tradeOutcome);
    patternData.count++;
    
    // Update pattern statistics
    const successfulTrades = patternData.trades.filter(t => t.success);
    patternData.successRate = successfulTrades.length / patternData.count;
    patternData.avgPnL = patternData.trades.reduce((sum, t) => sum + t.pnl, 0) / patternData.count;

    // Classify as successful or failed pattern
    if (patternData.count >= 10) { // Minimum sample size
      if (patternData.successRate >= 0.6 && patternData.avgPnL > 0) {
        this.addToSuccessfulPatterns(patternKey, patternData);
      } else if (patternData.successRate <= 0.4 || patternData.avgPnL < 0) {
        this.addToFailedPatterns(patternKey, patternData);
      }
    }
  }

  // Generate recommendations based on current market conditions
  generateTradingRecommendations(currentMarketData) {
    const recommendations = {
      shouldTrade: true,
      confidence: 0.5,
      suggestedDirection: null,
      riskAdjustment: 1.0,
      reasoning: []
    };

    // Check against successful patterns
    const currentPattern = this.extractCurrentPattern(currentMarketData);
    const matchingSuccessfulPatterns = this.findMatchingPatterns(currentPattern, this.successfulPatterns);
    const matchingFailedPatterns = this.findMatchingPatterns(currentPattern, this.failedPatterns);

    if (matchingSuccessfulPatterns.length > 0) {
      const avgSuccessRate = matchingSuccessfulPatterns.reduce((sum, p) => sum + p.successRate, 0) / matchingSuccessfulPatterns.length;
      recommendations.confidence = Math.min(avgSuccessRate, 0.95);
      recommendations.reasoning.push(`Matches ${matchingSuccessfulPatterns.length} successful patterns (${(avgSuccessRate * 100).toFixed(1)}% success rate)`);
    }

    if (matchingFailedPatterns.length > 0) {
      const avgFailureRate = matchingFailedPatterns.reduce((sum, p) => sum + (1 - p.successRate), 0) / matchingFailedPatterns.length;
      recommendations.confidence *= (1 - avgFailureRate);
      recommendations.shouldTrade = recommendations.confidence > 0.4;
      recommendations.reasoning.push(`Warning: Matches ${matchingFailedPatterns.length} failed patterns`);
    }

    // Market regime adjustments
    const regimeAdjustment = this.getRegimeAdjustment();
    recommendations.riskAdjustment = regimeAdjustment.riskMultiplier;
    recommendations.reasoning.push(`Market regime: ${this.currentRegime} (${(this.regimeConfidence * 100).toFixed(1)}% confidence)`);

    // Time-based adjustments
    const timeAdjustment = this.getTimeBasedAdjustment();
    recommendations.confidence *= timeAdjustment.confidenceMultiplier;
    recommendations.reasoning.push(timeAdjustment.reasoning);

    return recommendations;
  }

  // Dynamic strategy parameter optimization
  async optimizeStrategyParameters() {
    if (this.performanceHistory.length < this.minSamplesForLearning) {
      return null;
    }

    console.log('🔧 Optimizing strategy parameters...');

    const recentTrades = this.performanceHistory.slice(-100); // Last 100 trades
    const analysis = this.analyzeTradePerformance(recentTrades);

    const optimizations = {
      signalStrengthThreshold: this.optimizeSignalThreshold(recentTrades),
      riskPerTrade: this.optimizeRiskPerTrade(recentTrades),
      stopLossMultiplier: this.optimizeStopLoss(recentTrades),
      takeProfitRatio: this.optimizeTakeProfit(recentTrades),
      timeFilters: this.optimizeTimeFilters(recentTrades),
      marketRegimeFilters: this.optimizeRegimeFilters(recentTrades)
    };

    // Save optimizations
    await this.saveOptimizations(optimizations);

    console.log('✅ Strategy parameters optimized:', optimizations);
    return optimizations;
  }

  // Market regime detection and adaptation
  updateMarketRegimeDetection(marketConditions) {
    const features = [
      marketConditions.volatility || 0,
      marketConditions.volume || 0,
      marketConditions.trendStrength || 0,
      marketConditions.priceRange || 0
    ];

    // Simple regime classification based on volatility and trend
    const volatility = features[0];
    const trendStrength = features[2];

    if (volatility > 0.8) {
      this.currentRegime = 'volatile';
      this.regimeConfidence = Math.min(volatility, 0.95);
    } else if (trendStrength > 0.7) {
      this.currentRegime = 'trending';
      this.regimeConfidence = Math.min(trendStrength, 0.95);
    } else if (volatility < 0.3 && trendStrength < 0.3) {
      this.currentRegime = 'ranging';
      this.regimeConfidence = Math.min(1 - Math.max(volatility, trendStrength), 0.95);
    } else {
      this.currentRegime = 'calm';
      this.regimeConfidence = 0.6;
    }
  }

  // Performance analytics and insights
  generatePerformanceInsights() {
    if (this.performanceHistory.length === 0) {
      return { message: 'No trading history available yet' };
    }

    const insights = {
      overall: this.strategyMetrics,
      timeAnalysis: this.analyzeTimePerformance(),
      regimeAnalysis: this.analyzeRegimePerformance(),
      patternAnalysis: this.analyzePatternPerformance(),
      recommendations: this.generateImprovementRecommendations()
    };

    return insights;
  }

  analyzeTimePerformance() {
    const hourlyPerformance = {};
    const dailyPerformance = {};

    this.performanceHistory.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours();
      const day = new Date(trade.timestamp).getDay();

      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = { trades: 0, pnl: 0, wins: 0 };
      }
      if (!dailyPerformance[day]) {
        dailyPerformance[day] = { trades: 0, pnl: 0, wins: 0 };
      }

      hourlyPerformance[hour].trades++;
      hourlyPerformance[hour].pnl += trade.pnl;
      if (trade.success) hourlyPerformance[hour].wins++;

      dailyPerformance[day].trades++;
      dailyPerformance[day].pnl += trade.pnl;
      if (trade.success) dailyPerformance[day].wins++;
    });

    return { hourlyPerformance, dailyPerformance };
  }

  generateImprovementRecommendations() {
    const recommendations = [];

    // Win rate analysis
    if (this.strategyMetrics.winRate < 0.5) {
      recommendations.push({
        type: 'signal_quality',
        priority: 'high',
        message: 'Consider increasing signal strength threshold to improve win rate',
        action: 'increase_signal_threshold'
      });
    }

    // Risk management analysis
    if (this.strategyMetrics.maxDrawdown > 0.1) {
      recommendations.push({
        type: 'risk_management',
        priority: 'high',
        message: 'High drawdown detected. Consider reducing position size or tightening stops',
        action: 'reduce_risk'
      });
    }

    // Profit factor analysis
    if (this.strategyMetrics.profitFactor < 1.2) {
      recommendations.push({
        type: 'profit_optimization',
        priority: 'medium',
        message: 'Low profit factor. Consider optimizing take profit levels',
        action: 'optimize_targets'
      });
    }

    return recommendations;
  }

  // Helper methods
  generatePatternKey(pattern) {
    return `${pattern.marketRegime}_${pattern.timeOfDay}_${Math.floor(pattern.volatility * 10)}_${pattern.trend}`;
  }

  addToSuccessfulPatterns(key, data) {
    if (!this.successfulPatterns.find(p => p.key === key)) {
      this.successfulPatterns.push({ key, ...data });
      console.log(`✅ New successful pattern identified: ${key}`);
    }
  }

  addToFailedPatterns(key, data) {
    if (!this.failedPatterns.find(p => p.key === key)) {
      this.failedPatterns.push({ key, ...data });
      console.log(`❌ New failed pattern identified: ${key}`);
    }
  }

  updateStrategyMetrics() {
    if (this.performanceHistory.length === 0) return;

    const trades = this.performanceHistory;
    const wins = trades.filter(t => t.success);
    const losses = trades.filter(t => !t.success);

    this.strategyMetrics.winRate = wins.length / trades.length;
    this.strategyMetrics.avgWin = wins.reduce((sum, t) => sum + t.pnl, 0) / Math.max(wins.length, 1);
    this.strategyMetrics.avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0)) / Math.max(losses.length, 1);
    this.strategyMetrics.profitFactor = this.strategyMetrics.avgWin / Math.max(this.strategyMetrics.avgLoss, 0.01);

    // Calculate drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    trades.forEach(trade => {
      runningPnL += trade.pnl;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = (peak - runningPnL) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    this.strategyMetrics.maxDrawdown = maxDrawdown;
  }

  async saveOptimizations(optimizations) {
    try {
      const optimizationData = {
        timestamp: new Date().toISOString(),
        optimizations,
        performanceMetrics: this.strategyMetrics,
        sampleSize: this.performanceHistory.length
      };

      await fs.writeFile(
        path.join(__dirname, '../data/strategy_optimizations.json'),
        JSON.stringify(optimizationData, null, 2)
      );
    } catch (error) {
      console.error('Error saving optimizations:', error);
    }
  }

  async loadHistoricalData() {
    try {
      const data = await fs.readFile(path.join(__dirname, '../data/trade_history.json'), 'utf8');
      this.performanceHistory = JSON.parse(data);
      console.log(`📚 Loaded ${this.performanceHistory.length} historical trades`);
    } catch (error) {
      console.log('📝 No historical data found, starting fresh');
      this.performanceHistory = [];
    }
  }

  // Additional helper methods implementation
  async initializePatternRecognition() {
    // Initialize pattern recognition system
    console.log('🔍 Pattern recognition system initialized')
  }

  setupLearningPipeline() {
    // Setup learning pipeline
    console.log('🔄 Learning pipeline setup complete')
  }

  async checkForAdaptation() {
    // Check if adaptation is needed based on performance changes
    if (this.performanceHistory.length < this.minSamplesForLearning) {
      return false
    }

    const recentPerformance = this.performanceHistory.slice(-20)
    const olderPerformance = this.performanceHistory.slice(-40, -20)

    if (recentPerformance.length < 10 || olderPerformance.length < 10) {
      return false
    }

    const recentWinRate = recentPerformance.filter(t => t.success).length / recentPerformance.length
    const olderWinRate = olderPerformance.filter(t => t.success).length / olderPerformance.length

    const performanceChange = Math.abs(recentWinRate - olderWinRate)
    
    if (performanceChange > this.adaptationThreshold) {
      console.log(`🔧 Performance change detected: ${(performanceChange * 100).toFixed(1)}% - triggering adaptation`)
      await this.optimizeStrategyParameters()
      return true
    }

    return false
  }

  extractCurrentPattern(marketData) {
    return {
      marketRegime: this.currentRegime,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      volatility: marketData.volatility || 0,
      volume: marketData.volume || 0,
      trend: marketData.trend || 'neutral',
      signalStrength: marketData.signalStrength || 0,
      mlConfidence: marketData.mlConfidence || 0
    }
  }

  findMatchingPatterns(pattern, patternList) {
    return patternList.filter(p => {
      const similarity = this.calculatePatternSimilarity(pattern, p.pattern)
      return similarity > 0.7 // 70% similarity threshold
    })
  }

  calculatePatternSimilarity(pattern1, pattern2) {
    // Simple similarity calculation based on key features
    let matches = 0
    let total = 0

    const keys = ['marketRegime', 'timeOfDay', 'trend']
    
    keys.forEach(key => {
      total++
      if (pattern1[key] === pattern2[key]) {
        matches++
      }
    })

    // Add numerical similarity for volatility and volume
    const numKeys = ['volatility', 'volume', 'signalStrength', 'mlConfidence']
    numKeys.forEach(key => {
      total++
      const diff = Math.abs((pattern1[key] || 0) - (pattern2[key] || 0))
      if (diff < 0.2) { // Within 20% is considered similar
        matches++
      }
    })

    return matches / total
  }

  getRegimeAdjustment() {
    const adjustments = {
      trending: { riskMultiplier: 1.2, confidenceBoost: 0.1 },
      ranging: { riskMultiplier: 0.8, confidenceBoost: -0.1 },
      volatile: { riskMultiplier: 0.6, confidenceBoost: -0.2 },
      calm: { riskMultiplier: 1.0, confidenceBoost: 0.0 }
    }

    return adjustments[this.currentRegime] || adjustments.calm
  }

  getTimeBasedAdjustment() {
    const hour = new Date().getHours()
    
    // Market hours adjustments (assuming US market)
    if (hour >= 9 && hour <= 16) {
      return { confidenceMultiplier: 1.1, reasoning: 'Active market hours' }
    } else if (hour >= 17 && hour <= 20) {
      return { confidenceMultiplier: 0.9, reasoning: 'After-hours trading' }
    } else {
      return { confidenceMultiplier: 0.7, reasoning: 'Off-market hours' }
    }
  }

  analyzeTradePerformance(trades) {
    // Analyze trade performance patterns
    const analysis = {
      winRate: trades.filter(t => t.success).length / trades.length,
      avgPnL: trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length,
      avgDuration: trades.reduce((sum, t) => sum + t.duration, 0) / trades.length,
      bestHour: this.findBestTradingHour(trades),
      worstHour: this.findWorstTradingHour(trades)
    }

    return analysis
  }

  findBestTradingHour(trades) {
    const hourlyStats = {}
    
    trades.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours()
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { trades: 0, wins: 0 }
      }
      hourlyStats[hour].trades++
      if (trade.success) hourlyStats[hour].wins++
    })

    let bestHour = 0
    let bestWinRate = 0

    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      const winRate = stats.wins / stats.trades
      if (winRate > bestWinRate && stats.trades >= 5) { // Minimum 5 trades
        bestWinRate = winRate
        bestHour = parseInt(hour)
      }
    })

    return { hour: bestHour, winRate: bestWinRate }
  }

  findWorstTradingHour(trades) {
    const hourlyStats = {}
    
    trades.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours()
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { trades: 0, wins: 0 }
      }
      hourlyStats[hour].trades++
      if (trade.success) hourlyStats[hour].wins++
    })

    let worstHour = 0
    let worstWinRate = 1

    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      const winRate = stats.wins / stats.trades
      if (winRate < worstWinRate && stats.trades >= 5) { // Minimum 5 trades
        worstWinRate = winRate
        worstHour = parseInt(hour)
      }
    })

    return { hour: worstHour, winRate: worstWinRate }
  }

  optimizeSignalThreshold(trades) {
    // Find optimal signal strength threshold
    const thresholds = [60, 65, 70, 75, 80, 85]
    let bestThreshold = 70
    let bestPerformance = 0

    thresholds.forEach(threshold => {
      const filteredTrades = trades.filter(t => t.signalStrength >= threshold)
      if (filteredTrades.length >= 10) {
        const winRate = filteredTrades.filter(t => t.success).length / filteredTrades.length
        const avgPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0) / filteredTrades.length
        const performance = winRate * avgPnL
        
        if (performance > bestPerformance) {
          bestPerformance = performance
          bestThreshold = threshold
        }
      }
    })

    return bestThreshold
  }

  optimizeRiskPerTrade(trades) {
    // Analyze risk per trade based on outcomes
    const avgWin = trades.filter(t => t.success).reduce((sum, t) => sum + t.pnl, 0) / Math.max(trades.filter(t => t.success).length, 1)
    const avgLoss = Math.abs(trades.filter(t => !t.success).reduce((sum, t) => sum + t.pnl, 0)) / Math.max(trades.filter(t => !t.success).length, 1)
    
    const optimalRisk = Math.min(avgWin * 0.5, avgLoss * 0.8)
    return Math.max(optimalRisk, 10) // Minimum $10 risk
  }

  optimizeStopLoss(trades) {
    // Find optimal stop loss based on adverse excursion
    const adverseExcursions = trades.map(t => t.max_adverse || 0).filter(ae => ae > 0)
    if (adverseExcursions.length === 0) return 1.5

    const avgAdverse = adverseExcursions.reduce((sum, ae) => sum + ae, 0) / adverseExcursions.length
    return Math.max(avgAdverse * 1.2, 1.0) // 20% buffer above average adverse
  }

  optimizeTakeProfit(trades) {
    // Find optimal take profit based on favorable excursion
    const favorableExcursions = trades.map(t => t.max_favorable || 0).filter(fe => fe > 0)
    if (favorableExcursions.length === 0) return 2.0

    const avgFavorable = favorableExcursions.reduce((sum, fe) => sum + fe, 0) / favorableExcursions.length
    return Math.max(avgFavorable * 0.8, 1.5) // 80% of average favorable
  }

  optimizeTimeFilters(trades) {
    const analysis = this.analyzeTimePerformance()
    const bestHours = Object.entries(analysis.hourlyPerformance)
      .filter(([hour, stats]) => stats.winRate > 0.6 && stats.trades >= 5)
      .map(([hour]) => parseInt(hour))

    return {
      allowedHours: bestHours,
      avoidHours: Object.entries(analysis.hourlyPerformance)
        .filter(([hour, stats]) => stats.winRate < 0.4 && stats.trades >= 5)
        .map(([hour]) => parseInt(hour))
    }
  }

  optimizeRegimeFilters(trades) {
    const regimePerformance = {}
    
    trades.forEach(trade => {
      const regime = trade.marketConditions?.regime || 'unknown'
      if (!regimePerformance[regime]) {
        regimePerformance[regime] = { trades: 0, wins: 0, pnl: 0 }
      }
      regimePerformance[regime].trades++
      regimePerformance[regime].pnl += trade.pnl
      if (trade.success) regimePerformance[regime].wins++
    })

    const bestRegimes = Object.entries(regimePerformance)
      .filter(([regime, stats]) => stats.wins / stats.trades > 0.6 && stats.trades >= 5)
      .map(([regime]) => regime)

    return {
      preferredRegimes: bestRegimes,
      avoidRegimes: Object.entries(regimePerformance)
        .filter(([regime, stats]) => stats.wins / stats.trades < 0.4 && stats.trades >= 5)
        .map(([regime]) => regime)
    }
  }

  analyzeRegimePerformance() {
    const regimeStats = {}
    
    this.performanceHistory.forEach(trade => {
      const regime = trade.marketConditions?.regime || 'unknown'
      if (!regimeStats[regime]) {
        regimeStats[regime] = { trades: 0, wins: 0, pnl: 0 }
      }
      regimeStats[regime].trades++
      regimeStats[regime].pnl += trade.pnl
      if (trade.success) regimeStats[regime].wins++
    })

    // Calculate win rates
    Object.keys(regimeStats).forEach(regime => {
      regimeStats[regime].winRate = regimeStats[regime].wins / regimeStats[regime].trades
      regimeStats[regime].avgPnL = regimeStats[regime].pnl / regimeStats[regime].trades
    })

    return regimeStats
  }

  analyzePatternPerformance() {
    return {
      totalPatterns: this.patternDatabase.size,
      successfulPatterns: this.successfulPatterns.length,
      failedPatterns: this.failedPatterns.length,
      topPatterns: this.successfulPatterns.slice(0, 5),
      worstPatterns: this.failedPatterns.slice(0, 5)
    }
  }
}

module.exports = AdaptiveLearningEngine; 