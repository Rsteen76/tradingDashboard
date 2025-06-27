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

// Import utilities
const logger = require('./utils/logger');

// Add import at top after other imports
const NinjaTraderService = require('./services/ninja-trader-service');

// Import Bombproof AI Trading System components
const BombproofAITradingSystem = require('./core/bombproof-ai-trading');
const TradeOutcomeTracker = require('./core/trade-outcome-tracker');
const AIPerformanceMonitor = require('./core/ai-performance-monitor');

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

            // Initialize Bombproof Trading System
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

            // Initialize Trade Tracker
            this.tradeTracker = new TradeOutcomeTracker({
                adaptiveLearning: this.adaptiveLearning,
                dataCollector: this.dataCollector,
                logger
            });
            await this.tradeTracker.initialize();
            logger.info('✅ Trade Outcome Tracker initialized');

            // Initialize Performance Monitor
            this.performanceMonitor = new AIPerformanceMonitor({
                bombproofTrading: this.bombproofTrading,
                tradeTracker: this.tradeTracker,
                mlEngine: this.mlEngine,
                adaptiveLearning: this.adaptiveLearning
            });
            await this.performanceMonitor.initialize();
            logger.info('✅ AI Performance Monitor initialized');

            // Setup event handlers for integrated system
            this.setupTradingSystemEvents();

            // Setup express after components are ready
            this.setupExpress();
            logger.info('✅ Server components initialized');

        } catch (error) {
            logger.error('Failed to initialize components:', error);
            throw error;
        }
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
                timestamp: new Date().toISOString() 
            });
        });

        // Error handling middleware
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    setupTradingSystemEvents() {
        if (!this.bombproofTrading || !this.tradeTracker || !this.performanceMonitor) return;

        // Trade tracking events
        this.bombproofTrading.on('tradeExecuted', (trade) => {
            this.tradeTracker.trackTradeEntry(trade);
            logger.info('🎯 Bombproof trade executed and tracked:', trade.tradeId);
        });

        this.bombproofTrading.on('tradeCompleted', (result) => {
            if (this.tradeTracker && result.tradeId) {
                this.tradeTracker.completeTrade(result.tradeId, result);
            }
        });

        // Performance monitoring events
        this.performanceMonitor.on('metricsUpdate', (metrics) => {
            if (this.io) {
                this.io.emit('performance_metrics', metrics);
            }
        });

        this.performanceMonitor.on('alert', (alert) => {
            logger.warn('🚨 Performance Alert:', alert);
            if (this.io) {
                this.io.emit('system_alert', alert);
            }
        });

        // Trading system error handling
        this.bombproofTrading.on('tradingError', (error) => {
            logger.error('❌ Bombproof Trading Error:', error);
            if (this.io) {
                this.io.emit('trading_error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        logger.info('✅ Trading system event handlers configured');
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
            const enriched = await this.featureEngineer.extractFeatures(processed);
            
            // Store in database if available
            try {
                // Uncomment when database is available
                // await this.db.query(
                //     'INSERT INTO market_data (timestamp, instrument, price, volume, rsi, atr) VALUES ($1, $2, $3, $4, $5, $6)',
                //     [processed.timestamp, processed.instrument, processed.price, processed.volume, processed.rsi, processed.atr]
                // );
            } catch (dbError) {
                // Database is optional for now
                logger.debug('Database not available, skipping storage');
            }

            // Broadcast to all WebSocket clients
            this.broadcast({
                type: 'market_data',
                payload: enriched
            });

            // Broadcast to Socket.IO clients (dashboard)
            if (this.io) {
                // Include current ML settings in strategy data for dashboard synchronization
                const currentSettings = this.mlEngine ? this.mlEngine.settings : {};
                
                this.io.emit('strategy_data', {
                    marketData: enriched,
                    riskManagement: {
                        ...currentSettings,
                        trading_disabled: false, // Default, should come from position manager
                        daily_loss: 0, // Default, should come from position manager
                        consecutive_losses: 0 // Default, should come from position manager
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // BOMBPROOF AI TRADING SYSTEM - Enhanced safety and performance
            try {
                if (this.bombproofTrading && this.bombproofTrading.isInitialized) {
                    logger.debug('🛡️ Evaluating trading opportunity with Bombproof AI System...');
                    
                    const tradingDecision = await this.bombproofTrading.evaluateTradingOpportunity(enriched);
                    
                    if (tradingDecision && tradingDecision.success) {
                        logger.info('🎯 Bombproof AI Trade Executed:', {
                            tradeId: tradingDecision.tradeId,
                            instrument: enriched.instrument,
                            confidence: tradingDecision.confidence || 'N/A',
                            expectedProfit: tradingDecision.expectedProfit || 'N/A'
                        });
                        
                        // Broadcast to dashboard
                        if (this.io) {
                            this.io.emit('ai_trade_signal', {
                                type: 'bombproof_ai_trade',
                                tradeId: tradingDecision.tradeId,
                                execution: tradingDecision.execution,
                                timestamp: new Date().toISOString()
                            });
                        }
                    } else {
                        logger.debug('⚪ Bombproof AI: No high-quality trading opportunity detected');
                    }
                } else {
                    logger.debug('⚠️ Bombproof AI System not ready, using fallback...');
                    
                    // Fallback to existing system
                    if (this.advancedAI && this.profitMaximizer) {
                        const currentPosition = { quantity: 0, avgPrice: 0 };
                        const accountInfo = { balance: 100000 };
                        
                        const profitOptimization = await this.profitMaximizer.optimizeForMaximumProfit(
                            enriched, 
                            currentPosition, 
                            accountInfo
                        );
                        
                        const shouldTrade = profitOptimization.confidence > 0.75 && 
                                           profitOptimization.expectedProfit > 25;
                        
                        if (shouldTrade && this.ninjaService) {
                            const tradingCommand = {
                                command: profitOptimization.action === 'up' ? 'go_long' : 'go_short',
                                instrument: enriched.instrument || 'NQ',
                                quantity: profitOptimization.positionSize,
                                entry_price: profitOptimization.optimalEntry,
                                stop_price: profitOptimization.optimalStopLoss,
                                target_price: profitOptimization.optimalExit,
                                timestamp: new Date().toISOString(),
                                reason: `Fallback AI: ${profitOptimization.expectedProfit.toFixed(2)} expected profit`
                            };
                            
                            const sent = this.ninjaService.sendTradingCommand(tradingCommand);
                            if (sent > 0) {
                                logger.info('📡 Fallback AI command sent to NinjaTrader');
                            }
                        }
                    }
                }
            } catch (autoTradeError) {
                logger.warn('⚠️ Auto trading evaluation failed:', autoTradeError.message);
            }

        } catch (error) {
            logger.error('Error processing market data:', error);
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

    onNinjaTradeExecution(data) {
        try {
            logger.info('💰 Trade execution from NinjaTrader:', {
                instrument: data.instrument,
                action: data.action,
                quantity: data.quantity,
                price: data.price,
                pnl: data.pnl
            });

            // Complete trade tracking if we have a trade ID
            if (this.tradeTracker && data.tradeId) {
                this.tradeTracker.completeTrade(data.tradeId, data);
                logger.info('📊 Trade completion tracked:', data.tradeId);
            }

            // Send trade execution to adaptive learning engine if available
            if (this.adaptiveLearning) {
                this.adaptiveLearning.learnFromTrade(data);
            }

            // Notify bombproof trading system
            if (this.bombproofTrading) {
                this.bombproofTrading.emit('ninjaTradeExecution', data);
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

            // Start HTTP server
            this.httpServer = this.app.listen(this.port, () => {
                logger.info(`🚀 HTTP server listening on port ${this.port}`);
            });

            // Setup WebSocket after HTTP server is running
            this.setupWebSocket();
            logger.info(`🚀 WebSocket server listening on port ${this.wsPort}`);

            // Attach Socket.IO to the same HTTP server (port 3001)
            this.io = new IOServer(this.httpServer, {
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
            logger.error('Failed to start server:', error);
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
            if (this.httpServer) {
                await new Promise((resolve, reject) => {
                    this.httpServer.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                logger.info('HTTP server closed');
            }

            // Cleanup Bombproof AI components
            if (this.bombproofTrading) {
                await this.bombproofTrading.stop();
                logger.info('Bombproof AI Trading System stopped');
            }

            if (this.tradeTracker) {
                await this.tradeTracker.stop();
                logger.info('Trade Outcome Tracker stopped');
            }

            if (this.performanceMonitor) {
                await this.performanceMonitor.stop();
                logger.info('AI Performance Monitor stopped');
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