const express = require('express');
const WebSocket = require('ws');
const winston = require('winston');
const path = require('path');
const http = require('http');
const { Server: IOServer } = require('socket.io');

// Import core components
const MLEngine = require('./core/ml-engine');
const ModelManager = require('./models/model-manager');
const FeatureEngineer = require('./core/feature-engineer');
const PatternRecognition = require('./core/pattern-recognition');
const PositionManager = require('./core/position-manager');
const SmartTrailing = require('./core/smart-trailing');
const AdaptiveLearning = require('./core/adaptive-learning');
const DataCollector = require('./core/data-collector');

// Import enhanced tracking components
const TradeOutcomeTracker = require('./core/trade-outcome-tracker');
const AIPerformanceMonitor = require('./core/ai-performance-monitor');

// Import utilities
const logger = require('./utils/logger');

// Add import at top after other imports
const NinjaTraderService = require('./services/ninja-trader-service');

// Import BombproofAITradingSystem
const BombproofAITradingSystem = require('./core/bombproof-ai-trading');

// Add at the top level of the file
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

class MLTradingServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.wsPort = process.env.WS_PORT || 3002;
        this.ninjaService = null;
        this.io = null;
    }

    async initializeComponents() {
        try {
            // Initialize each component in sequence
            this.modelManager = new ModelManager();
            await this.modelManager.initialize();
            logger.info('✅ Model Manager initialized');

            this.featureEngineer = new FeatureEngineer();
            await this.featureEngineer.initialize();
            logger.info('✅ Feature Engineer initialized');

            this.patternRecognition = new PatternRecognition();
            await this.patternRecognition.initialize();
            logger.info('✅ Pattern Recognition initialized');

            this.positionManager = new PositionManager();
            logger.info('✅ Position Manager initialized');

            this.smartTrailing = new SmartTrailing();
            await this.smartTrailing.initialize();
            logger.info('✅ Smart Trailing system initialized');

            this.adaptiveLearning = new AdaptiveLearning();
            logger.info('✅ Adaptive Learning engine initialized');

            this.dataCollector = new DataCollector();
            logger.info('✅ Data Collector initialized');

            // Initialize NinjaTrader service first
            this.ninjaService = new NinjaTraderService();
            await this.ninjaService.initialize();
            logger.info('✅ NinjaTrader Service initialized');

            // Initialize ML Engine with dependencies
            this.mlEngine = new MLEngine({
                modelManager: this.modelManager,
                featureEngineer: this.featureEngineer,
                patternRecognition: this.patternRecognition,
                positionManager: this.positionManager,
                smartTrailing: this.smartTrailing,
                adaptiveLearning: this.adaptiveLearning,
                dataCollector: this.dataCollector
            });
            await this.mlEngine.initialize();
            logger.info('✅ ML Engine initialized');

            // Initialize REAL AI Engine for maximum profit optimization
            const AdvancedAIEngine = require('./core/advanced-ai-engine');
            const ProfitMaximizer = require('./core/profit-maximizer');
            
            this.advancedAI = new AdvancedAIEngine();
            await this.advancedAI.initialize();
            logger.info('✅ Advanced AI Engine initialized with real neural networks');
            
            this.profitMaximizer = new ProfitMaximizer();
            await this.profitMaximizer.initialize();
            logger.info('✅ Profit Maximizer initialized - Real AI for maximum profit');

            // Initialize enhanced tracking components
            this.tradeOutcomeTracker = new TradeOutcomeTracker({
                adaptiveLearning: this.adaptiveLearning,
                dataCollector: this.dataCollector,
                logger: logger
            });
            await this.tradeOutcomeTracker.initialize();
            logger.info('✅ Trade Outcome Tracker initialized - Comprehensive trade analysis');

            // Initialize Bombproof AI Trading System
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

            this.aiPerformanceMonitor = new AIPerformanceMonitor({
                bombproofTrading: this.bombproofTrading,
                tradeTracker: this.tradeOutcomeTracker,
                mlEngine: this.mlEngine,
                adaptiveLearning: this.adaptiveLearning
            });
            await this.aiPerformanceMonitor.initialize();
            logger.info('✅ AI Performance Monitor initialized - Real-time system monitoring');

            // Setup enhanced event connections
            this.setupEnhancedEventHandlers();

            // Setup express after components are ready
            this.setupExpress();
            logger.info('✅ Server components initialized with enhanced tracking');

        } catch (error) {
            logger.error('Failed to initialize components:', error);
            throw error;
        }
    }

    setupEnhancedEventHandlers() {
        // Connect Trade Outcome Tracker events
        if (this.tradeOutcomeTracker) {
            this.tradeOutcomeTracker.on('tradeCompleted', (trade) => {
                logger.info('📊 Trade completed:', {
                    id: trade.id,
                    pnl: trade.finalPnL,
                    success: trade.success,
                    duration: trade.metrics.durationMinutes
                });
                
                // Broadcast to dashboard
                if (this.io) {
                    this.io.emit('trade_completed', trade);
                }
            });

            this.tradeOutcomeTracker.on('statisticsUpdated', (stats) => {
                // Broadcast updated statistics to dashboard
                if (this.io) {
                    this.io.emit('performance_statistics', stats);
                }
            });
        }

        // Connect AI Performance Monitor events
        if (this.aiPerformanceMonitor) {
            this.aiPerformanceMonitor.on('alert', (alert) => {
                logger.warn('🚨 System Alert:', alert);
                
                // Broadcast alert to dashboard
                if (this.io) {
                    this.io.emit('system_alert', alert);
                }
            });

            this.aiPerformanceMonitor.on('performanceReport', (report) => {
                logger.info('📊 Performance Report Generated');
                
                // Broadcast to dashboard
                if (this.io) {
                    this.io.emit('performance_report', report);
                }
            });

            this.aiPerformanceMonitor.on('metricsUpdate', (data) => {
                // Broadcast real-time metrics to dashboard
                if (this.io) {
                    this.io.emit('metrics_update', data);
                }
            });
        }

        logger.info('✅ Enhanced event handlers configured');
    }

    setupExpress() {
        // Basic middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy',
                mlEngine: this.mlEngine.isReady,
                tradeTracker: this.tradeOutcomeTracker ? true : false,
                performanceMonitor: this.aiPerformanceMonitor ? true : false,
                timestamp: new Date().toISOString() 
            });
        });

        // Enhanced API endpoints
        this.app.get('/api/performance-metrics', (req, res) => {
            if (this.aiPerformanceMonitor) {
                res.json(this.aiPerformanceMonitor.getMetrics());
            } else {
                res.status(503).json({ error: 'Performance monitor not available' });
            }
        });

        this.app.get('/api/trade-statistics', (req, res) => {
            if (this.tradeOutcomeTracker) {
                res.json(this.tradeOutcomeTracker.statistics);
            } else {
                res.status(503).json({ error: 'Trade tracker not available' });
            }
        });

        this.app.get('/api/system-alerts', (req, res) => {
            if (this.aiPerformanceMonitor) {
                res.json(this.aiPerformanceMonitor.getAlerts());
            } else {
                res.status(503).json({ error: 'Performance monitor not available' });
            }
        });

        // Error handling middleware
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ port: this.wsPort });
        
        this.wss.on('connection', (ws) => {
            logger.info('WebSocket client connected');
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    logger.error('Invalid WebSocket message:', error);
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: 'Invalid message format' 
                    }));
                }
            });

            ws.on('close', () => {
                logger.info('WebSocket client disconnected');
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });
        });

        this.wss.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });

        logger.info('WebSocket server initialized');
    }

    setupNinjaService() {
        this.ninjaService = new NinjaTraderService();
        return this.ninjaService.start().then(() => {
            logger.info(`✅ NinjaTrader service listening on ${this.ninjaService.config.host}:${this.ninjaService.config.port}`);

            // Wire events
            this.ninjaService.on('marketData', (data) => this.onNinjaMarketData(data));
            this.ninjaService.on('strategyStatus', (data) => this.onNinjaStrategyStatus(data));
            this.ninjaService.on('mlPredictionRequest', (data, socket) => this.onNinjaPredictionRequest(data, socket));
            this.ninjaService.on('smartTrailingRequest', (data, socket) => this.onNinjaSmartTrailingRequest(data, socket));
            this.ninjaService.on('tradeExecution', (data) => this.onNinjaTradeExecution(data));
            this.ninjaService.on('heartbeatTimeout', (data) => this.onNinjaHeartbeatTimeout(data));
        });
    }

    async onNinjaMarketData(data) {
        try {
            const processed = this.dataCollector.processMarketData(data);
            const enriched = await this.featureEngineer.enrichData(processed);

            // Broadcast to all WebSocket clients and dashboard
            this.broadcast({ type: 'market_data', payload: enriched });
            if (this.io) {
                this.io.emit('strategy_data', {
                    marketData: enriched,
                    riskManagement: {
                        trading_disabled: false, // Default, should come from position manager
                        daily_loss: 0, // Default, should come from position manager
                        consecutive_losses: 0 // Default, should come from position manager
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // Route to Bombproof System for evaluation
            if (this.bombproofTrading) {
                await this.bombproofTrading.evaluateTradingOpportunity(enriched);
            } else {
                logger.warn('Bombproof trading system not available for evaluation.');
            }

        } catch (error) {
            logger.error('Error processing market data:', {
                message: error.message,
                stack: error.stack,
                data
            });
        }
    }

    onNinjaStrategyStatus(data) {
        try {
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
                
                // Also emit strategy_data with current settings for dashboard synchronization
                const currentSettings = this.mlEngine ? this.mlEngine.settings : {};
                logger.debug('📤 Emitting strategy_data with settings:', {
                    currentSettings,
                    minConfidence: currentSettings.minConfidence,
                    autoTradingEnabled: currentSettings.autoTradingEnabled
                });
                
                this.io.emit('strategy_data', {
                    strategyStatus: data,
                    riskManagement: {
                        ...currentSettings,
                        trading_disabled: false, // Default, should come from position manager
                        daily_loss: 0, // Default, should come from position manager
                        consecutive_losses: 0 // Default, should come from position manager
                    },
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            logger.error('Error broadcasting NinjaTrader strategy status:', error);
        }
    }

    async handleWebSocketMessage(ws, data) {
        if (!this.mlEngine.isReady) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'ML Engine not ready'
            }));
            return;
        }

        const { type, payload } = data;

        switch (type) {
            case 'market_data':
                await this.handleMarketData(ws, payload);
                break;

            case 'prediction_request':
                await this.handlePredictionRequest(ws, payload);
                break;

            case 'position_update':
                await this.handlePositionUpdate(ws, payload);
                break;

            case 'trailing_stop_request':
                await this.handleTrailingStopRequest(ws, payload);
                break;

            case 'heartbeat':
                ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
                break;

            default:
                logger.warn(`Unknown message type received: ${type}`);
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: `Unknown message type: ${type}` 
                }));
        }
    }

    async handleMarketData(ws, data) {
        try {
            // Process market data through the pipeline
            const features = await this.featureEngineer.extractFeatures(data);
            const pattern = await this.patternRecognition.analyzePattern(features);
            const prediction = await this.mlEngine.generatePrediction(features, pattern);

            // Send processed data back to client
            ws.send(JSON.stringify({
                type: 'market_data_processed',
                payload: {
                    features,
                    pattern,
                    prediction,
                    timestamp: Date.now()
                }
            }));
        } catch (error) {
            logger.error('Error processing market data:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Failed to process market data',
                error: error.message 
            }));
        }
    }

    async handlePredictionRequest(ws, data) {
        try {
            const prediction = await this.mlEngine.generatePrediction(data);
            ws.send(JSON.stringify({
                type: 'prediction_response',
                payload: prediction
            }));
        } catch (error) {
            logger.error('Error generating prediction:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Failed to generate prediction',
                error: error.message 
            }));
        }
    }

    async handlePositionUpdate(ws, data) {
        try {
            await this.positionManager.updatePosition(data);
            const updatedPosition = await this.positionManager.getPosition(data.instrument);
            ws.send(JSON.stringify({
                type: 'position_updated',
                payload: updatedPosition
            }));
        } catch (error) {
            logger.error('Error updating position:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Failed to update position',
                error: error.message 
            }));
        }
    }

    async handleTrailingStopRequest(ws, data) {
        try {
            const trailingStop = await this.smartTrailing.calculateTrailingStop(data);
            ws.send(JSON.stringify({
                type: 'trailing_stop_response',
                payload: trailingStop
            }));
        } catch (error) {
            logger.error('Error calculating trailing stop:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Failed to calculate trailing stop',
                error: error.message 
            }));
        }
    }

    // CRITICAL: Add missing NinjaTrader event handlers
    async onNinjaPredictionRequest(data, socket) {
        try {
            logger.info('🧠 ML Prediction request from NinjaTrader:', {
                instrument: data.instrument,
                requestType: data.type
            });

            if (this.mlEngine && this.mlEngine.isReady) {
                const prediction = await this.mlEngine.generatePrediction(data);
                
                // Send prediction back to NinjaTrader
                const response = {
                    type: 'ml_prediction_response',
                    instrument: data.instrument,
                    timestamp: new Date().toISOString(),
                    prediction: prediction
                };

                if (socket && socket.writable) {
                    socket.write(JSON.stringify(response) + '\n');
                    logger.info('📤 ML prediction sent back to NinjaTrader');
                }
            } else {
                logger.warn('⚠️ ML Engine not ready for prediction request');
            }
        } catch (error) {
            logger.error('❌ Error handling ML prediction request:', error);
        }
    }

    async onNinjaSmartTrailingRequest(data, socket) {
        try {
            logger.info('🎯 Smart Trailing request from NinjaTrader:', {
                instrument: data.instrument,
                position: data.position_direction,
                currentPrice: data.current_price,
                currentStop: data.current_stop,
                profitPercent: data.profit_percent
            });

            if (this.smartTrailing && this.smartTrailing.initialized) {
                // Prepare position data for smart trailing calculation
                const positionData = {
                    instrument: data.instrument,
                    direction: data.position_direction,
                    entryPrice: data.entry_price,
                    currentPrice: data.current_price,
                    currentStop: data.current_stop,
                    quantity: data.quantity,
                    profitPercent: data.profit_percent || 0,
                    timeInPosition: data.time_in_position || 0
                };

                const marketData = {
                    price: data.current_price,
                    atr: data.atr,
                    volume: data.volume,
                    rsi: data.rsi,
                    ema_alignment: data.ema_alignment,
                    adx: data.adx,
                    ema5: data.ema5,
                    ema8: data.ema8,
                    ema13: data.ema13,
                    ema21: data.ema21,
                    ema50: data.ema50,
                    timestamp: data.timestamp
                };

                // Calculate optimal trailing stop using AI
                const trailingStop = await this.smartTrailing.calculateOptimalTrailingStop(positionData, marketData);
                
                // Send smart trailing response back to NinjaTrader
                const response = {
                    type: 'smart_trailing_response',
                    instrument: data.instrument,
                    timestamp: new Date().toISOString(),
                    trailingStop: {
                        stopPrice: trailingStop.stopPrice,
                        algorithm: trailingStop.algorithm,
                        confidence: trailingStop.confidence,
                        reasoning: trailingStop.reasoning,
                        metadata: trailingStop.metadata
                    }
                };

                if (socket && socket.writable) {
                    socket.write(JSON.stringify(response) + '\n');
                    logger.info('📤 Smart trailing response sent to NinjaTrader:', {
                        algorithm: trailingStop.algorithm,
                        newStop: trailingStop.stopPrice,
                        confidence: trailingStop.confidence
                    });
                }

                // Also broadcast to dashboard for monitoring
                if (this.io) {
                    this.io.emit('smart_trailing_update', {
                        instrument: data.instrument,
                        trailingStop: trailingStop,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                logger.warn('⚠️ Smart Trailing system not initialized');
                
                // Send fallback response
                const fallbackResponse = {
                    type: 'smart_trailing_response',
                    instrument: data.instrument,
                    timestamp: new Date().toISOString(),
                    trailingStop: {
                        stopPrice: data.current_stop, // Keep current stop
                        algorithm: 'fallback',
                        confidence: 0.5,
                        reasoning: 'Smart trailing system not available'
                    }
                };

                if (socket && socket.writable) {
                    socket.write(JSON.stringify(fallbackResponse) + '\n');
                }
            }
        } catch (error) {
            logger.error('❌ Error handling smart trailing request:', error);
        }
    }

    async onNinjaTradeExecution(data) {
        try {
            logger.info('💰 Trade execution from NinjaTrader:', {
                instrument: data.instrument,
                action: data.action,
                quantity: data.quantity,
                price: data.price,
                pnl: data.pnl,
                type: data.type
            });

            // Enhanced trade tracking
            if (this.tradeOutcomeTracker) {
                if (data.type === 'trade_entry' || data.action === 'entry') {
                    // Track new trade entry
                    await this.tradeOutcomeTracker.trackTradeEntry({
                        tradeId: data.trade_id || `TRADE_${Date.now()}`,
                        instrument: data.instrument,
                        direction: data.direction || data.action,
                        price: data.price,
                        quantity: data.quantity || 1,
                        stop_price: data.stop_price,
                        target_price: data.target_price,
                        aiPrediction: data.ai_prediction,
                        confidence: data.confidence,
                        expectedProfit: data.expected_profit,
                        riskRewardRatio: data.risk_reward_ratio,
                        marketRegime: data.market_regime,
                        patterns: data.patterns,
                        marketData: data.market_data
                    });
                } else if (data.type === 'trade_exit' || data.action === 'exit') {
                    // Complete trade tracking
                    await this.tradeOutcomeTracker.completeTrade(data.trade_id, {
                        price: data.price,
                        reason: data.exit_reason || 'unknown',
                        marketData: data.market_data
                    });
                }
            }

            // Update AI Performance Monitor
            if (this.aiPerformanceMonitor) {
                if (data.type === 'trade_entry' || data.action === 'entry') {
                    this.aiPerformanceMonitor.onTradeExecuted({
                        quantity: data.quantity || 1,
                        price: data.price
                    });
                } else if (data.type === 'trade_exit' || data.action === 'exit') {
                    this.aiPerformanceMonitor.onTradeCompleted({
                        finalPnL: data.pnl || 0,
                        success: (data.pnl || 0) > 0,
                        quantity: data.quantity || 1,
                        entryPrice: data.entry_price || data.price
                    });
                }
            }

            // Send trade execution to adaptive learning engine if available
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

    onNinjaHeartbeatTimeout(data) {
        logger.warn('💔 NinjaTrader heartbeat timeout:', data);
        
        // Broadcast connection issue to dashboard
        if (this.io) {
            this.io.emit('connection_status', {
                type: 'ninja_heartbeat_timeout',
                data: data,
                timestamp: new Date().toISOString()
            });
        }
    }

    async start() {
        try {
            logger.info('🚀 Starting ML Trading Server...');

            // Initialize all components first
            await this.initializeComponents();
            logger.info('✅ Components initialized');

            // Setup express and websocket after components
            this.setupExpress();
            this.setupWebSocket();
            logger.info('✅ Express and WebSocket setup complete');

            // Start the server
            this.server = this.app.listen(this.port, () => {
                logger.info(`✅ Server listening on port ${this.port}`);
            });

            this.server.on('error', (error) => {
                logger.error('Server error:', error);
            });

            // Attach Socket.IO to the same HTTP server (port 3001)
            this.io = new IOServer(this.server, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"]
                }
            });

            this.io.on('connection', (socket) => {
                logger.info('Socket.IO client connected', { id: socket.id });

                // Handle manual trade commands coming from dashboard
                socket.on('manual_trade', (payload, ack) => {
                    try {
                        logger.info('📨 Socket.IO manual_trade received', { id: socket.id, payload });

                        // Ensure we have NinjaTrader service ready
                        if (this.ninjaService) {
                            const sent = this.ninjaService.sendTradingCommand({
                                command: payload.command,
                                instrument: payload.instrument || 'ES',
                                quantity: payload.quantity || 1,
                                timestamp: new Date().toISOString(),
                                stop_price: payload.stop_price,  // Include stop loss
                                target_price: payload.target_price,  // Include take profit
                                reason: payload.reason || 'Manual Trade'  // Include reason
                            });

                            if (typeof ack === 'function') {
                                ack({ success: sent > 0 });
                            }
                        } else {
                            logger.warn('NinjaTraderService not initialized; cannot forward manual trade');
                            if (typeof ack === 'function') ack({ success: false, error: 'service_unavailable' });
                        }
                    } catch (err) {
                        logger.error('Error handling manual_trade:', err.message);
                        if (typeof ack === 'function') ack({ success: false, error: err.message });
                    }
                });

                // Handle settings updates from dashboard
                socket.on('update_settings', (settings, ack) => {
                    try {
                        logger.info('⚙️ Socket.IO update_settings received', { id: socket.id, settings });

                        if (this.mlEngine) {
                            // Update all settings with consistent property names
                            const updatedSettings = this.mlEngine.updateSettings({
                                minConfidence: settings.minConfidence,
                                autoTradingEnabled: settings.autoTradingEnabled,
                                strongConfidence: settings.strongConfidence,
                                minStrength: settings.minStrength,
                                ensembleWeights: settings.modelWeights,
                                trailingConfidenceThreshold: settings.trailingConfidenceThreshold,
                                trailingUpdateInterval: settings.trailingUpdateInterval,
                                maxStopMovementAtr: settings.maxStopMovementAtr,
                                minProfitTarget: settings.minProfitTarget,
                                maxPositionSize: settings.maxPositionSize,
                                maxDailyRisk: settings.maxDailyRisk,
                                volatilityAdjustment: settings.volatilityAdjustment,
                                patternConfidenceThreshold: settings.patternConfidenceThreshold,
                                regimeChangeThreshold: settings.regimeChangeThreshold,
                                momentumThreshold: settings.momentumThreshold,
                                breakoutStrength: settings.breakoutStrength
                            });
                            
                            if (typeof ack === 'function') {
                                ack(updatedSettings);
                            }
                            
                            // Broadcast updated settings to all clients via both events
                            this.io.emit('current_settings', updatedSettings);
                            
                            // Also emit strategy_data with updated settings using consistent property names
                            this.io.emit('strategy_data', {
                                riskManagement: {
                                    ...updatedSettings,
                                    minConfidence: updatedSettings.minConfidence,  // Ensure consistent naming
                                    trading_disabled: false,
                                    daily_loss: 0,
                                    consecutive_losses: 0
                                },
                                timestamp: new Date().toISOString()
                            });
                            
                            logger.info('📢 Updated settings broadcasted via both events', {
                                settings: updatedSettings
                            });
                        } else {
                            logger.warn('ML Engine not initialized; cannot update settings');
                            if (typeof ack === 'function') ack({ error: 'ml_engine_unavailable' });
                        }
                    } catch (err) {
                        logger.error('Error handling update_settings:', err.message);
                        if (typeof ack === 'function') ack({ error: err.message });
                    }
                });

                // Handle get current settings request
                socket.on('get_settings', (ack) => {
                    try {
                        if (this.mlEngine) {
                            const currentSettings = this.mlEngine.settings;
                            if (typeof ack === 'function') {
                                ack(currentSettings);
                            }
                        } else {
                            if (typeof ack === 'function') ack({ error: 'ml_engine_unavailable' });
                        }
                    } catch (err) {
                        logger.error('Error handling get_settings:', err.message);
                        if (typeof ack === 'function') ack({ error: err.message });
                    }
                });
            });

            // Setup NinjaTrader service
            await this.setupNinjaService();

            // === Bombproof AI Trading System Integration ===
            try {
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
                logger.info('✅ Bombproof AI Trading System initialized and active');

                // Link to AI Performance Monitor
                if (this.aiPerformanceMonitor) {
                    this.aiPerformanceMonitor.bombproofTrading = this.bombproofTrading;
                    // Re-wire event listeners to include bombproof trading events
                    if (typeof this.aiPerformanceMonitor.setupEventListeners === 'function') {
                        this.aiPerformanceMonitor.setupEventListeners();
                    }
                }

                // --- Wire Bombproof events to Trade Outcome Tracker & dashboard ---
                if (this.tradeOutcomeTracker) {
                    this.bombproofTrading.on('tradeExecuted', (trade) => {
                        try {
                            this.tradeOutcomeTracker.trackTradeEntry({
                                tradeId: trade.tradeId,
                                instrument: trade.instrument,
                                direction: trade.command === 'go_long' ? 'long' : 'short',
                                price: trade.price,
                                quantity: trade.quantity,
                                stop_price: trade.stop_price,
                                target_price: trade.target_price,
                                confidence: trade.confidence || 0,
                                expectedProfit: trade.expectedProfit || 0,
                                riskRewardRatio: trade.risk_reward || 0,
                                marketRegime: trade.marketRegime,
                                patterns: trade.patterns || [],
                                aiPrediction: trade.ai_reasoning
                            });
                        } catch (e) { logger.error('Tracker trackTradeEntry error', e); }

                        // Broadcast to dashboard
                        if (this.io) this.io.emit('trade_executed', trade);
                    });

                    this.bombproofTrading.on('tradeCompleted', (result) => {
                        try {
                            this.tradeOutcomeTracker.completeTrade(result.id, {
                                price: result.exitPrice,
                                reason: 'exit',
                                marketData: {}
                            });
                        } catch (e) { logger.error('Tracker completeTrade error', e); }

                        if (this.io) this.io.emit('trade_completed', result);
                    });
                }
            } catch (bpError) {
                logger.error('❌ Failed to initialize Bombproof AI Trading System:', bpError);
            }

            logger.info('✅ ML Trading Server started successfully');

            // Handle process termination
            process.on('SIGTERM', async () => {
                logger.info('SIGTERM received. Starting graceful shutdown...');
                await this.stop();
                process.exit(0);
            });

            process.on('SIGINT', async () => {
                logger.info('SIGINT received. Starting graceful shutdown...');
                await this.stop();
                process.exit(0);
            });

        } catch (error) {
            logger.error('Failed to start server:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async stop() {
        try {
            logger.info('Starting graceful shutdown...');
            
            // Close WebSocket server
            if (this.wss) {
                await new Promise((resolve, reject) => {
                    this.wss.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                logger.info('WebSocket server closed');
            }

            // Close HTTP server
            if (this.server) {
                await new Promise((resolve, reject) => {
                    this.server.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                logger.info('HTTP server closed');
            }

            // Cleanup ML components
            if (this.mlEngine) {
                await this.mlEngine.cleanup();
                logger.info('ML Engine cleaned up');
            }

            // Close NinjaTrader service
            if (this.ninjaService) {
                await this.ninjaService.stop().catch(()=>{});
                logger.info('NinjaTrader service stopped');
            }

            // Stop Bombproof trading system
            if (this.bombproofTrading && typeof this.bombproofTrading.stop === 'function') {
                await this.bombproofTrading.stop().catch(()=>{});
                logger.info('Bombproof AI Trading System stopped');
            }

            if (this.io) {
                await new Promise((resolve) => this.io.close(()=>resolve()));
                logger.info('Socket.IO server closed');
            }

            logger.info('Graceful shutdown completed');
        } catch (error) {
            logger.error('Error during shutdown:', error);
            throw error;
        }
    }

    // Broadcast message to all WebSocket clients
    broadcast(message) {
        if (this.wss) {
            this.wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    }
}

// Create and start server
const server = new MLTradingServer();
server.start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
}); 