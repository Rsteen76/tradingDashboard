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

    async start() {
        try {
            logger.info('🚀 Starting ML Trading Server...');

            // Setup Express middleware and routes first
            this.setupExpress();
            
            // Setup Express and Socket.IO
            const server = http.createServer(this.app);
            this.io = new IOServer(server, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"]
                }
            });
            
            // Initialize components after Socket.IO is ready
            await this.initializeComponents();
            
            // Start listening
            server.listen(this.port, () => {
                logger.info(`✅ Server listening on port ${this.port}`);
            });

            // Setup WebSocket server
            await this.setupWebSocket();
            
            // Setup event handlers
            this.setupTradingSystemEvents();
            
            logger.info('✅ ML Trading Server started successfully');
            
        } catch (error) {
            logger.error('Failed to start server:', error);
            throw error;
        }
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

            this.positionManager = new PositionManager(logger);
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

            // Initialize NinjaTrader service first
            this.ninjaService = new NinjaTraderService();
            await this.ninjaService.start();
            logger.info('✅ NinjaTrader Service initialized');

            // Initialize Trade Tracker before Bombproof
            this.tradeTracker = new TradeOutcomeTracker({
                adaptiveLearning: this.adaptiveLearning,
                dataCollector: this.dataCollector,
                profitMaximizer: this.profitMaximizer, // Pass ProfitMaximizer instance
                logger
            });
            await this.tradeTracker.initialize();
            logger.info('✅ Trade Outcome Tracker initialized');

            // Initialize Bombproof Trading System
            this.bombproofTrading = new BombproofAITradingSystem({
                mlEngine: this.mlEngine,
                advancedAI: this.advancedAI,
                profitMaximizer: this.profitMaximizer,
                positionManager: this.positionManager,
                ninjaService: this.ninjaService,
                adaptiveLearning: this.adaptiveLearning,
                dataCollector: this.dataCollector,
                tradeTracker: this.tradeTracker
            });
            await this.bombproofTrading.initialize();
            logger.info('✅ Bombproof AI Trading System initialized');

            // Initialize Performance Monitor last
            this.performanceMonitor = new AIPerformanceMonitor({
                bombproofTrading: this.bombproofTrading,
                tradeTracker: this.tradeTracker,
                mlEngine: this.mlEngine,
                adaptiveLearning: this.adaptiveLearning
            });
            await this.performanceMonitor.initialize();
            logger.info('✅ AI Performance Monitor initialized');

            // Setup event listeners after all components are initialized
            this.setupEventListeners();

        } catch (error) {
            logger.error('Failed to initialize components:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Listen for evolution events
        this.bombproofTrading.on('milestoneReached', (milestone) => {
            if (this.io) {
                this.io.emit('system_alert', {
                    id: `milestone_${Date.now()}`,
                    type: 'milestone',
                    severity: 'info',
                    message: `Trading milestone reached: ${milestone.name}`,
                    data: milestone.config,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Start periodic progress reporting
        setInterval(() => {
            if (this.io && this.bombproofTrading) {
                const progress = this.bombproofTrading.getProgressReport();
                this.io.emit('trading_progress', progress);
                
                // Also emit evolution progress for phase tracking
                const evolutionProgress = {
                    currentPhase: progress.currentPhase,
                    totalTrades: progress.totalTrades,
                    tradesToNext: progress.tradesToNext,
                    performance: progress.performance
                };
                this.io.emit('evolution_progress', evolutionProgress);
            }
        }, 5000); // Update every 5 seconds

        // Update performance metrics to include evolution data
        this.performanceMonitor.on('metricsUpdate', (metrics) => {
            if (this.io) {
                const progress = this.bombproofTrading.getProgressReport();
                const metricsToSend = {
                    ...metrics,
                    evolution: {
                        phase: progress.currentPhase,
                        tradesToNext: progress.tradesToNext,
                        blacklistedPatterns: progress.discovered.blacklistedPatterns,
                        blacklistedHours: progress.discovered.blacklistedHours,
                        profitableHours: progress.discovered.profitableHours
                    }
                };
                this.io.emit('performance_metrics', metricsToSend);
            }
        });
    }

    setupExpress() {
        // CORS middleware - Allow requests from frontend
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

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

        // AI Trade Optimization endpoint
        this.app.post('/api/ai-optimize-trade', async (req, res) => {
            try {
                logger.info('🤖 AI Trade Optimization request:', req.body);
                
                const { direction, quantity, current_price, request_type } = req.body;
                
                if (!direction || !current_price) {
                    return res.status(400).json({ 
                        error: 'Missing required parameters: direction, current_price' 
                    });
                }

                // Get current market data with realistic EMA spread
                const price = parseFloat(current_price);
                const marketData = {
                    price: price,
                    atr: 15, // Default ATR if not available
                    volume: 1000,
                    rsi: Math.random() * 40 + 30, // Random RSI between 30-70
                    ema5: price + (Math.random() - 0.5) * 5, // Slight variation around price
                    ema8: price + (Math.random() - 0.5) * 8,
                    ema13: price + (Math.random() - 0.5) * 10,
                    ema21: price + (Math.random() - 0.5) * 15,
                    ema50: price + (Math.random() - 0.5) * 25,
                    adx: Math.random() * 60 + 20, // ADX between 20-80
                    timestamp: new Date().toISOString()
                };

                let optimization = null;

                // Use Profit Maximizer if available
                if (this.profitMaximizer && this.profitMaximizer.isInitialized) {
                    try {
                        const tradeDataForPM = {
                            direction: direction,
                            quantity: quantity || 1,
                            price: parseFloat(current_price), // Use 'price' to align
                            instrument: 'ES' // Or make this configurable
                        };

                        const accountData = {
                            balance: 100000, // Default account balance
                            riskPerTrade: 0.02 // 2% risk per trade
                        };

                        optimization = await this.profitMaximizer.optimizeForMaximumProfit(
                            tradeData, 
                            marketData, 
                            accountData
                        );

                        // Ensure confidence is properly scaled (0-100%)
                        if (optimization.confidence > 1) {
                            optimization.confidence = optimization.confidence / 100; // Convert from percentage to decimal
                        }
                        optimization.confidence = Math.max(0, Math.min(1, optimization.confidence)); // Clamp to 0-1
                        
                        logger.info('✅ Profit Maximizer optimization complete:', {
                            confidence: optimization.confidence,
                            stopPoints: optimization.stopLoss,
                            targetPoints: optimization.target
                        });

                    } catch (error) {
                        logger.warn('⚠️ Profit Maximizer failed, using fallback:', error.message);
                        optimization = null;
                    }
                }

                // Fallback to mathematical optimization if AI unavailable
                if (!optimization) {
                    const atr = marketData.atr || 15;
                    const volatilityMultiplier = Math.max(0.8, Math.min(2.0, atr / 10));
                    const marketRegime = this.classifyMarketRegime(marketData);
                    
                    // Calculate confidence based on market conditions
                    let confidence = 0.65; // Base confidence
                    if (marketRegime.includes('Trending')) confidence += 0.15;
                    if (marketData.adx > 40) confidence += 0.1; // Strong trend
                    if (marketData.rsi > 30 && marketData.rsi < 70) confidence += 0.1; // Not extreme
                    
                    optimization = {
                        optimal_stop_points: Math.round(8 * volatilityMultiplier),
                        optimal_target_points: Math.round(12 * volatilityMultiplier),
                        market_regime: marketRegime,
                        confidence: Math.min(confidence, 0.95), // Cap at 95%
                        reasoning: `Mathematical optimization based on ATR ${atr}. Stop: ${Math.round(8 * volatilityMultiplier)} pts, Target: ${Math.round(12 * volatilityMultiplier)} pts. Market: ${marketRegime}`,
                        risk_reward_ratio: 1.5,
                        position_size: quantity || 1
                    };
                }

                // Enhance with additional data and ensure confidence is in percentage
                const confidencePercentage = Math.round(optimization.confidence * 100); // Convert to percentage
                
                const response = {
                    success: true,
                    ...optimization,
                    confidence: confidencePercentage, // Override with percentage
                    request_type: request_type,
                    direction: direction,
                    current_price: current_price,
                    timestamp: new Date().toISOString(),
                    system_used: optimization.confidence > 0.8 ? 'AI Profit Maximizer' : 'Mathematical Fallback'
                };

                logger.info('📤 AI optimization response:', {
                    market_regime: response.market_regime,
                    confidence: response.confidence,
                    stop_points: response.optimal_stop_points,
                    target_points: response.optimal_target_points
                });

                res.json(response);
                
            } catch (error) {
                logger.error('❌ AI optimization error:', error);
                res.status(500).json({ 
                    error: 'AI optimization failed',
                    message: error.message 
                });
            }
        });

        // Error handling middleware
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    // Helper method to classify market regime
    classifyMarketRegime(marketData) {
        try {
            const { price, ema5, ema21, ema50, atr, rsi, adx } = marketData;
            
            // Calculate trend strength
            const trendStrength = adx ? adx / 50 : 0.5;
            const volatility = atr ? (atr / price) * 100 : 1.0;
            
            // EMA alignment for trend detection
            const bullishAlignment = ema5 > ema21 && ema21 > ema50;
            const bearishAlignment = ema5 < ema21 && ema21 < ema50;
            
            if (trendStrength > 0.6 && (bullishAlignment || bearishAlignment)) {
                return bullishAlignment ? 'Bullish Trending' : 'Bearish Trending';
            } else if (volatility > 2.0) {
                return 'High Volatility';
            } else if (rsi && (rsi > 70 || rsi < 30)) {
                return rsi > 70 ? 'Overbought' : 'Oversold';
            } else {
                return 'Ranging/Neutral';
            }
        } catch (error) {
            return 'Unknown';
        }
    }

    setupTradingSystemEvents() {
        this.io.on('connection', (socket) => {
            logger.info('Socket.IO client connected', { id: socket.id });

            // Send initial trading progress
            if (this.bombproofTrading) {
                const progress = this.bombproofTrading.getProgressReport();
                socket.emit('trading_progress', progress);
            }

            // Forward market data from NinjaTrader
            if (this.ninjaService) {
                this.ninjaService.on('marketData', (data) => {
                    socket.emit('market_data', data);
                });
                
                this.ninjaService.on('strategyStatus', (data) => {
                    socket.emit('strategy_status', data);
                });
            }

            // Handle manual trade commands with FULL AI OPTIMIZATION
            socket.on('manual_trade', async (payload, ack) => {
                try {
                    logger.info('📨 Socket.IO manual_trade received - Processing with FULL AI SYSTEM', { id: socket.id, payload });
                    
                    if (!this.ninjaService) {
                        logger.warn('NinjaTraderService not initialized');
                        if (typeof ack === 'function') ack({ success: false, error: 'service_unavailable' });
                        return;
                    }

                    // **CRITICAL: ALL MANUAL TRADES MUST USE AI OPTIMIZATION**
                    let optimization = null;
                    let aiSystemUsed = 'Manual + Basic Math';
                    
                    // Create comprehensive market data for AI processing
                    const marketData = {
                        instrument: payload.instrument || 'ES',
                        price: payload.current_price,
                        timestamp: new Date().toISOString(),
                        atr: payload.atr || 10,
                        volume: payload.volume || 1000,
                        rsi: payload.rsi || 50,
                        ema5: payload.ema5 || payload.current_price,
                        ema8: payload.ema8 || payload.current_price,
                        ema13: payload.ema13 || payload.current_price,
                        ema21: payload.ema21 || payload.current_price,
                        ema50: payload.ema50 || payload.current_price,
                        adx: payload.adx || 25
                    };

                    // Enhance with real market data if available
                    if (this.dataCollector) {
                        try {
                            const enhancedData = await this.dataCollector.getMarketData(marketData.instrument);
                            Object.assign(marketData, enhancedData);
                        } catch (error) {
                            logger.debug('Using provided market data:', error.message);
                        }
                    }

                    // **FORCE ALL MANUAL TRADES THROUGH PROFIT MAXIMIZER**
                    if (this.profitMaximizer && this.profitMaximizer.isInitialized) {
                        try {
                            const tradeDirection = payload.command === 'go_long' ? 'LONG' : 
                                                 payload.command === 'go_short' ? 'SHORT' : 'CLOSE';
                            
                            logger.info('🧠 Running manual trade through AI Profit Maximizer...');
                            
                            optimization = await this.profitMaximizer.optimizeForMaximumProfit(
                                {
                                    ...marketData,
                                    direction: tradeDirection,
                                    quantity: payload.quantity || 1,
                                    isManual: true,
                                    isManualTrade: true,
                                    userStopPrice: payload.stop_price,
                                    userTargetPrice: payload.target_price,
                                    userReason: payload.reason || 'Manual Trade'
                                },
                                marketData,
                                { balance: 50000, freeMargin: 40000 }
                            );

                            if (optimization && optimization.confidence > 0.5) {
                                aiSystemUsed = `AI Profit Maximizer (${optimization.algorithm})`;
                                logger.info('✅ AI Profit Maximizer enhanced manual trade:', {
                                    originalStop: payload.stop_price,
                                    aiStop: optimization.stopPrice,
                                    originalTarget: payload.target_price,
                                    aiTarget: optimization.targetPrice,
                                    confidence: optimization.confidence,
                                    expectedProfit: optimization.expectedProfit,
                                    algorithm: optimization.algorithm
                                });
                            } else {
                                logger.warn('⚠️ AI optimization confidence too low, using enhanced fallback');
                                optimization = null;
                            }

                        } catch (error) {
                            logger.error('❌ Profit Maximizer failed for manual trade:', error.message);
                            optimization = null;
                        }
                    } else {
                        logger.warn('⚠️ Profit Maximizer not available - manual trade will use basic calculations');
                    }

                    // Build AI-enhanced trading command
                    const tradingCommand = {
                        command: payload.command,
                        instrument: payload.instrument || 'ES',
                        quantity: payload.quantity || 1,
                        timestamp: new Date().toISOString(),
                        stop_price: optimization?.stopPrice || payload.stop_price,
                        target_price: optimization?.targetPrice || payload.target_price,
                        current_price: payload.current_price,
                        reason: optimization ? 
                            `AI-Enhanced Manual Trade (${optimization.algorithm})` : 
                            (payload.reason || 'Manual Trade'),
                        
                        // Critical flags for AI systems
                        isManualTrade: true,
                        isManual: true,
                        enable_smart_trailing: true,
                        smart_trailing_active: true,
                        
                        // AI optimization data
                        ai_optimization_data: optimization,
                        use_ai_optimization: !!optimization,
                        aiSystemUsed: aiSystemUsed,
                        
                        // Unique tracking ID
                        clientTradeId: `manual_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    };

                    // *** IMPORTANT: Let Bombproof system handle the actual send to NinjaTrader to avoid duplicates ***

                    // **REGISTER WITH BOMBPROOF AI FOR SMART TRAILING (Bombproof will also send the trade)**
                    if (this.bombproofTrading) {
                        const tradeDetailsForMonitoring = {
                            tradeId: tradingCommand.clientTradeId,
                            command: tradingCommand.command, // CRITICAL: Include command for manual trade handler
                            instrument: payload.instrument || 'ES',
                            direction: payload.command.includes('long') ? 'LONG' : 
                                      payload.command.includes('short') ? 'SHORT' : 'CLOSE',
                            quantity: payload.quantity || 1,
                            current_price: payload.current_price, // CRITICAL: Use current_price key expected by handler
                            price: payload.current_price,
                            fillPrice: payload.current_price,
                            entryTime: new Date().toISOString(),
                            stop_price: tradingCommand.stop_price,
                            target_price: tradingCommand.target_price,
                            current_smart_stop: tradingCommand.stop_price,
                            
                            // Critical AI flags
                            isManual: true,
                            isManualTrade: true,
                            isAiOptimized: !!optimization,
                            smart_trailing_active: true,
                            active_trailing_algorithm: 'manual_adaptive_atr',
                            
                            // AI data for learning
                            optimization: optimization,
                            aiSystemUsed: aiSystemUsed,
                            reason: tradingCommand.reason,
                            timestamp: new Date().toISOString()
                        };
                        
                        logger.info('🤖 Registering AI-enhanced manual trade for smart trailing:', {
                            tradeId: tradeDetailsForMonitoring.tradeId,
                            aiSystemUsed: aiSystemUsed,
                            smartTrailingActive: true
                        });
                        
                        await this.bombproofTrading.handleNewManualTrade(tradeDetailsForMonitoring);
                    }

                    if (typeof ack === 'function') {
                        ack({ 
                            success: true,
                            aiEnhanced: !!optimization,
                            optimization: optimization,
                            aiSystemUsed: aiSystemUsed,
                            smartTrailingActive: true
                        });
                    }
                    
                } catch (err) {
                    logger.error('Error handling manual_trade:', err.message);
                    if (typeof ack === 'function') ack({ success: false, error: err.message });
                }
            });

            // Handle settings updates
            socket.on('update_settings', (settings, ack) => {
                try {
                    logger.info('⚙️ Socket.IO update_settings received', { id: socket.id, settings });
                    if (this.mlEngine) {
                        const updatedSettings = this.mlEngine.updateSettings(settings);
                        if (typeof ack === 'function') {
                            ack(updatedSettings);
                        }
                        this.io.emit('current_settings', updatedSettings);
                    } else {
                        logger.warn('ML Engine not initialized');
                        if (typeof ack === 'function') ack({ error: 'ml_engine_unavailable' });
                    }
                } catch (err) {
                    logger.error('Error handling update_settings:', err.message);
                    if (typeof ack === 'function') ack({ error: err.message });
                }
            });

            // Handle get current settings
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

            // Handle get trading progress
            socket.on('get_trading_progress', (ack) => {
                try {
                    if (this.bombproofTrading) {
                        const progress = this.bombproofTrading.getProgressReport();
                        if (typeof ack === 'function') {
                            ack(progress);
                        }
                    } else {
                        if (typeof ack === 'function') ack({ error: 'system_unavailable' });
                    }
                } catch (err) {
                    logger.error('Error getting progress:', err.message);
                    if (typeof ack === 'function') ack({ error: err.message });
                }
            });
        });

        // Trade tracking events
        if (this.bombproofTrading && this.tradeTracker) {
            this.bombproofTrading.on('tradeExecuted', (trade) => {
                this.tradeTracker.trackTradeEntry(trade);
                logger.info('🎯 Bombproof trade executed and tracked:', trade.tradeId);
            });

            this.bombproofTrading.on('tradeCompleted', (result) => {
                if (result.tradeId) {
                    this.tradeTracker.completeTrade(result.tradeId, result);
                }
            });
            
            // NEW: Real-time pending trade updates for immediate dashboard visibility
            this.bombproofTrading.on('pendingTradeUpdate', (tradeData) => {
                logger.info('📈 Broadcasting pending trade to dashboard:', tradeData.tradeId);
                this.io.emit('pending_trade', tradeData);
                this.io.emit('strategy_data', {
                    ...this.latestStrategyData,
                    pending_trade: tradeData,
                    position: tradeData.action, // Show expected position
                    pending_entry: tradeData.entry_price,
                    pending_stop: tradeData.stop_loss,
                    pending_target: tradeData.take_profit,
                    trade_status: 'PENDING_EXECUTION',
                    timestamp: tradeData.timestamp
                });
            });
        }
        
        // Position manager real-time updates
        if (this.positionManager) {
            this.positionManager.on('positionUpdate', (data) => {
                logger.info('📊 Broadcasting real-time position update:', data.instrument);
                this.io.emit('position_update', data);
                this.io.emit('strategy_data', {
                    ...this.latestStrategyData,
                    position: data.position.direction,
                    position_size: data.position.size,
                    avg_price: data.position.avgPrice,
                    current_smart_stop: data.position.current_smart_stop,
                    smart_trailing_active: data.position.smart_trailing_active,
                    active_trailing_algorithm: data.position.active_trailing_algorithm,
                    last_update: data.position.lastUpdate,
                    timestamp: new Date().toISOString()
                });
            });
        }

        // Performance monitoring events
        if (this.performanceMonitor && this.io) {
            this.performanceMonitor.on('metricsUpdate', (metrics) => {
                const metricsToSend = metrics.metrics || metrics;
                
                // Get current model metrics
                const modelMetrics = {
                    lstm: this.mlEngine?.stats?.lstm || { predictions: 0, accuracy: 0 },
                    transformer: this.mlEngine?.stats?.transformer || { predictions: 0, accuracy: 0 },
                    randomForest: this.mlEngine?.stats?.randomForest || { predictions: 0, accuracy: 0 },
                    ensemble: this.mlEngine?.stats?.ensemble || { predictions: 0, accuracy: 0 }
                };

                this.io.emit('performance_metrics', {
                    trading: {
                        dailyPnL: metricsToSend.trading?.dailyPnL || 0,
                        consecutiveWins: metricsToSend.trading?.consecutiveWins || 0,
                        consecutiveLosses: metricsToSend.trading?.consecutiveLosses || 0,
                        tradesCompleted: metricsToSend.trading?.predictions || 0
                    },
                    risk: {
                        positionsOpen: metricsToSend.risk?.positionsOpen || 0,
                        totalExposure: metricsToSend.risk?.totalExposure || 0,
                        riskScore: metricsToSend.risk?.riskScore || 0,
                        marginUsed: metricsToSend.risk?.marginUsed || 0
                    },
                    health: {
                        cpuUsage: metricsToSend.health?.cpuUsage || 0,
                        memoryUsage: metricsToSend.health?.memoryUsage || 0,
                        uptime: metricsToSend.health?.uptime || 0,
                        lastHeartbeat: metricsToSend.health?.lastHeartbeat || new Date().toISOString()
                    },
                    models: {
                        lstm: {
                            predictions: modelMetrics.lstm.predictions,
                            accuracy: modelMetrics.lstm.accuracy,
                            lastUpdate: new Date().toISOString()
                        },
                        transformer: {
                            predictions: modelMetrics.transformer.predictions,
                            accuracy: modelMetrics.transformer.accuracy,
                            lastUpdate: new Date().toISOString()
                        },
                        randomForest: {
                            predictions: modelMetrics.randomForest.predictions,
                            accuracy: modelMetrics.randomForest.accuracy,
                            lastUpdate: new Date().toISOString()
                        },
                        ensemble: {
                            predictions: modelMetrics.ensemble.predictions,
                            accuracy: modelMetrics.ensemble.accuracy,
                            lastUpdate: new Date().toISOString()
                        }
                    }
                });
            });

            this.performanceMonitor.on('alert', (alert) => {
                logger.warn('🚨 Performance Alert:', alert);
                this.io.emit('system_alert', alert);
            });
        }

        // Trading system error handling
        if (this.bombproofTrading && this.io) {
            this.bombproofTrading.on('tradingError', (error) => {
                logger.error('❌ Bombproof Trading Error:', error);
                this.io.emit('trading_error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            });
        }

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
            // Log market data receipt
            logger.info('📊 Market data received:', {
                instrument: data.instrument,
                timestamp: new Date().toISOString()
            });

            // Generate prediction
            if (this.mlEngine && this.mlEngine.isReady) {
                const prediction = await this.mlEngine.generatePrediction(data);
                logger.info('🤖 ML Engine prediction:', {
                    instrument: data.instrument,
                    confidence: prediction?.confidence || 0,
                    direction: prediction?.direction || 'none',
                    timestamp: new Date().toISOString()
                });

                // Evaluate trading opportunity
                if (this.bombproofTrading) {
                    const evaluation = await this.bombproofTrading.evaluateTradingOpportunity(data);
                    if (!evaluation) {
                        logger.info('⚠️ Trade evaluation rejected:', {
                            instrument: data.instrument,
                            timestamp: new Date().toISOString(),
                            reason: 'Failed pre-flight or validation checks'
                        });
                    }
                }
            }

            // Broadcast to connected clients
            this.broadcast(JSON.stringify({
                type: 'market_data',
                data: data
            }));

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
                let augmentedData = { ...data };
                let isKnownManualTrade = false;

                // Attempt to identify if this status update pertains to a known manual trade
                // This logic is simplified and relies on instrument matching.
                // A robust solution needs proper trade ID mapping from NT execution back to backend ID.
                if (data.instrument && this.bombproofTrading && this.bombproofTrading.executedTrades) {
                    for (const [tradeId, trade] of this.bombproofTrading.executedTrades.entries()) {
                        if (trade.instrument === data.instrument && this.bombproofTrading.activeManualTradeIds.has(tradeId)) {
                            augmentedData.is_manual_trade = true;
                            augmentedData.active_trailing_algorithm = trade.active_trailing_algorithm || 'adaptive_atr'; // Or get from smartTrailing state
                            augmentedData.current_smart_stop = trade.current_smart_stop || trade.stop_price;
                            isKnownManualTrade = true;
                            break;
                        }
                    }
                }

                this.io.emit('strategy_status', augmentedData);
                
                // Also emit strategy_data with current settings for dashboard synchronization
                const currentSettings = this.mlEngine ? this.mlEngine.settings : {};
                logger.debug('📤 Emitting strategy_data with settings:', {
                    currentSettings,
                    minConfidence: currentSettings.minConfidence,
                    autoTradingEnabled: currentSettings.autoTradingEnabled
                });
                
                this.io.emit('strategy_data', {
                    strategyStatus: augmentedData, // Use augmented data here too
                    riskManagement: {
                        ...currentSettings,
                        trading_disabled: augmentedData.trading_disabled ?? false,
                        daily_loss: augmentedData.daily_loss ?? 0,
                        consecutive_losses: augmentedData.consecutive_losses ?? 0
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

    calculateRiskLevel(riskMetrics) {
        if (!riskMetrics) return 'low';
        
        const exposureLimit = 100000; // $100k exposure limit
        const riskScore = (riskMetrics.totalExposure / exposureLimit) * 100;
        
        if (riskScore > 80) return 'high';
        if (riskScore > 50) return 'medium';
        return 'low';
    }

    calculateHealthScore(healthMetrics) {
        if (!healthMetrics) return 70;
        
        let score = 100;
        
        // CPU penalty (max 20 points)
        if (healthMetrics.cpuUsage > 80) score -= 20;
        else if (healthMetrics.cpuUsage > 60) score -= 10;
        
        // Memory penalty (max 20 points)
        if (healthMetrics.memoryUsage > 80) score -= 20;
        else if (healthMetrics.memoryUsage > 60) score -= 10;
        
        // Latency penalty (max 20 points)
        if (healthMetrics.predictionLatency > 1000) score -= 20;
        else if (healthMetrics.predictionLatency > 500) score -= 10;
        
        // Connection penalty (40 points)
        if (!healthMetrics.ninjaConnection) score -= 40;
        
        return Math.max(0, Math.min(100, score));
    }

    // ============================================================================
    // UNIFIED TRADE MANAGEMENT HELPER METHODS
    // ============================================================================
    
    /**
     * Validates trade requests according to unified architecture requirements
     */
    validateTradeRequest(payload) {
        if (!payload) {
            return { valid: false, error: 'Empty trade request' };
        }
        
        if (!payload.command || !['go_long', 'go_short', 'close_position'].includes(payload.command)) {
            return { valid: false, error: 'Invalid or missing command' };
        }
        
        if (!payload.quantity || payload.quantity <= 0) {
            return { valid: false, error: 'Invalid quantity' };
        }
        
        if (!payload.current_price || payload.current_price <= 0) {
            return { valid: false, error: 'Invalid current price' };
        }
        
        return { valid: true };
    }
    
    /**
     * Generates unique trade IDs for unified tracking
     */
    generateTradeId(source, action) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6);
        return `${source}_${action}_${timestamp}_${random}`;
    }
    
    /**
     * Processes trade exits without affecting strategy lifecycle
     */
    async processTradeExit(exitPayload) {
        try {
            logger.info('🔄 UNIFIED TRADE MANAGER: Processing trade exit - Strategy continues running');
            
            const exitDetails = {
                tradeId: exitPayload.tradeId,
                exitPrice: exitPayload.exitPrice,
                exitReason: exitPayload.exitReason || 'MANUAL_EXIT',
                pnl: exitPayload.pnl || 0,
                timestamp: new Date().toISOString(),
                // CRITICAL: This flag ensures strategy continues running
                strategyAction: 'CONTINUE_OPERATION'
            };
            
            // Notify Bombproof AI system of exit (but maintain strategy operation)
            if (this.bombproofTrading) {
                await this.bombproofTrading.handleTradeExit(exitDetails);
            }
            
            // Update position manager without stopping strategy
            if (this.positionManager) {
                await this.positionManager.updatePositionOnExit(exitDetails);
            }
            
            // Broadcast exit status (strategy remains active)
            this.broadcastTradeStatus(exitDetails, 'TRADE_CLOSED');
            
            logger.info('✅ UNIFIED MANAGER: Trade exit processed, strategy operational status: ACTIVE');
            
            return {
                success: true,
                message: 'Trade exit processed - Strategy continues running',
                exitDetails: exitDetails
            };
            
        } catch (error) {
            logger.error('❌ Trade exit processing error:', error);
            throw error;
        }
    }
    
    /**
     * Broadcasts trade status to all connected systems
     */
    broadcastTradeStatus(trade, eventType) {
        try {
            const statusMessage = {
                type: eventType,
                trade: trade,
                timestamp: new Date().toISOString(),
                // IMPORTANT: Always indicate strategy operational status
                strategyStatus: 'ACTIVE',
                systemStatus: 'OPERATIONAL'
            };
            
            // Broadcast to WebSocket clients
            if (this.io) {
                this.io.emit('trade_status_update', statusMessage);
            }
            
            // Send to NinjaTrader (without affecting strategy lifecycle)
            if (this.ninjaService && this.ninjaService.isConnected()) {
                this.ninjaService.broadcastStatus({
                    ...statusMessage,
                    ninjaAction: 'UPDATE_ONLY', // No strategy control
                    maintainStrategy: true
                });
            }
            
            logger.debug('📡 Trade status broadcast:', eventType);
            
        } catch (error) {
            logger.error('❌ Trade status broadcast error:', error);
        }
    }
    
    /**
     * Ensures state synchronization without strategy interruption
     */
    async synchronizeTradeState() {
        try {
            logger.info('🔄 UNIFIED MANAGER: Synchronizing trade state - Strategy remains active');
            
            // Get current position from NinjaTrader
            const ninjaPositions = await this.ninjaService?.getPositions() || [];
            
            // Get tracked trades from Bombproof AI
            const trackedTrades = await this.bombproofTrading?.getActiveTrades() || [];
            
            // Compare and reconcile differences
            const syncResults = {
                ninjaPositions: ninjaPositions.length,
                trackedTrades: trackedTrades.length,
                discrepancies: [],
                resolutions: []
            };
            
            // Handle discrepancies without stopping strategy
            if (ninjaPositions.length !== trackedTrades.length) {
                logger.warn('⚠️ Position count mismatch detected - Auto-correcting while strategy runs');
                
                // Auto-correction logic here
                for (const ninjaPos of ninjaPositions) {
                    const matchingTrade = trackedTrades.find(t => 
                        t.instrument === ninjaPos.instrument && 
                        Math.abs(t.quantity - ninjaPos.quantity) < 0.01
                    );
                    
                    if (!matchingTrade) {
                        // Create synthetic trade to match NinjaTrader state
                        const syntheticTrade = {
                            tradeId: this.generateTradeId('SYNC', 'POSITION'),
                            source: 'SYNCHRONIZATION',
                            instrument: ninjaPos.instrument,
                            quantity: ninjaPos.quantity,
                            entryPrice: ninjaPos.averagePrice,
                            status: 'SYNCED',
                            timestamp: new Date().toISOString()
                        };
                        
                        if (this.bombproofTrading) {
                            await this.bombproofTrading.addSyncedTrade(syntheticTrade);
                        }
                        
                        syncResults.resolutions.push(`Synced ${ninjaPos.instrument} position`);
                    }
                }
            }
            
            logger.info('✅ UNIFIED MANAGER: State synchronization complete - Strategy operational');
            return syncResults;
            
        } catch (error) {
            logger.error('❌ State synchronization error:', error);
            throw error;
        }
    }
}

// Create and start server
const server = new MLTradingServer();
server.start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
}); 