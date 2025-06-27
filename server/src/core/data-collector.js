const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const { EventEmitter } = require('events');
const { LRUCache } = require('lru-cache');

/**
 * DataCollector handles collection, storage, and preprocessing of training data
 * for the ML trading system.
 */
class DataCollector extends EventEmitter {
    constructor() {
        super();
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { 
                service: 'ml-trading-server',
                component: 'DataCollector'
            },
            transports: [
                new winston.transports.File({ filename: 'logs/data-collector.log' })
            ]
        });

        // Initialize caches for different data types
        this.marketDataCache = new LRUCache({
            max: 1000,
            ttl: 1000 * 60 * 60 // 1 hour
        });

        this.predictionCache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 30 // 30 minutes
        });

        this.outcomeCache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 60 * 24 // 24 hours
        });

        this.dataBuffer = {
            priceData: [],
            indicators: [],
            signals: [],
            trades: [],
            marketConditions: [],
            mlPredictions: []
        };
        
        this.bufferSize = 10000; // Keep last 10k data points in memory
        this.saveInterval = 30000; // Save to disk every 30 seconds
        this.dataDirectory = path.join(__dirname, '../data');
        
        this.initializeDataCollector();
    }

    async initializeDataCollector() {
        try {
            // Ensure data directory exists
            await fs.mkdir(this.dataDirectory, { recursive: true });
            
            // Start periodic save
            setInterval(() => this.saveBufferToDisk(), this.saveInterval);
            
            console.log('📊 Data Collector initialized');
        } catch (error) {
            console.error('❌ Error initializing data collector:', error);
        }
    }

    /**
     * Collects and stores market data for training
     * @param {Object} marketData The market data to collect
     */
    async collectMarketData(marketData) {
        try {
            const { instrument, timestamp } = marketData;
            const key = `${instrument}_${timestamp}`;
            
            this.marketDataCache.set(key, marketData);
            this.emit('marketDataCollected', { instrument, timestamp });
            
            this.logger.debug('Market data collected', { 
                instrument,
                timestamp,
                cacheSize: this.marketDataCache.size 
            });
        } catch (error) {
            this.logger.error('Error collecting market data', { error: error.message });
            throw error;
        }
    }

    /**
     * Records prediction outcomes for model performance tracking
     * @param {Object} prediction The original prediction
     * @param {Object} outcome The actual outcome
     */
    async recordOutcome(prediction, outcome) {
        try {
            const { instrument, timestamp } = prediction;
            const key = `${instrument}_${timestamp}`;
            
            const outcomeData = {
                prediction,
                outcome,
                timestamp: Date.now()
            };
            
            this.outcomeCache.set(key, outcomeData);
            this.emit('outcomeRecorded', { instrument, timestamp });
            
            this.logger.debug('Outcome recorded', { 
                instrument,
                timestamp,
                predicted: prediction.direction,
                actual: outcome.direction
            });
        } catch (error) {
            this.logger.error('Error recording outcome', { error: error.message });
            throw error;
        }
    }

    /**
     * Prepares training data batch from collected data
     * @param {string} instrument The instrument to prepare data for
     * @returns {Object} Prepared training data batch
     */
    async prepareTrainingData(instrument) {
        try {
            const trainingData = {
                features: [],
                labels: [],
                timestamps: []
            };

            // Get all relevant market data and outcomes
            for (const [key, marketData] of this.marketDataCache.entries()) {
                if (marketData.instrument === instrument) {
                    const outcome = this.outcomeCache.get(key);
                    if (outcome) {
                        trainingData.features.push(marketData);
                        trainingData.labels.push(outcome.outcome.direction);
                        trainingData.timestamps.push(marketData.timestamp);
                    }
                }
            }

            this.logger.info('Training data prepared', {
                instrument,
                samples: trainingData.features.length
            });

            return trainingData;
        } catch (error) {
            this.logger.error('Error preparing training data', { error: error.message });
            throw error;
        }
    }

    /**
     * Cleans up old data from caches
     */
    cleanup() {
        this.marketDataCache.clear();
        this.predictionCache.clear();
        this.outcomeCache.clear();
        this.logger.info('Data collector caches cleared');
    }

    /**
     * Process and standardize incoming market data
     * @param {Object} rawData Raw market data from source
     * @returns {Object} Processed and standardized market data
     */
    processMarketData(rawData) {
        try {
            // Standardize the data format
            const processed = {
                instrument: rawData.instrument || 'ES',
                price: parseFloat(rawData.price || rawData.last || 0),
                volume: parseInt(rawData.volume || 0),
                timestamp: rawData.timestamp || new Date().toISOString(),
                bid: parseFloat(rawData.bid || rawData.price || 0),
                ask: parseFloat(rawData.ask || rawData.price || 0),
                
                // Technical indicators (if provided)
                rsi: parseFloat(rawData.rsi || 50),
                atr: parseFloat(rawData.atr || 1.0),
                ema_alignment: parseFloat(rawData.ema_alignment || 0),
                
                // Additional fields
                change: parseFloat(rawData.change || 0),
                change_percent: parseFloat(rawData.change_percent || 0),
                
                // Metadata
                source: rawData.source || 'ninja_trader',
                processed_at: new Date().toISOString()
            };
            
            // Calculate derived values
            if (processed.bid && processed.ask) {
                processed.spread = processed.ask - processed.bid;
                processed.mid_price = (processed.bid + processed.ask) / 2;
            }
            
            // Store in cache for later retrieval
            this.collectMarketData(processed);
            
            return processed;
            
        } catch (error) {
            this.logger.error('Error processing market data:', error.message);
            
            // Return a safe fallback
            return {
                instrument: 'ES',
                price: 0,
                volume: 0,
                timestamp: new Date().toISOString(),
                error: true,
                error_message: error.message
            };
        }
    }

    // Collect ML predictions and confidence levels
    collectMLPredictions(predictions) {
        const mlDataPoint = {
            timestamp: new Date().toISOString(),
            predictions: {
                long_probability: predictions.ml_long_probability,
                short_probability: predictions.ml_short_probability,
                confidence: predictions.ml_confidence,
                signal_strength: predictions.signal_strength
            },
            ensemble: {
                technical_ai: predictions.technical_ai_score,
                pattern_ai: predictions.pattern_ai_score,
                momentum_ai: predictions.momentum_ai_score,
                volume_ai: predictions.volume_ai_score
            },
            market_regime: predictions.market_regime,
            pattern_detected: predictions.pattern_detected
        };

        this.addToBuffer('mlPredictions', mlDataPoint);
    }

    // Collect trading signals
    collectTradingSignal(signal) {
        const signalDataPoint = {
            timestamp: new Date().toISOString(),
            type: signal.type, // 'entry', 'exit', 'stop', 'target'
            direction: signal.direction, // 'LONG', 'SHORT'
            price: signal.price,
            strength: signal.strength,
            confidence: signal.confidence,
            reasoning: signal.reasoning,
            indicators_state: signal.indicators_state,
            market_context: signal.market_context
        };

        this.addToBuffer('signals', signalDataPoint);
    }

    // Collect completed trades for performance analysis
    collectTradeOutcome(trade) {
        const tradeDataPoint = {
            timestamp: new Date().toISOString(),
            trade_id: trade.id,
            direction: trade.direction,
            entry_price: trade.entry_price,
            exit_price: trade.exit_price,
            entry_time: trade.entry_time,
            exit_time: trade.exit_time,
            pnl: trade.pnl,
            pnl_percentage: ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * (trade.direction === 'LONG' ? 1 : -1),
            duration: new Date(trade.exit_time) - new Date(trade.entry_time),
            exit_reason: trade.exit_reason, // 'target', 'stop', 'manual', 'timeout'
            max_favorable: trade.max_favorable,
            max_adverse: trade.max_adverse,
            entry_signal: trade.entry_signal,
            market_conditions_at_entry: trade.market_conditions_at_entry,
            market_conditions_at_exit: trade.market_conditions_at_exit
        };

        this.addToBuffer('trades', tradeDataPoint);
    }

    // Add data to buffer with size management
    addToBuffer(bufferName, data) {
        if (!this.dataBuffer[bufferName]) {
            this.dataBuffer[bufferName] = [];
        }

        this.dataBuffer[bufferName].push(data);

        // Maintain buffer size
        if (this.dataBuffer[bufferName].length > this.bufferSize) {
            this.dataBuffer[bufferName] = this.dataBuffer[bufferName].slice(-this.bufferSize);
        }
    }

    // Save buffer data to disk
    async saveBufferToDisk() {
        try {
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            for (const [bufferName, data] of Object.entries(this.dataBuffer)) {
                if (data.length === 0) continue;

                const filename = `${bufferName}_${timestamp}.json`;
                const filepath = path.join(this.dataDirectory, filename);
                
                // Load existing data if file exists
                let existingData = [];
                try {
                    const fileContent = await fs.readFile(filepath, 'utf8');
                    existingData = JSON.parse(fileContent);
                } catch (error) {
                    // File doesn't exist or is empty, start fresh
                }

                // Append new data
                const combinedData = [...existingData, ...data];
                
                // Save to disk
                await fs.writeFile(filepath, JSON.stringify(combinedData, null, 2));
            }

            // Clear buffers after saving
            Object.keys(this.dataBuffer).forEach(key => {
                this.dataBuffer[key] = [];
            });

            console.log(`💾 Data saved to disk at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('❌ Error saving data to disk:', error);
        }
    }

    // Analytics and data retrieval methods
    async getHistoricalData(dataType, startDate, endDate) {
        try {
            const files = await fs.readdir(this.dataDirectory);
            const relevantFiles = files.filter(file => 
                file.startsWith(dataType) && 
                file.endsWith('.json')
            );

            let combinedData = [];
            
            for (const file of relevantFiles) {
                const filepath = path.join(this.dataDirectory, file);
                const fileContent = await fs.readFile(filepath, 'utf8');
                const data = JSON.parse(fileContent);
                
                // Filter by date range if provided
                const filteredData = data.filter(item => {
                    const itemDate = new Date(item.timestamp);
                    const start = startDate ? new Date(startDate) : new Date(0);
                    const end = endDate ? new Date(endDate) : new Date();
                    return itemDate >= start && itemDate <= end;
                });

                combinedData = [...combinedData, ...filteredData];
            }

            return combinedData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error('❌ Error retrieving historical data:', error);
            return [];
        }
    }

    // Performance analytics
    async generatePerformanceReport() {
        const trades = await this.getHistoricalData('trades');
        const signals = await this.getHistoricalData('signals');
        const mlPredictions = await this.getHistoricalData('mlPredictions');

        if (trades.length === 0) {
            return { message: 'No trade data available for analysis' };
        }

        const report = {
            summary: this.calculateTradingSummary(trades),
            timeAnalysis: this.analyzeTimeBasedPerformance(trades),
            signalAnalysis: this.analyzeSignalEffectiveness(trades, signals),
            mlAnalysis: this.analyzeMLPerformance(trades, mlPredictions),
            recommendations: this.generateRecommendations(trades)
        };

        return report;
    }

    calculateTradingSummary(trades) {
        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl < 0);
        const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
        const winRate = wins.length / trades.length;
        const avgWin = wins.reduce((sum, t) => sum + t.pnl, 0) / Math.max(wins.length, 1);
        const avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0)) / Math.max(losses.length, 1);
        const profitFactor = avgWin / Math.max(avgLoss, 0.01);

        // Calculate Sharpe ratio (simplified)
        const returns = trades.map(t => t.pnl_percentage);
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const returnStdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
        const sharpeRatio = avgReturn / Math.max(returnStdDev, 0.01);

        return {
            totalTrades: trades.length,
            winRate: winRate,
            totalPnL: totalPnL,
            avgWin: avgWin,
            avgLoss: avgLoss,
            profitFactor: profitFactor,
            sharpeRatio: sharpeRatio,
            largestWin: Math.max(...trades.map(t => t.pnl)),
            largestLoss: Math.min(...trades.map(t => t.pnl)),
            avgTradeDuration: trades.reduce((sum, t) => sum + t.duration, 0) / trades.length
        };
    }

    analyzeTimeBasedPerformance(trades) {
        const hourlyStats = {};
        const dailyStats = {};

        trades.forEach(trade => {
            const entryTime = new Date(trade.entry_time);
            const hour = entryTime.getHours();
            const day = entryTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Hourly analysis
            if (!hourlyStats[hour]) {
                hourlyStats[hour] = { trades: 0, pnl: 0, wins: 0 };
            }
            hourlyStats[hour].trades++;
            hourlyStats[hour].pnl += trade.pnl;
            if (trade.pnl > 0) hourlyStats[hour].wins++;

            // Daily analysis
            if (!dailyStats[day]) {
                dailyStats[day] = { trades: 0, pnl: 0, wins: 0 };
            }
            dailyStats[day].trades++;
            dailyStats[day].pnl += trade.pnl;
            if (trade.pnl > 0) dailyStats[day].wins++;
        });

        // Calculate win rates
        Object.keys(hourlyStats).forEach(hour => {
            hourlyStats[hour].winRate = hourlyStats[hour].wins / hourlyStats[hour].trades;
        });
        Object.keys(dailyStats).forEach(day => {
            dailyStats[day].winRate = dailyStats[day].wins / dailyStats[day].trades;
        });

        return { hourlyStats, dailyStats };
    }

    // Helper methods for calculations
    calculateVolatility(data) {
        // Simple volatility calculation based on price range
        const high = Math.max(data.price, data.bid, data.ask);
        const low = Math.min(data.price, data.bid, data.ask);
        return (high - low) / data.price;
    }

    determineTrend(data) {
        if (data.ema_fast > data.ema_slow) return 'bullish';
        if (data.ema_fast < data.ema_slow) return 'bearish';
        return 'neutral';
    }

    calculateMomentum(data) {
        // Simple momentum based on RSI
        if (data.rsi > 70) return 'overbought';
        if (data.rsi < 30) return 'oversold';
        if (data.rsi > 50) return 'bullish';
        return 'bearish';
    }

    analyzeSignalEffectiveness(trades, signals) {
        // Analyze which signals led to profitable trades
        const signalPerformance = {};

        trades.forEach(trade => {
            const entrySignal = trade.entry_signal;
            if (!entrySignal) return;

            const signalKey = `${entrySignal.type}_${entrySignal.strength}_${entrySignal.confidence}`;
            
            if (!signalPerformance[signalKey]) {
                signalPerformance[signalKey] = {
                    trades: 0,
                    wins: 0,
                    totalPnL: 0,
                    avgPnL: 0,
                    winRate: 0
                };
            }

            signalPerformance[signalKey].trades++;
            signalPerformance[signalKey].totalPnL += trade.pnl;
            if (trade.pnl > 0) signalPerformance[signalKey].wins++;
        });

        // Calculate statistics
        Object.keys(signalPerformance).forEach(key => {
            const stats = signalPerformance[key];
            stats.avgPnL = stats.totalPnL / stats.trades;
            stats.winRate = stats.wins / stats.trades;
        });

        return signalPerformance;
    }

    analyzeMLPerformance(trades, mlPredictions) {
        // Analyze ML prediction accuracy
        let correctPredictions = 0;
        let totalPredictions = 0;

        trades.forEach(trade => {
            // Find ML prediction closest to trade entry time
            const entryTime = new Date(trade.entry_time);
            const relevantPrediction = mlPredictions.find(pred => {
                const predTime = new Date(pred.timestamp);
                return Math.abs(predTime - entryTime) < 60000; // Within 1 minute
            });

            if (relevantPrediction) {
                totalPredictions++;
                
                const predictedDirection = relevantPrediction.predictions.long_probability > 
                                         relevantPrediction.predictions.short_probability ? 'LONG' : 'SHORT';
                
                const tradeWasSuccessful = trade.pnl > 0;
                const predictionWasCorrect = (predictedDirection === trade.direction && tradeWasSuccessful) ||
                                           (predictedDirection !== trade.direction && !tradeWasSuccessful);
                
                if (predictionWasCorrect) correctPredictions++;
            }
        });

        const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

        return {
            totalPredictions,
            correctPredictions,
            accuracy,
            mlEffectiveness: accuracy > 0.5 ? 'Positive' : 'Needs Improvement'
        };
    }

    generateRecommendations(trades) {
        const recommendations = [];
        const summary = this.calculateTradingSummary(trades);

        if (summary.winRate < 0.5) {
            recommendations.push({
                type: 'Win Rate',
                priority: 'High',
                message: 'Win rate below 50%. Consider tightening entry criteria or improving signal quality.',
                metric: `Current: ${(summary.winRate * 100).toFixed(1)}%`
            });
        }

        if (summary.profitFactor < 1.2) {
            recommendations.push({
                type: 'Profit Factor',
                priority: 'High',
                message: 'Low profit factor. Consider optimizing risk/reward ratio.',
                metric: `Current: ${summary.profitFactor.toFixed(2)}`
            });
        }

        if (summary.sharpeRatio < 1.0) {
            recommendations.push({
                type: 'Risk-Adjusted Returns',
                priority: 'Medium',
                message: 'Low Sharpe ratio indicates poor risk-adjusted returns.',
                metric: `Current: ${summary.sharpeRatio.toFixed(2)}`
            });
        }

        return recommendations;
    }
}

module.exports = DataCollector; 