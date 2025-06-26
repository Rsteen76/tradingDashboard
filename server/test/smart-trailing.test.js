const {
    SmartTrailingManager,
    MarketRegimeAnalyzer,
    VolatilityPredictor,
    SupportResistanceAI,
    TrailingAlgorithmSuite
} = require('../src/core/smart-trailing');

describe('Smart Trailing System', () => {
    let smartTrailing;
    let mockMarketData;
    let mockPositionData;

    beforeEach(() => {
        smartTrailing = new SmartTrailingManager();
        mockMarketData = {
            instrument: 'BTC-USD',
            price: 50000,
            atr: 500,
            rsi: 55,
            adx: 25,
            ema5: 50100,
            ema8: 50050,
            ema13: 49950,
            ema21: 49900,
            ema50: 49800,
            volume: 100,
            bid: 49990,
            ask: 50010
        };
        mockPositionData = {
            instrument: 'BTC-USD',
            direction: 'long',
            profitPercent: 1.5
        };
    });

    describe('SmartTrailingManager', () => {
        test('should calculate optimal trailing stop', async () => {
            const result = await smartTrailing.calculateOptimalTrailingStop(mockPositionData, mockMarketData);
            expect(result).toHaveProperty('stopPrice');
            expect(result).toHaveProperty('algorithm');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('reasoning');
            expect(result).toHaveProperty('metadata');
            expect(result.metadata).toHaveProperty('regime');
            expect(result.metadata).toHaveProperty('volatility');
        });

        test('should handle errors gracefully', async () => {
            const badMarketData = { ...mockMarketData, price: undefined };
            const result = await smartTrailing.calculateOptimalTrailingStop(mockPositionData, badMarketData);
            expect(result.algorithm).toBe('fallback_atr');
            expect(result.confidence).toBe(0.5);
        });
    });

    describe('MarketRegimeAnalyzer', () => {
        let regimeAnalyzer;

        beforeEach(() => {
            regimeAnalyzer = new MarketRegimeAnalyzer();
        });

        test('should identify trending market', async () => {
            const trendingMarketData = {
                ...mockMarketData,
                adx: 45,
                ema5: 51000,
                ema8: 50800,
                ema13: 50600,
                ema21: 50400,
                ema50: 50000
            };
            const regime = await regimeAnalyzer.analyzeRegime(trendingMarketData);
            expect(regime.type).toBe('trending');
            expect(regime.strength).toBeGreaterThan(0.7);
        });

        test('should identify ranging market', async () => {
            const rangingMarketData = {
                ...mockMarketData,
                adx: 15,
                atr: 100,
                ema5: 50000,
                ema8: 50020,
                ema13: 49980,
                ema21: 50010,
                ema50: 50000
            };
            const regime = await regimeAnalyzer.analyzeRegime(rangingMarketData);
            expect(regime.type).toBe('ranging');
            expect(regime.strength).toBeGreaterThan(0.5);
        });
    });

    describe('VolatilityPredictor', () => {
        let volatilityPredictor;

        beforeEach(() => {
            volatilityPredictor = new VolatilityPredictor();
        });

        test('should predict volatility level', async () => {
            const prediction = await volatilityPredictor.predictVolatility(mockMarketData);
            expect(prediction).toHaveProperty('level');
            expect(prediction).toHaveProperty('trend');
            expect(prediction).toHaveProperty('confidence');
            expect(prediction).toHaveProperty('timeHorizon');
            expect(prediction.level).toBeGreaterThanOrEqual(0);
            expect(prediction.level).toBeLessThanOrEqual(1);
        });

        test('should use cache for repeated predictions', async () => {
            const firstPrediction = await volatilityPredictor.predictVolatility(mockMarketData);
            const secondPrediction = await volatilityPredictor.predictVolatility(mockMarketData);
            expect(secondPrediction).toEqual(firstPrediction);
        });
    });

    describe('SupportResistanceAI', () => {
        let srAnalyzer;

        beforeEach(() => {
            srAnalyzer = new SupportResistanceAI();
        });

        test('should find key levels', async () => {
            const levels = await srAnalyzer.findKeyLevels(mockMarketData);
            expect(levels).toHaveProperty('support');
            expect(levels).toHaveProperty('resistance');
            expect(levels).toHaveProperty('strength');
            expect(levels).toHaveProperty('confidence');
            expect(levels.support.length).toBeGreaterThan(0);
            expect(levels.resistance.length).toBeGreaterThan(0);
        });

        test('should handle missing ATR', async () => {
            const noAtrData = { ...mockMarketData, atr: undefined };
            const levels = await srAnalyzer.findKeyLevels(noAtrData);
            expect(levels.support.length).toBe(1);
            expect(levels.resistance.length).toBe(1);
        });
    });

    describe('TrailingAlgorithmSuite', () => {
        let algorithmSuite;
        let mockContext;

        beforeEach(() => {
            algorithmSuite = new TrailingAlgorithmSuite();
            mockContext = {
                regime: { type: 'trending', strength: 0.8, confidence: 0.85 },
                volatility: { level: 0.5, trend: 'stable', confidence: 0.8 },
                srLevels: {
                    support: [49000, 48500, 48000],
                    resistance: [51000, 51500, 52000],
                    strength: 0.7,
                    confidence: 0.75
                }
            };
        });

        test('should calculate adaptive ATR trailing stop', async () => {
            const result = await algorithmSuite.calculate('adaptive_atr', mockPositionData, mockMarketData, mockContext);
            expect(result).toHaveProperty('stopPrice');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('reasoning');
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        test('should calculate trend strength trailing stop', async () => {
            const result = await algorithmSuite.calculate('trend_strength', mockPositionData, mockMarketData, mockContext);
            expect(result).toHaveProperty('stopPrice');
            expect(result.confidence).toBe(mockContext.regime.confidence);
        });

        test('should calculate support resistance trailing stop', async () => {
            const result = await algorithmSuite.calculate('support_resistance', mockPositionData, mockMarketData, mockContext);
            expect(result).toHaveProperty('stopPrice');
            expect(result.confidence).toBe(mockContext.srLevels.confidence);
        });

        test('should calculate momentum adaptive trailing stop', async () => {
            const result = await algorithmSuite.calculate('momentum_adaptive', mockPositionData, mockMarketData, mockContext);
            expect(result).toHaveProperty('stopPrice');
            expect(result.confidence).toBe(0.85);
        });

        test('should calculate profit protection trailing stop', async () => {
            const profitablePosition = { ...mockPositionData, profitPercent: 3.5 };
            const result = await algorithmSuite.calculate('profit_protection', profitablePosition, mockMarketData, mockContext);
            expect(result).toHaveProperty('stopPrice');
            expect(result.confidence).toBe(0.9);
        });

        test('should throw error for unknown algorithm', async () => {
            await expect(algorithmSuite.calculate('unknown_algo', mockPositionData, mockMarketData, mockContext))
                .rejects.toThrow('Unknown trailing algorithm: unknown_algo');
        });
    });
}); 