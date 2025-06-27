// Enhanced server.js integration
// This shows how to integrate the bombproof system into your existing server

class MLTradingServer {
  constructor() {
    // ... existing code ...
    this.bombproofTrading = null;
  }

  async initializeComponents() {
    try {
      // ... existing component initialization ...
      
      // Initialize Bombproof Trading System
      const BombproofAITradingSystem = require('./core/bombproof-ai-trading');
      this.bombproofTrading = new BombproofAITradingSystem({
        mlEngine: this.mlEngine,
        advancedAI: this.advancedAI,
        profitMaximizer: this.profitMaximizer,
        positionManager: this.positionManager,
        ninjaService: this.ninjaService,
        adaptiveLearning: this.adaptiveLearning,
        dataCollector: this.dataCollector
      });
      
      await this.bombproofTrading.initialize();
      logger.info('✅ Bombproof AI Trading System initialized');
      
      // Setup event listeners for the trading system
      this.setupTradingSystemEvents();
      
    } catch (error) {
      logger.error('Failed to initialize components:', error);
      throw error;
    }
  }

  setupTradingSystemEvents() {
    // Listen for trade executions
    this.bombproofTrading.on('tradeExecuted', (trade) => {
      // Broadcast to dashboard
      if (this.io) {
        this.io.emit('trade_executed', {
          type: 'ai_trade',
          trade,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Listen for trading errors
    this.bombproofTrading.on('tradingError', (error) => {
      logger.error('Trading system error:', error);
      if (this.io) {
        this.io.emit('trading_error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Listen for performance updates
    this.bombproofTrading.on('performanceUpdate', (metrics) => {
      if (this.io) {
        this.io.emit('performance_metrics', metrics);
      }
    });
  }

  async onNinjaMarketData(data) {
    try {
      const processed = this.dataCollector.processMarketData(data);
      const enriched = await this.featureEngineer.extractFeatures(processed);
      
      // Store in database if available
      try {
        // ... existing database code ...
      } catch (dbError) {
        logger.debug('Database not available, skipping storage');
      }

      // Broadcast to all WebSocket clients
      this.broadcast({
        type: 'market_data',
        payload: enriched
      });

      // USE BOMBPROOF TRADING SYSTEM
      if (this.bombproofTrading && this.bombproofTrading.isInitialized) {
        // Evaluate trading opportunity with bombproof system
        const tradingDecision = await this.bombproofTrading.evaluateTradingOpportunity(enriched);
        
        if (tradingDecision && tradingDecision.success) {
          logger.info('🎯 Bombproof AI Trade Executed:', {
            tradeId: tradingDecision.tradeId,
            instrument: enriched.instrument,
            confidence: tradingDecision.confidence
          });
        }
      } else {
        // Fallback to existing logic if bombproof system not ready
        logger.debug('Bombproof trading system not ready, using standard flow');
        
        // ... existing advanced AI and profit maximizer code ...
      }
      
    } catch (error) {
      logger.error('Error processing market data:', error);
    }
  }

  // Enhanced position synchronization
  async onNinjaStrategyStatus(data) {
    try {
      // Update position manager with NinjaTrader position
      if (data.position && data.instrument) {
        await this.positionManager.updatePosition(data.instrument, {
          direction: data.position,
          size: data.position_size || 0,
          avgPrice: data.entry_price || 0,
          unrealizedPnL: data.unrealized_pnl || 0
        });
      }
      
      // Existing broadcast logic
      const payload = { type: 'strategy_status', payload: data };
      if (this.wss) {
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
          }
        });
      }

      if (this.io) {
        this.io.emit('strategy_status', data);
        
        // Get current ML settings and risk state
        const currentSettings = this.mlEngine ? this.mlEngine.settings : {};
        const riskState = this.bombproofTrading ? this.bombproofTrading.riskState : {};
        
        this.io.emit('strategy_data', {
          strategyStatus: data,
          riskManagement: {
            ...currentSettings,
            ...riskState,
            trading_disabled: riskState.dailyPnL <= riskState.maxDailyLoss,
            daily_loss: riskState.dailyPnL,
            consecutive_losses: riskState.consecutiveLosses
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error broadcasting NinjaTrader strategy status:', error);
    }
  }

  // Handle trade execution confirmations
  onNinjaTradeExecution(data) {
    try {
      logger.info('💰 Trade execution from NinjaTrader:', {
        instrument: data.instrument,
        action: data.action,
        quantity: data.quantity,
        price: data.price,
        pnl: data.pnl
      });

      // Update bombproof trading system with execution
      if (this.bombproofTrading) {
        this.bombproofTrading.emit('ninjaTradeExecution', data);
      }

      // Send to adaptive learning
      if (this.adaptiveLearning) {
        this.adaptiveLearning.learnFromTrade(data);
      }

      // Broadcast to dashboard
      if (this.io) {
        this.io.emit('trade_execution', {
          type: 'trade_executed',
          trade: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('❌ Error handling trade execution:', error);
    }
  }
}