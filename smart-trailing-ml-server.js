// 🧠 Smart Trailing Stop ML Server Enhancement
// Add to ml-server.js

class SmartTrailingManager {
    constructor() {
        this.regimeAnalyzer = new MarketRegimeAnalyzer();
        this.volatilityPredictor = new VolatilityPredictor();
        this.srAnalyzer = new SupportResistanceAI();
        this.trailingAlgorithms = new TrailingAlgorithmSuite();
        this.activePositions = new Map(); // Track positions for trailing
        this.trailingHistory = []; // Performance tracking
    }

    // Main entry point for smart trailing
    async calculateOptimalTrailingStop(positionData, marketData) {
        try {
            // Multi-factor analysis
            const regime = await this.regimeAnalyzer.analyzeRegime(marketData);
            const volatility = await this.volatilityPredictor.predictVolatility(marketData);
            const levels = await this.srAnalyzer.findDynamicLevels(marketData);
            
            // Algorithm selection based on market conditions
            const selectedAlgorithm = this.selectBestAlgorithm(regime, volatility, levels);
            
            // Calculate optimal stop
            const trailingStop = await selectedAlgorithm.calculate({
                position: positionData,
                marketData,
                regime,
                volatility,
                levels
            });
            
            // Validate and apply risk controls
            const validatedStop = this.validateTrailingStop(trailingStop, positionData);
            
            // Track performance
            this.recordTrailingDecision(validatedStop, positionData);
            
            return validatedStop;
        } catch (error) {
            console.error('Error calculating smart trailing stop:', error);
            return this.getFallbackTrailingStop(positionData, marketData);
        }
    }

    selectBestAlgorithm(regime, volatility, levels) {
        // AI-driven algorithm selection
        const factors = {
            regimeStrength: regime.strength,
            volatilityLevel: volatility.nextPeriodVolatility,
            nearSupport: levels.proximityToLevel < 0.01,
            trendDirection: regime.regime.includes('trending')
        };

        // Decision tree for algorithm selection
        if (factors.trendDirection && factors.regimeStrength > 0.7) {
            return this.trailingAlgorithms.trendStrengthTrailing;
        } else if (factors.nearSupport && levels.levelStrength[0] > 0.8) {
            return this.trailingAlgorithms.supportResistanceTrailing;
        } else if (factors.volatilityLevel > 1.5) {
            return this.trailingAlgorithms.adaptiveATRTrailing;
        } else {
            return this.trailingAlgorithms.momentumTrailing;
        }
    }

    validateTrailingStop(trailingStop, positionData) {
        const currentStop = this.activePositions.get(positionData.id)?.currentStop || 0;
        const maxMovement = positionData.atr * 0.5; // Max 0.5 ATR movement per update
        
        // Ensure stop only moves in favorable direction
        if (positionData.direction === 'long') {
            const maxNewStop = Math.min(
                trailingStop.stopPrice,
                currentStop + maxMovement
            );
            trailingStop.stopPrice = Math.max(maxNewStop, currentStop);
        } else {
            const minNewStop = Math.max(
                trailingStop.stopPrice,
                currentStop - maxMovement
            );
            trailingStop.stopPrice = Math.min(minNewStop, currentStop);
        }

        return trailingStop;
    }
}

class MarketRegimeAnalyzer {
    async analyzeRegime(marketData) {
        const { price, emas, volume, atr } = marketData;
        
        // EMA alignment analysis
        const emaAlignment = this.calculateEMAAlignment(emas);
        const trendStrength = this.calculateTrendStrength(emas, price);
        const volatilityRatio = atr / price;
        
        let regime, strength, stability;
        
        // Regime classification logic
        if (emaAlignment > 0.8 && trendStrength > 0.7) {
            regime = price > emas.ema50 ? 'trending_bullish' : 'trending_bearish';
            strength = Math.min(emaAlignment, trendStrength);
            stability = this.calculateStability(marketData.priceHistory);
        } else if (volatilityRatio > 0.02) {
            regime = 'volatile';
            strength = volatilityRatio * 10; // Scale to 0-1
            stability = 0.3; // Volatile markets are inherently unstable
        } else {
            regime = 'ranging';
            strength = 1 - Math.abs(emaAlignment - 0.5) * 2; // Stronger when EMAs are flat
            stability = 0.8; // Ranging markets are more stable
        }
        
        return {
            regime,
            strength: Math.max(0, Math.min(1, strength)),
            stability: Math.max(0, Math.min(1, stability)),
            expectedDuration: this.predictRegimeDuration(regime, strength),
            confidence: this.calculateConfidence(emaAlignment, trendStrength, volatilityRatio)
        };
    }

    calculateEMAAlignment(emas) {
        const order = [emas.ema5, emas.ema8, emas.ema13, emas.ema21, emas.ema50];
        let alignedPairs = 0;
        
        for (let i = 0; i < order.length - 1; i++) {
            if (order[i] > order[i + 1] || order[i] < order[i + 1]) {
                alignedPairs++;
            }
        }
        
        return alignedPairs / (order.length - 1);
    }

    calculateTrendStrength(emas, currentPrice) {
        const emaSpread = Math.abs(emas.ema5 - emas.ema50) / currentPrice;
        return Math.min(1, emaSpread * 100); // Scale to 0-1
    }

    predictRegimeDuration(regime, strength) {
        // Simple heuristic - stronger regimes last longer
        const baseMinutes = {
            'trending_bullish': 45,
            'trending_bearish': 45,
            'ranging': 30,
            'volatile': 15
        };
        
        return baseMinutes[regime] * (0.5 + strength);
    }
}

class VolatilityPredictor {
    async predictVolatility(marketData) {
        const { atr, priceHistory, volumeHistory } = marketData;
        
        // Calculate recent volatility trend
        const recentATRs = priceHistory.slice(-20).map((_, i) => 
            this.calculateATR(priceHistory.slice(i, i + 14))
        );
        
        const volatilityTrend = this.calculateTrend(recentATRs);
        const currentATRRatio = atr / marketData.price;
        
        // Predict next period volatility
        const trendAdjustment = volatilityTrend > 0 ? 1.1 : 0.9;
        const nextPeriodVolatility = currentATRRatio * trendAdjustment;
        
        // Breakout probability based on volume and price compression
        const volumeSpike = this.detectVolumeSpike(volumeHistory);
        const priceCompression = this.detectPriceCompression(priceHistory);
        const breakoutProbability = (volumeSpike + priceCompression) / 2;
        
        return {
            nextPeriodVolatility: Math.max(0.5, Math.min(3.0, nextPeriodVolatility * 100)),
            volatilityTrend: volatilityTrend > 0.1 ? 'increasing' : 
                           volatilityTrend < -0.1 ? 'decreasing' : 'stable',
            breakoutProbability: Math.max(0, Math.min(1, breakoutProbability)),
            meanReversionLikelihood: 1 - breakoutProbability // Inverse relationship
        };
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
        return (secondAvg - firstAvg) / firstAvg;
    }

    detectVolumeSpike(volumeHistory) {
        if (volumeHistory.length < 20) return 0;
        const recentVolume = volumeHistory.slice(-5).reduce((a, b) => a + b) / 5;
        const avgVolume = volumeHistory.slice(-20, -5).reduce((a, b) => a + b) / 15;
        return Math.min(1, Math.max(0, (recentVolume / avgVolume - 1) / 2));
    }

    detectPriceCompression(priceHistory) {
        if (priceHistory.length < 20) return 0;
        const recentRange = Math.max(...priceHistory.slice(-10)) - Math.min(...priceHistory.slice(-10));
        const avgRange = priceHistory.slice(-20, -10).reduce((sum, price, i, arr) => {
            if (i === 0) return sum;
            return sum + Math.abs(price - arr[i-1]);
        }, 0) / 9;
        return Math.min(1, Math.max(0, 1 - (recentRange / avgRange)));
    }
}

class SupportResistanceAI {
    async findDynamicLevels(marketData) {
        const { priceHistory, volumeHistory, currentPrice } = marketData;
        
        // Find significant price levels using volume profile
        const volumeProfile = this.calculateVolumeProfile(priceHistory, volumeHistory);
        const pivotPoints = this.findPivotPoints(priceHistory);
        
        // Combine volume-based and pivot-based levels
        const allLevels = [...volumeProfile.significantLevels, ...pivotPoints];
        const clusteredLevels = this.clusterLevels(allLevels, currentPrice * 0.001); // 0.1% clustering
        
        // Classify as support or resistance
        const supportLevels = clusteredLevels.filter(level => level.price < currentPrice);
        const resistanceLevels = clusteredLevels.filter(level => level.price > currentPrice);
        
        // Calculate proximity to nearest level
        const nearestLevel = this.findNearestLevel(clusteredLevels, currentPrice);
        const proximityToLevel = Math.abs(currentPrice - nearestLevel.price) / currentPrice;
        
        return {
            supportLevels: supportLevels.slice(0, 3).map(l => l.price),
            resistanceLevels: resistanceLevels.slice(0, 3).map(l => l.price),
            levelStrength: clusteredLevels.slice(0, 3).map(l => l.strength),
            proximityToLevel,
            levelType: nearestLevel.type
        };
    }

    calculateVolumeProfile(priceHistory, volumeHistory) {
        // Simplified volume profile calculation
        const priceVolumePairs = priceHistory.map((price, i) => ({
            price,
            volume: volumeHistory[i] || 0
        }));
        
        // Group by price levels and sum volume
        const volumeByPrice = new Map();
        priceVolumePairs.forEach(({ price, volume }) => {
            const roundedPrice = Math.round(price * 100) / 100; // Round to nearest cent
            volumeByPrice.set(roundedPrice, (volumeByPrice.get(roundedPrice) || 0) + volume);
        });
        
        // Find high-volume areas
        const sortedByVolume = Array.from(volumeByPrice.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        return {
            significantLevels: sortedByVolume.map(([price, volume]) => ({
                price,
                strength: volume / Math.max(...volumeByPrice.values()),
                type: 'volume_based'
            }))
        };
    }

    findPivotPoints(priceHistory) {
        const pivots = [];
        const lookback = 5;
        
        for (let i = lookback; i < priceHistory.length - lookback; i++) {
            const current = priceHistory[i];
            const leftSide = priceHistory.slice(i - lookback, i);
            const rightSide = priceHistory.slice(i + 1, i + lookback + 1);
            
            // Check for pivot high
            if (leftSide.every(p => p <= current) && rightSide.every(p => p <= current)) {
                pivots.push({ price: current, strength: 0.7, type: 'pivot_high' });
            }
            
            // Check for pivot low
            if (leftSide.every(p => p >= current) && rightSide.every(p => p >= current)) {
                pivots.push({ price: current, strength: 0.7, type: 'pivot_low' });
            }
        }
        
        return pivots;
    }

    clusterLevels(levels, threshold) {
        const clusters = [];
        const sortedLevels = levels.sort((a, b) => a.price - b.price);
        
        for (const level of sortedLevels) {
            const nearbyCluster = clusters.find(cluster => 
                Math.abs(cluster.price - level.price) <= threshold
            );
            
            if (nearbyCluster) {
                // Merge with existing cluster
                nearbyCluster.strength = Math.max(nearbyCluster.strength, level.strength);
                nearbyCluster.price = (nearbyCluster.price + level.price) / 2; // Average price
            } else {
                clusters.push({ ...level });
            }
        }
        
        return clusters.sort((a, b) => b.strength - a.strength);
    }

    findNearestLevel(levels, currentPrice) {
        return levels.reduce((nearest, level) => {
            const distance = Math.abs(level.price - currentPrice);
            const nearestDistance = Math.abs(nearest.price - currentPrice);
            return distance < nearestDistance ? level : nearest;
        });
    }
}

class TrailingAlgorithmSuite {
    constructor() {
        this.adaptiveATRTrailing = new AdaptiveATRTrailing();
        this.trendStrengthTrailing = new TrendStrengthTrailing();
        this.supportResistanceTrailing = new SupportResistanceTrailing();
        this.momentumTrailing = new MomentumTrailing();
    }
}

class AdaptiveATRTrailing {
    async calculate({ position, marketData, volatility }) {
        const baseATRMultiplier = 1.5;
        const volatilityAdjustment = volatility.nextPeriodVolatility / 100;
        const adjustedMultiplier = baseATRMultiplier * volatilityAdjustment;
        
        const stopDistance = marketData.atr * adjustedMultiplier;
        const stopPrice = position.direction === 'long' 
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
        
        return {
            price: stopPrice,
            algorithm: 'adaptive_atr',
            confidence: 0.8,
            reasoning: `ATR-based stop with ${volatilityAdjustment.toFixed(2)}x volatility adjustment`,
            nextUpdateTime: Date.now() + 30000 // 30 seconds
        };
    }
}

class TrendStrengthTrailing {
    async calculate({ position, marketData, regime }) {
        const trendStrength = regime.strength;
        const baseDistance = marketData.atr * 1.2;
        
        // Tighter stops when trend is weakening
        const strengthMultiplier = 0.5 + (trendStrength * 0.8);
        const stopDistance = baseDistance * strengthMultiplier;
        
        const stopPrice = position.direction === 'long'
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
        
        return {
            price: stopPrice,
            algorithm: 'trend_strength',
            confidence: trendStrength,
            reasoning: `Trend-adjusted stop (strength: ${(trendStrength * 100).toFixed(0)}%)`,
            nextUpdateTime: Date.now() + 20000 // 20 seconds
        };
    }
}

class SupportResistanceTrailing {
    async calculate({ position, marketData, levels }) {
        const relevantLevels = position.direction === 'long' 
            ? levels.supportLevels 
            : levels.resistanceLevels;
        
        if (relevantLevels.length === 0) {
            // Fallback to ATR-based
            const stopDistance = marketData.atr * 1.5;
            const stopPrice = position.direction === 'long'
                ? marketData.price - stopDistance
                : marketData.price + stopDistance;
            
            return {
                price: stopPrice,
                algorithm: 'support_resistance_fallback',
                confidence: 0.5,
                reasoning: 'No significant levels found, using ATR fallback',
                nextUpdateTime: Date.now() + 45000
            };
        }
        
        // Use the strongest nearby level
        const targetLevel = relevantLevels[0];
        const buffer = marketData.atr * 0.3; // Small buffer beyond the level
        
        const stopPrice = position.direction === 'long'
            ? targetLevel - buffer
            : targetLevel + buffer;
        
        return {
            price: stopPrice,
            algorithm: 'support_resistance',
            confidence: levels.levelStrength[0],
            reasoning: `Stop placed ${buffer.toFixed(4)} beyond ${position.direction === 'long' ? 'support' : 'resistance'} at ${targetLevel.toFixed(4)}`,
            nextUpdateTime: Date.now() + 60000 // 1 minute
        };
    }
}

class MomentumTrailing {
    async calculate({ position, marketData, volatility }) {
        // Use momentum indicators to adjust trailing
        const momentumFactor = this.calculateMomentum(marketData.priceHistory);
        const baseDistance = marketData.atr * 1.3;
        
        // Accelerate trailing during strong momentum
        const momentumMultiplier = momentumFactor > 0.5 ? 0.8 : 1.2;
        const stopDistance = baseDistance * momentumMultiplier;
        
        const stopPrice = position.direction === 'long'
            ? marketData.price - stopDistance
            : marketData.price + stopDistance;
        
        return {
            price: stopPrice,
            algorithm: 'momentum',
            confidence: Math.abs(momentumFactor),
            reasoning: `Momentum-adjusted trailing (factor: ${momentumFactor.toFixed(2)})`,
            nextUpdateTime: Date.now() + 15000 // 15 seconds
        };
    }

    calculateMomentum(priceHistory) {
        if (priceHistory.length < 10) return 0;
        
        const recent = priceHistory.slice(-5);
        const previous = priceHistory.slice(-10, -5);
        
        const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
        const previousAvg = previous.reduce((a, b) => a + b) / previous.length;
        
        return (recentAvg - previousAvg) / previousAvg;
    }
}

// Export the smart trailing manager
module.exports = { SmartTrailingManager }; 