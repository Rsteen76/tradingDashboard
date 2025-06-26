const FeatureEngineer = require('../src/core/feature-engineer');

describe('FeatureEngineer', () => {
    let featureEngineer;
    let mockMarketData;
    let mockHistoricalData;

    beforeEach(() => {
        featureEngineer = new FeatureEngineer();
        
        // Mock current market data
        mockMarketData = {
            price: 100,
            volume: 1000,
            timestamp: Date.now(),
            high: 101,
            low: 99,
            open: 99.5
        };

        // Mock historical data
        mockHistoricalData = Array.from({ length: 100 }, (_, i) => ({
            price: 100 + Math.sin(i / 10) * 2,
            volume: 1000 + Math.random() * 200,
            timestamp: Date.now() - i * 60000,
            high: 101 + Math.sin(i / 10) * 2,
            low: 99 + Math.sin(i / 10) * 2,
            open: 99.5 + Math.sin(i / 10) * 2
        }));
    });

    describe('initialization', () => {
        it('should initialize successfully', async () => {
            const instance = await featureEngineer.initialize();
            expect(instance).toBe(featureEngineer);
        });
    });

    describe('feature calculation', () => {
        it('should calculate basic price features', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            
            expect(features).toHaveProperty('price');
            expect(features).toHaveProperty('returns');
            expect(features).toHaveProperty('volatility');
            expect(features.price).toBe(mockMarketData.price);
        });

        it('should calculate technical indicators', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            
            expect(features).toHaveProperty('rsi');
            expect(features).toHaveProperty('macd');
            expect(features).toHaveProperty('ema');
            expect(features.rsi).toBeGreaterThanOrEqual(0);
            expect(features.rsi).toBeLessThanOrEqual(100);
        });

        it('should calculate volume-based features', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            
            expect(features).toHaveProperty('volume');
            expect(features).toHaveProperty('volumeMA');
            expect(features).toHaveProperty('volumeVariance');
            expect(features.volume).toBe(mockMarketData.volume);
        });

        it('should calculate momentum features', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            
            expect(features).toHaveProperty('momentum');
            expect(features).toHaveProperty('acceleration');
            expect(features.momentum).toBeDefined();
        });

        it('should calculate volatility features', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            
            expect(features).toHaveProperty('atr');
            expect(features).toHaveProperty('volatility');
            expect(features).toHaveProperty('volatilityMA');
            expect(features.atr).toBeGreaterThan(0);
        });

        it('should calculate trend features', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            
            expect(features).toHaveProperty('trendStrength');
            expect(features).toHaveProperty('trendDirection');
            expect(features.trendStrength).toBeGreaterThanOrEqual(0);
            expect(features.trendStrength).toBeLessThanOrEqual(1);
        });
    });

    describe('feature normalization', () => {
        it('should normalize features correctly', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            const normalized = await featureEngineer.normalizeFeatures(features);
            
            expect(normalized.rsi).toBeGreaterThanOrEqual(0);
            expect(normalized.rsi).toBeLessThanOrEqual(1);
            expect(normalized.volatility).toBeGreaterThanOrEqual(0);
            expect(normalized.volatility).toBeLessThanOrEqual(1);
        });

        it('should handle extreme values in normalization', async () => {
            mockMarketData.price = 1000000; // Extreme price
            mockMarketData.volume = 999999999; // Extreme volume
            
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            const normalized = await featureEngineer.normalizeFeatures(features);
            
            expect(normalized.price).toBeGreaterThanOrEqual(0);
            expect(normalized.price).toBeLessThanOrEqual(1);
            expect(normalized.volume).toBeGreaterThanOrEqual(0);
            expect(normalized.volume).toBeLessThanOrEqual(1);
        });
    });

    describe('feature selection', () => {
        it('should select relevant features for training', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            const selected = await featureEngineer.selectFeatures(features);
            
            expect(selected).toHaveProperty('price');
            expect(selected).toHaveProperty('rsi');
            expect(selected).toHaveProperty('momentum');
            expect(Object.keys(selected).length).toBeLessThan(Object.keys(features).length);
        });

        it('should maintain feature importance order', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            const selected = await featureEngineer.selectFeatures(features);
            const keys = Object.keys(selected);
            
            // Price and volume should be among the first features
            expect(keys.slice(0, 5)).toContain('price');
            expect(keys.slice(0, 5)).toContain('volume');
        });
    });

    describe('error handling', () => {
        it('should handle missing historical data gracefully', async () => {
            const features = await featureEngineer.calculateFeatures(mockMarketData, []);
            expect(features).toBeDefined();
            expect(features.price).toBe(mockMarketData.price);
        });

        it('should handle invalid market data gracefully', async () => {
            const features = await featureEngineer.calculateFeatures({}, mockHistoricalData);
            expect(features).toBeDefined();
            expect(features.price).toBe(0);
        });

        it('should handle normalization of missing features gracefully', async () => {
            const features = { price: 100 }; // Minimal features
            const normalized = await featureEngineer.normalizeFeatures(features);
            expect(normalized).toBeDefined();
            expect(normalized.price).toBeGreaterThanOrEqual(0);
            expect(normalized.price).toBeLessThanOrEqual(1);
        });
    });

    describe('feature engineering pipeline', () => {
        it('should process features through the complete pipeline', async () => {
            const rawFeatures = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            const normalized = await featureEngineer.normalizeFeatures(rawFeatures);
            const selected = await featureEngineer.selectFeatures(normalized);
            
            expect(rawFeatures).toBeDefined();
            expect(normalized).toBeDefined();
            expect(selected).toBeDefined();
            expect(Object.keys(selected).length).toBeLessThan(Object.keys(rawFeatures).length);
        });

        it('should maintain feature consistency across pipeline stages', async () => {
            const rawFeatures = await featureEngineer.calculateFeatures(mockMarketData, mockHistoricalData);
            const normalized = await featureEngineer.normalizeFeatures(rawFeatures);
            const selected = await featureEngineer.selectFeatures(normalized);
            
            // Check that selected features exist in normalized and raw
            Object.keys(selected).forEach(key => {
                expect(normalized).toHaveProperty(key);
                expect(rawFeatures).toHaveProperty(key);
            });
        });
    });
}); 