const PatternRecognition = require('../src/core/pattern-recognition');

describe('PatternRecognition', () => {
    let patternRecognition;
    let mockMarketData;

    beforeEach(() => {
        patternRecognition = new PatternRecognition();
        mockMarketData = {
            price: 100,
            rsi: 50,
            emaAlignment: 0,
            atr: 2,
            ema5: 100,
            ema8: 99.5,
            ema13: 99,
            ema21: 98.5,
            ema50: 98,
            adx: 25,
            volume: 1000
        };
    });

    describe('initialization', () => {
        it('should initialize successfully', async () => {
            const instance = await patternRecognition.initialize();
            expect(instance).toBe(patternRecognition);
            expect(instance.patternHistory).toEqual([]);
            expect(instance.regimeHistory).toEqual([]);
            expect(instance.momentumHistory).toEqual([]);
        });
    });

    describe('pattern analysis', () => {
        it('should detect mean reversion pattern for oversold conditions', async () => {
            mockMarketData.rsi = 25;
            mockMarketData.emaAlignment = -25;

            const pattern = await patternRecognition.analyzePattern(mockMarketData);
            expect(pattern.type).toBe('MEAN_REVERSION');
            expect(pattern.entryBias).toBe('LONG');
            expect(pattern.strength).toBeGreaterThan(0);
        });

        it('should detect momentum continuation pattern', async () => {
            mockMarketData.emaAlignment = 35;
            mockMarketData.rsi = 55;

            const pattern = await patternRecognition.analyzePattern(mockMarketData);
            expect(pattern.type).toBe('MOMENTUM_CONTINUATION');
            expect(pattern.strength).toBeGreaterThan(0);
        });

        it('should detect volatility breakout pattern', async () => {
            mockMarketData.atr = 10;
            mockMarketData.emaAlignment = 15;

            const pattern = await patternRecognition.analyzePattern(mockMarketData);
            expect(pattern.type).toBe('VOLATILITY_BREAKOUT');
            expect(pattern.strength).toBeGreaterThan(0);
        });

        it('should detect low volatility squeeze pattern', async () => {
            mockMarketData.atr = 0.2;
            mockMarketData.emaAlignment = 5;

            const pattern = await patternRecognition.analyzePattern(mockMarketData);
            expect(pattern.type).toBe('LOW_VOLATILITY_SQUEEZE');
            expect(pattern.strength).toBeGreaterThan(0);
        });

        it('should return NO_PATTERN when no patterns match', async () => {
            mockMarketData.rsi = 50;
            mockMarketData.emaAlignment = 0;
            mockMarketData.atr = 1;

            const pattern = await patternRecognition.analyzePattern(mockMarketData);
            expect(pattern.type).toBe('NO_PATTERN');
            expect(pattern.strength).toBe(0);
        });

        it('should maintain pattern history within maxHistorySize', async () => {
            for (let i = 0; i < 60; i++) {
                await patternRecognition.analyzePattern(mockMarketData);
            }
            expect(patternRecognition.getPatternHistory().length).toBeLessThanOrEqual(50);
        });
    });

    describe('regime analysis', () => {
        it('should identify trending regime', async () => {
            mockMarketData.emaAlignment = 0.7;
            mockMarketData.adx = 45;

            const regime = await patternRecognition.analyzeRegime(mockMarketData);
            expect(regime.type).toBe('trending');
            expect(regime.strength).toBeGreaterThan(0.5);
        });

        it('should identify ranging regime', async () => {
            mockMarketData.atr = 0.2;
            mockMarketData.ema5 = 100;
            mockMarketData.ema50 = 99.8;

            const regime = await patternRecognition.analyzeRegime(mockMarketData);
            expect(regime.type).toBe('ranging');
            expect(regime.stability).toBeGreaterThanOrEqual(0);
            expect(regime.stability).toBeLessThanOrEqual(1);
        });

        it('should identify volatile regime', async () => {
            mockMarketData.atr = 5;

            const regime = await patternRecognition.analyzeRegime(mockMarketData);
            expect(regime.type).toBe('volatile');
            expect(regime.strength).toBeGreaterThan(0.5);
        });

        it('should maintain regime history within maxHistorySize', async () => {
            for (let i = 0; i < 60; i++) {
                await patternRecognition.analyzeRegime(mockMarketData);
            }
            expect(patternRecognition.getRegimeHistory().length).toBeLessThanOrEqual(50);
        });
    });

    describe('momentum analysis', () => {
        it('should calculate momentum correctly', () => {
            mockMarketData.rsi = 70;
            mockMarketData.ema5 = 102;
            mockMarketData.ema21 = 98;

            const momentum = patternRecognition.calculateMomentum(mockMarketData);
            expect(momentum.value).toBeGreaterThan(0);
            expect(momentum.components).toHaveProperty('rsi');
            expect(momentum.components).toHaveProperty('ema');
        });

        it('should classify momentum strength correctly', () => {
            mockMarketData.rsi = 80;
            mockMarketData.ema5 = 105;
            mockMarketData.ema21 = 95;

            const momentum = patternRecognition.calculateMomentum(mockMarketData);
            expect(['strong', 'moderate', 'weak']).toContain(momentum.classification);
        });

        it('should handle missing indicator data gracefully', () => {
            delete mockMarketData.ema5;
            delete mockMarketData.ema21;

            const momentum = patternRecognition.calculateMomentum(mockMarketData);
            expect(momentum.value).toBeDefined();
            expect(momentum.components.ema).toBe(0.5);
        });

        it('should maintain momentum history within maxHistorySize', () => {
            for (let i = 0; i < 60; i++) {
                patternRecognition.calculateMomentum(mockMarketData);
            }
            expect(patternRecognition.getMomentumHistory().length).toBeLessThanOrEqual(50);
        });
    });

    describe('helper methods', () => {
        it('should calculate EMA alignment correctly', () => {
            const alignment = patternRecognition.calculateEMAAlignment(mockMarketData);
            expect(alignment).toBeGreaterThanOrEqual(0);
            expect(alignment).toBeLessThanOrEqual(1);
        });

        it('should calculate trend strength correctly', () => {
            const strength = patternRecognition.calculateTrendStrength(mockMarketData);
            expect(strength).toBeGreaterThanOrEqual(0);
            expect(strength).toBeLessThanOrEqual(1);
        });

        it('should calculate volatility state correctly', () => {
            const volatility = patternRecognition.calculateVolatilityState(mockMarketData);
            expect(volatility).toBeGreaterThanOrEqual(0);
            expect(volatility).toBeLessThanOrEqual(1);
        });

        it('should calculate regime stability correctly', () => {
            // Add some regime history
            for (let i = 0; i < 5; i++) {
                patternRecognition.regimeHistory.push({
                    timestamp: Date.now(),
                    regime: { type: 'trending', strength: 0.8 }
                });
            }

            const stability = patternRecognition.calculateRegimeStability();
            expect(stability).toBeGreaterThanOrEqual(0);
            expect(stability).toBeLessThanOrEqual(1);
        });

        it('should estimate regime duration correctly', () => {
            const duration = patternRecognition.estimateRegimeDuration('trending');
            expect(duration).toBe(45);
        });
    });

    describe('error handling', () => {
        it('should handle pattern analysis errors gracefully', async () => {
            const pattern = await patternRecognition.analyzePattern({});
            expect(pattern.type).toBe('NO_PATTERN');
            expect(pattern.strength).toBe(0);
        });

        it('should handle regime analysis errors gracefully', async () => {
            const regime = await patternRecognition.analyzeRegime({});
            expect(regime.type).toBe('unknown');
            expect(regime.confidence).toBe(0.3);
        });

        it('should handle momentum calculation errors gracefully', () => {
            const momentum = patternRecognition.calculateMomentum({});
            expect(momentum.value).toBe(0.5);
            expect(momentum.classification).toBe('moderate');
        });
    });
}); 