const { LRUCache } = require('lru-cache');
const logger = require('../utils/logger');

class SmartTrailing {
    constructor() {
        this.initialized = false;
        this.regimeAnalyzer = new MarketRegimeAnalyzer();
        this.volatilityPredictor = new VolatilityPredictor();
        this.srAnalyzer = new SupportResistanceAI();
        this.trailingAlgorithms = new TrailingAlgorithmSuite();
        this.activePositions = new Map(); // Track positions for trailing
        this.trailingHistory = []; // Performance tracking
        this.logger = logger.child({ component: 'SmartTrailing' });
    }

    async initialize() {
        this.initialized = true;
        return this;
    }

    async calculateOptimalTrailingStop(positionData, marketData) {
        try {
            if (!marketData.price) {
                return this.getFallbackTrailingStop(positionData, marketData);
            }

            const startTime = Date.now();
            
            // Handle manual trades with special care
            if (positionData.isManual) {
                // Use adaptive ATR for manual trades by default
                const manualTrailingStop = await this.trailingAlgorithms.adaptiveATRTrailing(
                    positionData,
                    marketData,
                    { volatility: { level: 0.5 }, regime: { type: 'manual' } }
                );
                
                // Ensure we don't move the stop too aggressively for manual trades
                const currentStop = positionData.current_smart_stop || 0;
                if (currentStop > 0) {
                    const maxMove = marketData.atr * 0.5; // Max 0.5 ATR move per update
                    if (positionData.direction === 'LONG') {
                        manualTrailingStop.stopPrice = Math.min(
                            manualTrailingStop.stopPrice,
                            currentStop + maxMove
                        );
                    } else {
                        manualTrailingStop.stopPrice = Math.max(
                            manualTrailingStop.stopPrice,
                            currentStop - maxMove
                        );
                    }
                }
                
                return {
                    stopPrice: manualTrailingStop.stopPrice,
                    algorithm: 'adaptive_atr',
                    confidence: 0.8,
                    reasoning: 'Manual trade using adaptive ATR trailing',
                    metadata: {
                        regime: 'manual',
                        volatility: 'moderate',
                        processingTime: Date.now() - startTime
                    }
                };
            }
            
            // Regular automated trade processing
            const regime = await this.regimeAnalyzer.analyzeRegime(marketData);
            const volatility = await this.volatilityPredictor.predictVolatility(marketData);
            const srLevels = await this.srAnalyzer.findKeyLevels(marketData);
            
            // Select optimal trailing algorithm
            const optimalAlgorithm = this.selectOptimalAlgorithm(regime, volatility, positionData);
            
            // Calculate trailing stop using selected algorithm
            const trailingStop = await this.trailingAlgorithms.calculate(
                optimalAlgorithm, 
                positionData, 
                marketData, 
                { regime, volatility, srLevels }
            );
            
            // Track performance
            this.trackTrailingUpdate(positionData.instrument, trailingStop, optimalAlgorithm);
            
            const processingTime = Date.now() - startTime;
            this.logger.info('Smart trailing calculated', {
                instrument: positionData.instrument,
                algorithm: optimalAlgorithm,
                currentStop: trailingStop.stopPrice,
                confidence: trailingStop.confidence,
                processingTime
            });
            
            return {
                stopPrice: trailingStop.stopPrice,
                algorithm: optimalAlgorithm,
                confidence: trailingStop.confidence,
                reasoning: trailingStop.reasoning,
                metadata: {
                    regime: regime.type,
                    volatility: volatility.level,
                    processingTime
                }
            };
            
        } catch (error) {
            this.logger.error('Smart trailing calculation failed', { error: error.message });
            return this.getFallbackTrailingStop(positionData, marketData);
        }
    }
    
    selectOptimalAlgorithm(regime, volatility, positionData) {
        // AI-driven algorithm selection
        if (regime.type === 'trending' && regime.strength > 0.7) {
            return volatility.level > 0.6 ? 'momentum_adaptive' : 'trend_strength';
        } else if (regime.type === 'ranging') {
            return 'support_resistance';
        } else if (volatility.level > 0.8) {
            return 'adaptive_atr';
        } else if (positionData.profitPercent > 2.0) {
            return 'profit_protection';
        }
        return 'adaptive_atr'; // Default
    }
    
    trackTrailingUpdate(instrument, trailingStop, algorithm) {
        this.trailingHistory.push({
            timestamp: new Date(),
            instrument,
            stopPrice: trailingStop.stopPrice,
            algorithm,
            confidence: trailingStop.confidence
        });
        
        // Keep only last 1000 updates
        if (this.trailingHistory.length > 1000) {
            this.trailingHistory.shift();
        }
    }
    
    getFallbackTrailingStop(positionData, marketData) {
        // Simple ATR-based fallback
        const atrMultiplier = positionData.direction === 'long' ? 1.5 : 1.5;
        const fallbackStop = positionData.direction === 'long' 
            ? marketData.price - (marketData.atr * atrMultiplier)
            : marketData.price + (marketData.atr * atrMultiplier);
            
        return {
            stopPrice: fallbackStop,
            algorithm: 'fallback_atr',
            confidence: 0.5,
            reasoning: 'Fallback ATR-based stop due to calculation error'
        };
    }
}

class MarketRegimeAnalyzer {
    constructor() {
        this.regimeHistory = [];
        this.emaCache = new LRUCache({ max: 100 });
    }
    
    async analyzeRegime(marketData) {
        try {
            // EMA trend analysis
            const emaAlignment = this.calculateEMAAlignment(marketData);
            const trendStrength = this.calculateTrendStrength(marketData);
            const volatilityState = this.calculateVolatilityState(marketData);
            
            // Determine regime type
            let regimeType = 'transitional';
            let strength = 0.5;
            
            if (trendStrength > 0.7 && volatilityState < 0.7) {
                regimeType = 'trending';
                strength = Math.min(0.95, trendStrength);
            } else if (volatilityState < 0.4 && emaAlignment < 0.4 && trendStrength < 0.4) {
                regimeType = 'ranging';
                strength = 0.8 - volatilityState;
            } else if (volatilityState > 0.8) {
                regimeType = 'volatile';
                strength = volatilityState;
            }
            
            const regime = {
                type: regimeType,
                strength: strength,
                stability: this.calculateRegimeStability(),
                expectedDuration: this.estimateDuration(regimeType),
                confidence: Math.min(0.95, strength * 0.9 + 0.1)
            };
            
            this.regimeHistory.push({ timestamp: Date.now(), regime });
            if (this.regimeHistory.length > 50) this.regimeHistory.shift();
            
            return regime;
            
        } catch (error) {
            logger.error('Regime analysis failed', { error: error.message });
            return { type: 'unknown', strength: 0.5, stability: 0.5, expectedDuration: 15, confidence: 0.3 };
        }
    }
    
    calculateEMAAlignment(marketData) {
        // Calculate EMA alignment for ranging market detection
        const { ema5, ema8, ema13, ema21, ema50 } = marketData;
        if (!ema5 || !ema50) return 0;
        
        // Calculate average distance between EMAs
        const distances = [
            Math.abs(ema5 - ema8),
            Math.abs(ema8 - ema13),
            Math.abs(ema13 - ema21),
            Math.abs(ema21 - ema50)
        ];
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const priceRange = Math.abs(ema5 - ema50);
        
        // Normalize distances relative to price
        const normalizedDistance = avgDistance / marketData.price;
        const normalizedRange = priceRange / marketData.price;
        
        // Calculate alignment score
        const alignmentScore = normalizedRange < 0.001 ? 0 : normalizedDistance / normalizedRange;
        return Math.min(1, alignmentScore);
    }
    
    calculateTrendStrength(marketData) {
        if (!marketData.adx) return 0.5;
        return Math.min(1.0, marketData.adx / 50);
    }
    
    calculateVolatilityState(marketData) {
        if (!marketData.atr || !marketData.price) return 0.5;
        const atrPercent = (marketData.atr / marketData.price) * 100;
        return Math.min(1.0, atrPercent / 3.0); // Scale 0-3% ATR to 0-1
    }
    
    calculateRegimeStability() {
        if (this.regimeHistory.length < 5) return 0.5;
        
        const recent = this.regimeHistory.slice(-5);
        const regimeTypes = recent.map(r => r.regime.type);
        const uniqueTypes = new Set(regimeTypes);
        
        return 1.0 - (uniqueTypes.size - 1) / 4; // More stable = fewer regime changes
    }
    
    estimateDuration(regimeType) {
        // Estimated duration in minutes
        switch (regimeType) {
            case 'trending': return 45;
            case 'ranging': return 30;
            case 'volatile': return 15;
            default: return 20;
        }
    }
}

class VolatilityPredictor {
    constructor() {
        this.volatilityHistory = [];
        this.predictionCache = new LRUCache({ max: 50 });
    }
    
    async predictVolatility(marketData) {
        try {
            const cacheKey = `vol_${marketData.instrument}_${Math.floor(Date.now() / 60000)}`;
            const cached = this.predictionCache.get(cacheKey);
            if (cached) return cached;
            
            // Calculate current volatility metrics
            const currentVol = this.calculateCurrentVolatility(marketData);
            const historicalVol = this.calculateHistoricalVolatility();
            const intraday = this.calculateIntradayVolatility(marketData);
            
            // Predict future volatility using ensemble
            const prediction = {
                level: Math.min(1.0, (currentVol + historicalVol + intraday) / 3),
                trend: this.predictVolatilityTrend(),
                confidence: this.calculateVolatilityConfidence(),
                timeHorizon: 30 // minutes
            };
            
            this.predictionCache.set(cacheKey, prediction);
            this.volatilityHistory.push({ timestamp: Date.now(), volatility: currentVol });
            if (this.volatilityHistory.length > 100) this.volatilityHistory.shift();
            
            return prediction;
            
        } catch (error) {
            logger.error('Volatility prediction failed', { error: error.message });
            return { level: 0.5, trend: 'stable', confidence: 0.3, timeHorizon: 30 };
        }
    }
    
    calculateCurrentVolatility(marketData) {
        if (!marketData.atr || !marketData.price) return 0.5;
        return Math.min(1.0, (marketData.atr / marketData.price) * 20); // Scale ATR%
    }
    
    calculateHistoricalVolatility() {
        if (this.volatilityHistory.length < 10) return 0.5;
        
        const recent = this.volatilityHistory.slice(-20);
        const avg = recent.reduce((sum, v) => sum + v.volatility, 0) / recent.length;
        return Math.min(1.0, avg);
    }
    
    calculateIntradayVolatility(marketData) {
        // Time-of-day volatility adjustment
        const hour = new Date().getHours();
        const volatilityMultipliers = {
            9: 1.2, 10: 1.1, 11: 0.9, 12: 0.8, 13: 0.9, 14: 1.0, 15: 1.3, 16: 1.1
        };
        
        const multiplier = volatilityMultipliers[hour] || 1.0;
        return Math.min(1.0, this.calculateCurrentVolatility(marketData) * multiplier);
    }
    
    predictVolatilityTrend() {
        if (this.volatilityHistory.length < 5) return 'stable';
        
        const recent = this.volatilityHistory.slice(-5);
        const trend = recent[recent.length - 1].volatility - recent[0].volatility;
        
        if (trend > 0.1) return 'increasing';
        if (trend < -0.1) return 'decreasing';
        return 'stable';
    }
    
    calculateVolatilityConfidence() {
        return Math.min(0.9, 0.5 + (this.volatilityHistory.length / 100) * 0.4);
    }
}

class SupportResistanceAI {
    constructor() {
        this.levelCache = new LRUCache({ max: 20 });
        this.priceHistory = [];
    }
    
    async findKeyLevels(marketData) {
        try {
            const cacheKey = `sr_${marketData.instrument}_${Math.floor(marketData.price / 0.25)}`;
            const cached = this.levelCache.get(cacheKey);
            if (cached) return cached;
            
            // Simplified S/R calculation using price clustering
            const currentPrice = marketData.price;
            const atr = marketData.atr || (currentPrice * 0.01);
            
            const levels = {
                support: marketData.atr ? [
                    currentPrice - atr * 1.0,
                    currentPrice - atr * 2.0,
                    currentPrice - atr * 3.0
                ] : [currentPrice - (currentPrice * 0.01)],
                resistance: marketData.atr ? [
                    currentPrice + atr * 1.0,
                    currentPrice + atr * 2.0,
                    currentPrice + atr * 3.0
                ] : [currentPrice + (currentPrice * 0.01)],
                strength: this.calculateLevelStrength(currentPrice),
                confidence: 0.7
            };
            
            this.levelCache.set(cacheKey, levels);
            return levels;
            
        } catch (error) {
            logger.error('S/R analysis failed', { error: error.message });
            const atr = marketData.atr || (marketData.price * 0.01);
            return {
                support: [marketData.price - atr],
                resistance: [marketData.price + atr],
                strength: 0.5,
                confidence: 0.3
            };
        }
    }
    
    calculateLevelStrength(price) {
        // Simplified strength calculation
        return 0.7; // Would be enhanced with actual price history analysis
    }
}

class TrailingAlgorithmSuite {
    constructor() {
        this.algorithms = {
            adaptive_atr: this.adaptiveATRTrailing.bind(this),
            trend_strength: this.trendStrengthTrailing.bind(this),
            support_resistance: this.supportResistanceTrailing.bind(this),
            momentum_adaptive: this.momentumAdaptiveTrailing.bind(this),
            profit_protection: this.profitProtectionTrailing.bind(this)
        };
    }
    
    async calculate(algorithmName, positionData, marketData, context) {
        const algorithm = this.algorithms[algorithmName];
        if (!algorithm) {
            throw new Error(`Unknown trailing algorithm: ${algorithmName}`);
        }
        
        return await algorithm(positionData, marketData, context);
    }
    
    async adaptiveATRTrailing(positionData, marketData, context) {
        const { volatility } = context;
        const baseMultiplier = 1.5;
        const volatilityMultiplier = 0.8 + (volatility.level * 0.8); // 0.8 - 1.6x
        const atrMultiplier = baseMultiplier * volatilityMultiplier;
        
        const stopDistance = marketData.atr * atrMultiplier;
        const stopPrice = positionData.direction === 'long'
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
            
        return {
            stopPrice: Math.round(stopPrice * 100) / 100,
            confidence: 0.8,
            reasoning: `Adaptive ATR (${atrMultiplier.toFixed(2)}x) based on volatility level ${(volatility.level * 100).toFixed(0)}%`
        };
    }
    
    async trendStrengthTrailing(positionData, marketData, context) {
        const { regime } = context;
        const baseMultiplier = 1.2;
        const trendMultiplier = 0.7 + (regime.strength * 0.6); // 0.7 - 1.3x
        const atrMultiplier = baseMultiplier * trendMultiplier;
        
        const stopDistance = marketData.atr * atrMultiplier;
        const stopPrice = positionData.direction === 'long'
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
            
        return {
            stopPrice: Math.round(stopPrice * 100) / 100,
            confidence: regime.confidence,
            reasoning: `Trend strength trailing (${atrMultiplier.toFixed(2)}x) for ${regime.type} market`
        };
    }
    
    async supportResistanceTrailing(positionData, marketData, context) {
        const { srLevels } = context;
        const isLong = positionData.direction === 'long';
        
        // Find nearest support/resistance level
        const relevantLevels = isLong ? srLevels.support : srLevels.resistance;
        const currentPrice = marketData.price;
        
        let targetLevel = relevantLevels[0];
        for (const level of relevantLevels) {
            if (isLong && level < currentPrice && level > targetLevel) {
                targetLevel = level;
            } else if (!isLong && level > currentPrice && level < targetLevel) {
                targetLevel = level;
            }
        }
        
        // Add small buffer
        const buffer = marketData.atr * 0.3;
        const stopPrice = isLong ? targetLevel - buffer : targetLevel + buffer;
        
        return {
            stopPrice: Math.round(stopPrice * 100) / 100,
            confidence: srLevels.confidence,
            reasoning: `S/R level trailing at ${targetLevel.toFixed(2)} with ${buffer.toFixed(2)} buffer`
        };
    }
    
    async momentumAdaptiveTrailing(positionData, marketData, context) {
        const { regime, volatility } = context;
        const momentum = this.calculateMomentum(marketData);
        
        let atrMultiplier = 1.0;
        if (momentum > 0.7) atrMultiplier = 0.8; // Tight stops in strong momentum
        else if (momentum < 0.3) atrMultiplier = 2.0; // Loose stops in weak momentum
        else atrMultiplier = 1.5; // Normal stops
        
        // Adjust for volatility
        atrMultiplier *= (0.8 + volatility.level * 0.4);
        
        const stopDistance = marketData.atr * atrMultiplier;
        const stopPrice = positionData.direction === 'long'
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
            
        return {
            stopPrice: Math.round(stopPrice * 100) / 100,
            confidence: 0.85,
            reasoning: `Momentum adaptive (${atrMultiplier.toFixed(2)}x) for momentum ${(momentum * 100).toFixed(0)}%`
        };
    }
    
    async profitProtectionTrailing(positionData, marketData, context) {
        const profitPercent = positionData.profitPercent || 0;
        
        // Tighten stops as profit increases
        let atrMultiplier = 1.5;
        if (profitPercent > 3.0) atrMultiplier = 0.8;
        else if (profitPercent > 2.0) atrMultiplier = 1.0;
        else if (profitPercent > 1.0) atrMultiplier = 1.2;
        
        const stopDistance = marketData.atr * atrMultiplier;
        const stopPrice = positionData.direction === 'long'
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
            
        return {
            stopPrice: Math.round(stopPrice * 100) / 100,
            confidence: 0.9,
            reasoning: `Profit protection (${atrMultiplier.toFixed(2)}x) for ${profitPercent.toFixed(1)}% profit`
        };
    }
    
    calculateMomentum(marketData) {
        // Simplified momentum calculation using RSI and price action
        const rsi = marketData.rsi || 50;
        const rsiMomentum = Math.abs(rsi - 50) / 50; // 0-1 scale
        
        // Add EMA momentum if available
        let emaMomentum = 0.5;
        if (marketData.ema5 && marketData.ema21) {
            const emaSpread = Math.abs(marketData.ema5 - marketData.ema21) / marketData.price;
            emaMomentum = Math.min(1.0, emaSpread * 20);
        }
        
        return (rsiMomentum + emaMomentum) / 2;
    }
}

module.exports = SmartTrailing;
