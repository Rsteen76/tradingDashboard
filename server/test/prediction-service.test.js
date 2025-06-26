const MLPredictionService = require('../src/services/prediction-service');

describe('MLPredictionService', () => {
    let predictionService;
    let mockModelManager;
    let mockFeatureEngineer;

    beforeEach(() => {
        // Mock model manager
        mockModelManager = {
            predict: jest.fn().mockImplementation((model, features) => {
                return Promise.resolve({
                    direction: 1,
                    strength: 0.8,
                    confidence: 0.75
                });
            })
        };

        // Mock feature engineer
        mockFeatureEngineer = {
            extractFeatures: jest.fn().mockImplementation((marketData) => {
                return Promise.resolve({
                    price: marketData.price,
                    volume: marketData.volume,
                    timestamp: marketData.timestamp
                });
            })
        };

        predictionService = new MLPredictionService(mockModelManager, mockFeatureEngineer);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generatePrediction', () => {
        const mockMarketData = {
            instrument: 'BTC-USD',
            price: 50000,
            volume: 100,
            timestamp: new Date().toISOString()
        };

        it('should generate a valid prediction', async () => {
            const prediction = await predictionService.generatePrediction(mockMarketData);
            
            expect(prediction).toHaveProperty('direction');
            expect(prediction).toHaveProperty('strength');
            expect(prediction).toHaveProperty('confidence');
            expect(prediction).toHaveProperty('timestamp');
            expect(prediction).toHaveProperty('metadata');
            expect(prediction).toHaveProperty('recommendation');
        });

        it('should use cached prediction when available', async () => {
            // Generate first prediction
            const firstPrediction = await predictionService.generatePrediction(mockMarketData);
            
            // Generate second prediction with same data
            const secondPrediction = await predictionService.generatePrediction(mockMarketData);
            
            expect(mockFeatureEngineer.extractFeatures).toHaveBeenCalledTimes(1);
            expect(firstPrediction).toEqual(secondPrediction);
        });

        it('should handle feature extraction failure', async () => {
            mockFeatureEngineer.extractFeatures.mockResolvedValueOnce(null);
            
            await expect(predictionService.generatePrediction(mockMarketData))
                .rejects
                .toThrow('Feature extraction failed');
        });

        it('should track predictions in history', async () => {
            const prediction = await predictionService.generatePrediction(mockMarketData);
            
            const history = predictionService.predictionHistory.get(mockMarketData.instrument);
            expect(history).toBeDefined();
            expect(history[0].prediction).toEqual(prediction);
        });
    });

    describe('calculateEnsemble', () => {
        const mockPredictions = {
            lstm: { direction: 1, strength: 0.8, confidence: 0.9 },
            transformer: { direction: 1, strength: 0.7, confidence: 0.8 },
            randomForest: { direction: 1, strength: 0.6, confidence: 0.7 },
            xgboost: { direction: -1, strength: 0.5, confidence: 0.6 }
        };

        it('should calculate weighted ensemble prediction', () => {
            const ensemble = predictionService.calculateEnsemble(mockPredictions);
            
            expect(ensemble.direction).toBeDefined();
            expect(ensemble.strength).toBeGreaterThanOrEqual(0);
            expect(ensemble.strength).toBeLessThanOrEqual(1);
            expect(ensemble.confidence).toBeGreaterThanOrEqual(0);
            expect(ensemble.confidence).toBeLessThanOrEqual(1);
        });

        it('should handle empty predictions', () => {
            const ensemble = predictionService.calculateEnsemble({});
            
            expect(ensemble.direction).toBe(0);
            expect(ensemble.strength).toBe(0.5);
            expect(ensemble.confidence).toBe(0.5);
        });
    });

    describe('adjustWeightsBasedOnPerformance', () => {
        const mockPerformance = {
            lstm: 0.8,
            transformer: 0.7,
            randomForest: 0.6,
            xgboost: 0.5
        };

        it('should update model weights based on performance', async () => {
            await predictionService.adjustWeightsBasedOnPerformance(mockPerformance);
            
            const totalWeight = Object.values(predictionService.modelWeights)
                .reduce((a, b) => a + b, 0);
            
            expect(totalWeight).toBeCloseTo(1, 5);
            expect(predictionService.modelWeights.lstm).toBeGreaterThan(predictionService.modelWeights.xgboost);
        });

        it('should emit weightsUpdated event', async () => {
            const eventHandler = jest.fn();
            predictionService.on('weightsUpdated', eventHandler);
            
            await predictionService.adjustWeightsBasedOnPerformance(mockPerformance);
            
            expect(eventHandler).toHaveBeenCalledWith(predictionService.modelWeights);
        });
    });

    describe('data quality assessment', () => {
        const mockMarketData = {
            instrument: 'BTC-USD',
            price: 50000,
            volume: 100,
            timestamp: new Date().toISOString()
        };

        it('should calculate data freshness correctly', () => {
            const freshness = predictionService._calculateDataFreshness(mockMarketData.timestamp);
            expect(freshness).toBeGreaterThanOrEqual(0);
            expect(freshness).toBeLessThanOrEqual(1);
        });

        it('should calculate data completeness correctly', () => {
            const completeness = predictionService._calculateDataCompleteness(mockMarketData);
            expect(completeness).toBe(1); // All required fields present
        });

        it('should handle missing data fields', () => {
            const incompleteData = {
                instrument: 'BTC-USD',
                price: 50000
                // Missing volume and timestamp
            };
            
            const completeness = predictionService._calculateDataCompleteness(incompleteData);
            expect(completeness).toBe(1/3); // Only 1 of 3 required fields present
        });
    });

    describe('recommendation generation', () => {
        it('should generate STRONG_BUY for high strength and confidence', () => {
            const recommendation = predictionService._generateRecommendation(0.8, 0.8);
            expect(recommendation).toBe('STRONG_BUY');
        });

        it('should generate HOLD for low confidence', () => {
            const recommendation = predictionService._generateRecommendation(0.8, 0.3);
            expect(recommendation).toBe('HOLD');
        });

        it('should generate appropriate recommendations for different scenarios', () => {
            expect(predictionService._generateRecommendation(0.6, 0.8)).toBe('BUY');
            expect(predictionService._generateRecommendation(-0.6, 0.8)).toBe('SELL');
            expect(predictionService._generateRecommendation(-0.8, 0.8)).toBe('STRONG_SELL');
            expect(predictionService._generateRecommendation(0.3, 0.8)).toBe('HOLD');
        });
    });

    describe('calculateEnsemblePrediction', () => {
        it('should calculate ensemble prediction from multiple models', async () => {
            const marketData = {
                instrument: 'BTC-USD',
                price: 50000,
                volume: 100,
                timestamp: '2025-06-26T15:00:00.000Z'
            };

            const prediction = await predictionService.calculateEnsemblePrediction(marketData);

            expect(prediction).toHaveProperty('direction');
            expect(prediction).toHaveProperty('strength');
            expect(prediction).toHaveProperty('confidence');
            expect(prediction).toHaveProperty('timestamp');

            expect(mockModelManager.predict).toHaveBeenCalledTimes(4);
            expect(mockFeatureEngineer.extractFeatures).toHaveBeenCalledWith(marketData);
        });

        it('should use cached prediction if available', async () => {
            const marketData = {
                instrument: 'BTC-USD',
                price: 50000,
                volume: 100,
                timestamp: '2025-06-26T15:00:00.000Z'
            };

            // First call to populate cache
            await predictionService.calculateEnsemblePrediction(marketData);
            
            // Reset mocks
            mockModelManager.predict.mockClear();
            mockFeatureEngineer.extractFeatures.mockClear();

            // Second call should use cache
            const prediction = await predictionService.calculateEnsemblePrediction(marketData);

            expect(prediction).toBeDefined();
            expect(mockModelManager.predict).not.toHaveBeenCalled();
            expect(mockFeatureEngineer.extractFeatures).not.toHaveBeenCalled();
        });

        it('should handle prediction errors gracefully', async () => {
            const marketData = {
                instrument: 'BTC-USD',
                price: 50000,
                volume: 100,
                timestamp: '2025-06-26T15:00:00.000Z'
            };

            mockFeatureEngineer.extractFeatures.mockRejectedValue(new Error('Feature extraction failed'));

            await expect(predictionService.calculateEnsemblePrediction(marketData))
                .rejects.toThrow('Feature extraction failed');
        });
    });

    describe('calculateModelWeights', () => {
        it('should calculate weights for all models', () => {
            const predictions = [
                { direction: 1, strength: 0.8, confidence: 0.75 },
                { direction: 1, strength: 0.7, confidence: 0.8 },
                { direction: -1, strength: 0.6, confidence: 0.85 },
                { direction: 1, strength: 0.9, confidence: 0.7 }
            ];

            const weights = predictionService.calculateModelWeights(predictions);

            expect(weights).toHaveProperty('lstm');
            expect(weights).toHaveProperty('transformer');
            expect(weights).toHaveProperty('randomForest');
            expect(weights).toHaveProperty('xgboost');

            const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
            expect(totalWeight).toBeCloseTo(1, 5);
        });
    });

    describe('combineModelPredictions', () => {
        it('should combine predictions using weighted average', () => {
            const predictions = [
                { direction: 1, strength: 0.8, confidence: 0.75 },
                { direction: 1, strength: 0.7, confidence: 0.8 },
                { direction: -1, strength: 0.6, confidence: 0.85 },
                { direction: 1, strength: 0.9, confidence: 0.7 }
            ];

            const weights = {
                lstm: 0.3,
                transformer: 0.27,
                randomForest: 0.23,
                xgboost: 0.2
            };

            const combined = predictionService.combineModelPredictions(predictions, weights);

            expect(combined).toHaveProperty('direction');
            expect(combined).toHaveProperty('strength');
            expect(combined).toHaveProperty('confidence');
            expect(combined).toHaveProperty('timestamp');

            expect(typeof combined.direction).toBe('number');
            expect(typeof combined.strength).toBe('number');
            expect(typeof combined.confidence).toBe('number');
            expect(typeof combined.timestamp).toBe('string');
        });
    });

    describe('trackPredictionPerformance', () => {
        it('should track prediction and emit event', (done) => {
            const prediction = {
                direction: 1,
                strength: 0.8,
                confidence: 0.75,
                timestamp: '2025-06-26T15:00:00.000Z'
            };

            const marketData = {
                instrument: 'BTC-USD',
                price: 50000,
                volume: 100,
                timestamp: '2025-06-26T15:00:00.000Z'
            };

            predictionService.on('prediction', (data) => {
                expect(data).toHaveProperty('instrument', 'BTC-USD');
                expect(data).toHaveProperty('prediction');
                expect(data).toHaveProperty('timestamp');
                done();
            });

            predictionService.trackPredictionPerformance(prediction, marketData);
        });
    });
}); 