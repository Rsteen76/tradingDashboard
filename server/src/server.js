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
            logger.info('✅ Smart Trailing initialized');

            this.adaptiveLearning = new AdaptiveLearning();
            logger.info('✅ Adaptive Learning initialized');

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
            this.ninjaService.on('heartbeat', () => {/* optional */});
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

            // IMPORTANT: Auto trading evaluation
            try {
                logger.debug('🔄 Starting auto trading evaluation...', {
                    mlEngineReady: !!this.mlEngine,
                    ninjaServiceReady: !!this.ninjaService,
                    marketDataExists: !!enriched
                });

                if (this.mlEngine) {
                    const tradingOpportunity = await this.mlEngine.evaluateTradingOpportunity(enriched);
                    
                    if (tradingOpportunity) {
                        logger.info('🚨 AUTO TRADING OPPORTUNITY DETECTED! 🚨', {
                            command: tradingOpportunity.command,
                            instrument: tradingOpportunity.instrument,
                            quantity: tradingOpportunity.quantity,
                            price: tradingOpportunity.price,
                            confidence: tradingOpportunity.confidence || 'N/A',
                            reason: tradingOpportunity.reason,
                            ninjaServiceAvailable: !!this.ninjaService
                        });
                    } else {
                        logger.debug('⚪ No auto trading opportunity at this time');
                    }

                    if (tradingOpportunity && this.ninjaService) {
                        // Send trading command to NinjaTrader
                        const sent = this.ninjaService.sendTradingCommand({
                            command: tradingOpportunity.command,
                            instrument: tradingOpportunity.instrument,
                            quantity: tradingOpportunity.quantity,
                            timestamp: tradingOpportunity.timestamp
                        });

                        logger.info('📡 Trading command sent to NinjaTrader:', {
                            commandsSent: sent,
                            success: sent > 0
                        });
                        
                        // Broadcast auto trade signal to dashboard
                        if (this.io && sent > 0) {
                            this.io.emit('auto_trade_signal', {
                                type: 'auto_trade_executed',
                                signal: tradingOpportunity,
                                timestamp: new Date().toISOString()
                            });
                            logger.info('📢 Auto trade signal broadcasted to dashboard');
                        } else {
                            logger.warn('⚠️ Failed to broadcast auto trade signal - no connected clients or command failed');
                        }
                    } else if (tradingOpportunity && !this.ninjaService) {
                        logger.error('❌ Auto trading opportunity detected but NinjaTrader service is NOT available!');
                    }
                } else {
                    logger.debug('⚠️ ML Engine not available for auto trading evaluation');
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
                    execThreshold: currentSettings.execThreshold,
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
                                timestamp: new Date().toISOString()
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
                            const updatedSettings = this.mlEngine.updateSettings(settings);
                            
                            if (typeof ack === 'function') {
                                ack(updatedSettings);
                            }
                            
                            // Broadcast updated settings to all clients
                            this.io.emit('current_settings', updatedSettings);
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