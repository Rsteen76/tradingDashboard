// AI Performance Monitoring System
const EventEmitter = require('events');
const logger = require('../utils/logger');

class AIPerformanceMonitor extends EventEmitter {
  constructor(dependencies) {
    super();
    
    this.bombproofTrading = dependencies.bombproofTrading;
    this.tradeTracker = dependencies.tradeTracker;
    this.mlEngine = dependencies.mlEngine;
    this.adaptiveLearning = dependencies.adaptiveLearning;
    
    // Real-time metrics
    this.metrics = {
      // Model Performance
      models: {
        lstm: { predictions: 0, correct: 0, accuracy: 0, lastUpdate: null },
        transformer: { predictions: 0, correct: 0, accuracy: 0, lastUpdate: null },
        randomForest: { predictions: 0, correct: 0, accuracy: 0, lastUpdate: null },
        advancedAI: { predictions: 0, correct: 0, accuracy: 0, lastUpdate: null },
        ensemble: { predictions: 0, correct: 0, accuracy: 0, lastUpdate: null }
      },
      
      // Trading Performance
      trading: {
        dailyPnL: 0,
        weeklyPnL: 0,
        monthlyPnL: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0
      },
      
      // Risk Metrics
      risk: {
        positionsOpen: 0,
        totalExposure: 0,
        marginUsed: 0,
        riskScore: 0,
        dailyVaR: 0, // Value at Risk
        stressTestResult: 0
      },
      
      // System Health
      health: {
        uptime: 0,
        lastHeartbeat: null,
        cpuUsage: 0,
        memoryUsage: 0,
        tensorflowMemory: 0,
        apiLatency: 0,
        predictionLatency: 0,
        ninjaConnection: false
      },
      
      // Learning Progress
      learning: {
        totalTradesAnalyzed: 0,
        patternsIdentified: 0,
        modelUpdates: 0,
        lastModelUpdate: null,
        adaptationRate: 0,
        learningEfficiency: 0
      }
    };
    
    // Alerts configuration
    this.alertThresholds = {
      maxDrawdown: 0.15, // 15%
      minWinRate: 0.45,
      maxConsecutiveLosses: 3,
      maxDailyLoss: 1000,
      minSystemHealth: 0.8,
      maxPredictionLatency: 1000, // ms
      minNinjaHeartbeat: 30000 // 30 seconds
    };
    
    // Active alerts
    this.activeAlerts = new Map();
    
    // Performance history for charts
    this.performanceHistory = {
      pnl: [],
      winRate: [],
      accuracy: [],
      health: []
    };
    
    this.monitoringInterval = null;
    this.reportInterval = null;
  }

  async initialize() {
    logger.info('🚀 Initializing AI Performance Monitor...');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start monitoring loops
    this.startMonitoring();
    
    // Load historical metrics
    await this.loadHistoricalMetrics();
    
    logger.info('✅ AI Performance Monitor initialized');
  }

  setupEventListeners() {
    // Trade events
    if (this.bombproofTrading && typeof this.bombproofTrading.on === 'function') {
      this.bombproofTrading.on('tradeExecuted', (trade) => this.onTradeExecuted(trade));
      this.bombproofTrading.on('tradeCompleted', (result) => this.onTradeCompleted(result));
      this.bombproofTrading.on('performanceUpdate', (metrics) => this.updateTradingMetrics(metrics));
    }
    
    // ML events (check if it's an EventEmitter)
    if (this.mlEngine && typeof this.mlEngine.on === 'function') {
      this.mlEngine.on('predictionGenerated', (pred) => this.onPrediction(pred));
      this.mlEngine.on('modelUpdated', (model) => this.onModelUpdate(model));
    } else if (this.mlEngine) {
      logger.debug('ML Engine is not an EventEmitter, skipping event listeners');
    }
    
    // Learning events (check if it's an EventEmitter)
    if (this.adaptiveLearning && typeof this.adaptiveLearning.on === 'function') {
      this.adaptiveLearning.on('outcomeProcessed', (data) => this.onLearningUpdate(data));
      this.adaptiveLearning.on('weightsUpdated', (weights) => this.onWeightsUpdate(weights));
    } else if (this.adaptiveLearning) {
      logger.debug('Adaptive Learning is not an EventEmitter, skipping event listeners');
    }
  }

  startMonitoring() {
    // Main monitoring loop (every 5 seconds)
    this.monitoringInterval = setInterval(() => {
      this.updateSystemHealth();
      this.checkAlertConditions();
      this.updatePerformanceHistory();
    }, 5000);
    
    // Detailed report generation (every minute)
    this.reportInterval = setInterval(() => {
      this.generatePerformanceReport();
    }, 60000);
  }

  async loadHistoricalMetrics() {
    try {
      // In a real implementation, this would load from persistent storage
      // For now, initialize with defaults
      this.metrics.health.lastSystemCheck = new Date();
      this.metrics.trading.sessionStartTime = new Date();
      this.metrics.learning.sessionStart = new Date();
      
      logger.debug('Historical metrics loaded (defaulted for new session)');
    } catch (error) {
      logger.error('Failed to load historical metrics:', error);
      // Continue with default metrics
    }
  }

  checkAlertConditions() {
    // Check various alert conditions based on current metrics
    
    // Trading alerts
    if (this.metrics.trading.consecutiveLosses >= this.alertThresholds.maxConsecutiveLosses) {
      this.triggerAlert('consecutive_losses', {
        count: this.metrics.trading.consecutiveLosses,
        threshold: this.alertThresholds.maxConsecutiveLosses
      });
    }
    
    if (this.metrics.trading.dailyPnL <= -this.alertThresholds.maxDailyLoss) {
      this.triggerAlert('daily_loss_limit', {
        loss: this.metrics.trading.dailyPnL,
        limit: this.alertThresholds.maxDailyLoss
      });
    }
    
    // Risk alerts
    if (this.metrics.risk.totalExposure > this.alertThresholds.maxExposure) {
      this.triggerAlert('high_exposure', {
        exposure: this.metrics.risk.totalExposure,
        limit: this.alertThresholds.maxExposure
      });
    }
    
    // Model alerts
    const avgAccuracy = this.calculateAverageAccuracy();
    if (avgAccuracy < this.alertThresholds.minModelAccuracy) {
      this.triggerAlert('model_degradation', {
        accuracy: avgAccuracy,
        threshold: this.alertThresholds.minModelAccuracy
      });
    }
  }

  // REAL-TIME METRICS UPDATES
  onTradeExecuted(trade) {
    this.metrics.risk.positionsOpen++;
    this.metrics.risk.totalExposure += trade.quantity * trade.price;
    
    this.emit('metricsUpdate', {
      type: 'trade_executed',
      metrics: this.metrics
    });
  }

  onTradeCompleted(result) {
    // Update trading metrics
    this.metrics.trading.dailyPnL += result.finalPnL;
    
    if (result.success) {
      this.metrics.trading.consecutiveWins++;
      this.metrics.trading.consecutiveLosses = 0;
    } else {
      this.metrics.trading.consecutiveLosses++;
      this.metrics.trading.consecutiveWins = 0;
    }
    
    // Update risk metrics
    this.metrics.risk.positionsOpen--;
    this.metrics.risk.totalExposure -= result.quantity * result.entryPrice;
    
    // Check for alerts
    if (this.metrics.trading.consecutiveLosses >= this.alertThresholds.maxConsecutiveLosses) {
      this.triggerAlert('consecutive_losses', {
        count: this.metrics.trading.consecutiveLosses,
        threshold: this.alertThresholds.maxConsecutiveLosses
      });
    }
    
    if (this.metrics.trading.dailyPnL <= -this.alertThresholds.maxDailyLoss) {
      this.triggerAlert('daily_loss_limit', {
        loss: this.metrics.trading.dailyPnL,
        limit: this.alertThresholds.maxDailyLoss
      });
    }
  }

  onPrediction(prediction) {
    const model = prediction.model || 'ensemble';
    
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = { predictions: 0, correct: 0, accuracy: 0, lastUpdate: null };
    }
    
    this.metrics.models[model].predictions++;
    this.metrics.models[model].lastUpdate = new Date();
    
    // Track prediction for accuracy calculation later
    this.trackPrediction(prediction);
  }

  onModelUpdate(modelInfo) {
    this.metrics.learning.modelUpdates++;
    this.metrics.learning.lastModelUpdate = new Date();
    
    logger.info('📊 Model updated:', modelInfo);
  }

  onLearningUpdate(data) {
    this.metrics.learning.totalTradesAnalyzed++;
    this.metrics.learning.learningEfficiency = data.performance || 0;
  }

  onWeightsUpdate(weights) {
    // Update model weights display
    this.emit('weightsUpdate', weights);
  }

  // SYSTEM HEALTH MONITORING
  updateSystemHealth() {
    // CPU and Memory usage
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    this.metrics.health.cpuUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
    this.metrics.health.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
    
    // TensorFlow memory
    if (typeof tf !== 'undefined') {
      const tfMemory = tf.memory();
      this.metrics.health.tensorflowMemory = tfMemory.numTensors;
    }
    
    // Calculate overall health score
    const healthScore = this.calculateHealthScore();
    this.metrics.health.score = healthScore;
    
    if (healthScore < this.alertThresholds.minSystemHealth) {
      this.triggerAlert('system_health', {
        score: healthScore,
        threshold: this.alertThresholds.minSystemHealth
      });
    }
  }

  calculateHealthScore() {
    let score = 1.0;
    
    // CPU usage penalty
    if (this.metrics.health.cpuUsage > 80) score -= 0.3;
    else if (this.metrics.health.cpuUsage > 60) score -= 0.1;
    
    // Memory usage penalty
    if (this.metrics.health.memoryUsage > 0.9) score -= 0.3;
    else if (this.metrics.health.memoryUsage > 0.7) score -= 0.1;
    
    // Connection penalty
    if (!this.metrics.health.ninjaConnection) score -= 0.2;
    
    // Latency penalty
    if (this.metrics.health.predictionLatency > 1000) score -= 0.2;
    else if (this.metrics.health.predictionLatency > 500) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  // ALERT SYSTEM
  triggerAlert(type, data) {
    const alert = {
      id: `${type}_${Date.now()}`,
      type,
      severity: this.getAlertSeverity(type),
      message: this.getAlertMessage(type, data),
      data,
      timestamp: new Date(),
      acknowledged: false
    };
    
    this.activeAlerts.set(alert.id, alert);
    
    // Emit alert
    this.emit('alert', alert);
    
    // Log alert
    logger.warn(`🚨 ALERT: ${alert.message}`, { type, data });
    
    // Auto-resolve some alerts after time
    if (this.shouldAutoResolve(type)) {
      setTimeout(() => this.resolveAlert(alert.id), 300000); // 5 minutes
    }
  }

  getAlertSeverity(type) {
    const severities = {
      consecutive_losses: 'high',
      daily_loss_limit: 'critical',
      system_health: 'medium',
      high_drawdown: 'high',
      model_degradation: 'medium',
      connection_lost: 'critical'
    };
    
    return severities[type] || 'low';
  }

  getAlertMessage(type, data) {
    const messages = {
      consecutive_losses: `${data.count} consecutive losses (threshold: ${data.threshold})`,
      daily_loss_limit: `Daily loss $${Math.abs(data.loss).toFixed(2)} exceeds limit $${data.limit}`,
      system_health: `System health score ${(data.score * 100).toFixed(1)}% below threshold`,
      high_drawdown: `Drawdown ${(data.drawdown * 100).toFixed(1)}% exceeds limit`,
      model_degradation: `Model ${data.model} accuracy dropped to ${(data.accuracy * 100).toFixed(1)}%`,
      connection_lost: `Lost connection to ${data.service}`
    };
    
    return messages[type] || `Alert: ${type}`;
  }

  shouldAutoResolve(type) {
    const autoResolve = ['system_health', 'connection_lost'];
    return autoResolve.includes(type);
  }

  resolveAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.resolvedAt = new Date();
      this.emit('alertResolved', alert);
    }
  }

  // PERFORMANCE TRACKING
  updatePerformanceHistory() {
    const timestamp = new Date();
    
    // PnL history
    this.performanceHistory.pnl.push({
      timestamp,
      value: this.metrics.trading.dailyPnL
    });
    
    // Win rate history
    this.performanceHistory.winRate.push({
      timestamp,
      value: this.metrics.trading.winRate
    });
    
    // Model accuracy history
    const avgAccuracy = this.calculateAverageAccuracy();
    this.performanceHistory.accuracy.push({
      timestamp,
      value: avgAccuracy
    });
    
    // Health history
    this.performanceHistory.health.push({
      timestamp,
      value: this.metrics.health.score || 0
    });
    
    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    Object.keys(this.performanceHistory).forEach(key => {
      this.performanceHistory[key] = this.performanceHistory[key].filter(
        item => item.timestamp.getTime() > cutoff
      );
    });
  }

  calculateAverageAccuracy() {
    const accuracies = Object.values(this.metrics.models)
      .filter(m => m.predictions > 0)
      .map(m => m.accuracy);
    
    if (accuracies.length === 0) return 0;
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }

  // PERFORMANCE REPORTS
  generatePerformanceReport() {
    const report = {
      timestamp: new Date(),
      summary: this.generateSummary(),
      models: this.generateModelReport(),
      trading: this.generateTradingReport(),
      risk: this.generateRiskReport(),
      insights: this.generateInsights(),
      recommendations: this.generateRecommendations()
    };
    
    this.emit('performanceReport', report);
    
    // Log summary
    logger.info('📊 Performance Report:', report.summary);
    
    return report;
  }

  generateSummary() {
    return {
      overallHealth: (this.metrics.health.score * 100).toFixed(1) + '%',
      dailyPnL: `$${this.metrics.trading.dailyPnL.toFixed(2)}`,
      winRate: (this.metrics.trading.winRate * 100).toFixed(1) + '%',
      activeAlerts: this.activeAlerts.size,
      modelAccuracy: (this.calculateAverageAccuracy() * 100).toFixed(1) + '%',
      riskLevel: this.calculateRiskLevel()
    };
  }

  generateModelReport() {
    const report = {};
    
    Object.entries(this.metrics.models).forEach(([model, data]) => {
      report[model] = {
        predictions: data.predictions,
        accuracy: (data.accuracy * 100).toFixed(1) + '%',
        lastUpdate: data.lastUpdate ? this.getTimeSince(data.lastUpdate) : 'Never',
        status: data.accuracy > 0.6 ? 'Good' : data.accuracy > 0.5 ? 'Fair' : 'Poor'
      };
    });
    
    return report;
  }

  generateTradingReport() {
    return {
      performance: {
        daily: `$${this.metrics.trading.dailyPnL.toFixed(2)}`,
        weekly: `$${this.metrics.trading.weeklyPnL.toFixed(2)}`,
        monthly: `$${this.metrics.trading.monthlyPnL.toFixed(2)}`
      },
      metrics: {
        winRate: (this.metrics.trading.winRate * 100).toFixed(1) + '%',
        profitFactor: this.metrics.trading.profitFactor.toFixed(2),
        sharpeRatio: this.metrics.trading.sharpeRatio.toFixed(2),
        maxDrawdown: (this.metrics.trading.maxDrawdown * 100).toFixed(1) + '%'
      },
      streaks: {
        consecutiveWins: this.metrics.trading.consecutiveWins,
        consecutiveLosses: this.metrics.trading.consecutiveLosses
      }
    };
  }

  generateRiskReport() {
    return {
      exposure: {
        positions: this.metrics.risk.positionsOpen,
        totalValue: `$${this.metrics.risk.totalExposure.toFixed(2)}`,
        marginUsed: (this.metrics.risk.marginUsed * 100).toFixed(1) + '%'
      },
      metrics: {
        riskScore: this.metrics.risk.riskScore.toFixed(2),
        dailyVaR: `$${this.metrics.risk.dailyVaR.toFixed(2)}`,
        stressTest: this.metrics.risk.stressTestResult.toFixed(2)
      },
      limits: {
        dailyLossUsed: (Math.abs(this.metrics.trading.dailyPnL) / this.alertThresholds.maxDailyLoss * 100).toFixed(1) + '%',
        drawdownUsed: (this.metrics.trading.currentDrawdown / this.alertThresholds.maxDrawdown * 100).toFixed(1) + '%'
      }
    };
  }

  generateInsights() {
    const insights = [];
    
    // Model performance insights
    const bestModel = this.findBestModel();
    if (bestModel) {
      insights.push({
        type: 'model_performance',
        message: `${bestModel.name} is performing best with ${(bestModel.accuracy * 100).toFixed(1)}% accuracy`
      });
    }
    
    // Trading pattern insights
    if (this.metrics.trading.winRate > 0.6) {
      insights.push({
        type: 'trading_performance',
        message: 'Win rate is above 60% - current strategy is effective'
      });
    }
    
    // Risk insights
    if (this.metrics.risk.riskScore > 0.7) {
      insights.push({
        type: 'risk_warning',
        message: 'Risk levels are elevated - consider reducing position sizes'
      });
    }
    
    // Learning insights
    if (this.metrics.learning.adaptationRate > 0.1) {
      insights.push({
        type: 'adaptation',
        message: 'System is actively adapting to market conditions'
      });
    }
    
    return insights;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Model recommendations
    const worstModel = this.findWorstModel();
    if (worstModel && worstModel.accuracy < 0.5) {
      recommendations.push({
        priority: 'high',
        action: `Consider retraining or disabling ${worstModel.name} model`,
        reason: `Accuracy below 50% (${(worstModel.accuracy * 100).toFixed(1)}%)`
      });
    }
    
    // Trading recommendations
    if (this.metrics.trading.consecutiveLosses >= 2) {
      recommendations.push({
        priority: 'medium',
        action: 'Review recent losing trades for pattern',
        reason: `${this.metrics.trading.consecutiveLosses} consecutive losses`
      });
    }
    
    // Risk recommendations
    if (this.metrics.trading.currentDrawdown > 0.1) {
      recommendations.push({
        priority: 'high',
        action: 'Reduce position sizes or pause trading',
        reason: `Drawdown at ${(this.metrics.trading.currentDrawdown * 100).toFixed(1)}%`
      });
    }
    
    // System recommendations
    if (this.metrics.health.memoryUsage > 0.8) {
      recommendations.push({
        priority: 'medium',
        action: 'Restart system to clear memory',
        reason: `Memory usage at ${(this.metrics.health.memoryUsage * 100).toFixed(1)}%`
      });
    }
    
    return recommendations;
  }

  // HELPER METHODS
  findBestModel() {
    let best = null;
    let bestAccuracy = 0;
    
    Object.entries(this.metrics.models).forEach(([name, data]) => {
      if (data.predictions > 10 && data.accuracy > bestAccuracy) {
        bestAccuracy = data.accuracy;
        best = { name, ...data };
      }
    });
    
    return best;
  }

  findWorstModel() {
    let worst = null;
    let worstAccuracy = 1;
    
    Object.entries(this.metrics.models).forEach(([name, data]) => {
      if (data.predictions > 10 && data.accuracy < worstAccuracy) {
        worstAccuracy = data.accuracy;
        worst = { name, ...data };
      }
    });
    
    return worst;
  }

  calculateRiskLevel() {
    const score = this.metrics.risk.riskScore;
    
    if (score > 0.8) return 'Critical';
    if (score > 0.6) return 'High';
    if (score > 0.4) return 'Medium';
    if (score > 0.2) return 'Low';
    return 'Minimal';
  }

  getTimeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  trackPrediction(prediction) {
    // Store prediction for later accuracy calculation
    // This would be matched against actual outcomes
    // Implementation depends on your tracking system
  }

  // API METHODS
  getMetrics() {
    return this.metrics;
  }

  getAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getPerformanceHistory() {
    return this.performanceHistory;
  }

  acknowledgeAlert(alertId) {
    this.resolveAlert(alertId);
  }

  // CLEANUP
  async stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
    
    logger.info('AI Performance Monitor stopped');
  }
}

module.exports = AIPerformanceMonitor;