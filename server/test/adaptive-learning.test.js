const AdaptiveLearningSystem = require('../src/core/adaptive-learning');

describe('AdaptiveLearningSystem', () => {
    let adaptiveLearning;
    let mockModelManager;
    let mockDataCollector;

    const mockPrediction = {
        model: 'ES_LSTM',
        instrument: 'ES',
        timestamp: '2024-03-20T10:00:00Z',
        direction: 1,
        strength: 0.8,
        confidence: 0.75
    };

    const mockOutcome = {
        direction: 1,
        pnl: 100,
        timestamp: '2024-03-20T10:05:00Z'
    };

    beforeEach(() => {
        // Mock model manager
        mockModelManager = {
            updateModel: jest.fn().mockResolvedValue(true)
        };

        // Mock data collector
        mockDataCollector = {
            recordOutcome: jest.fn().mockResolvedValue(true),
            prepareTrainingData: jest.fn().mockResolvedValue({
                features: [{ price: 4500, volume: 1000 }],
                labels: [1],
                timestamps: ['2024-03-20T10:00:00Z']
            })
        };

        adaptiveLearning = new AdaptiveLearningSystem(mockModelManager, mockDataCollector);
    });

    afterEach(() => {
        adaptiveLearning.reset();
        jest.clearAllMocks();
    });

    describe('recordOutcome', () => {
        it('should record outcomes and update performance', async () => {
            const outcomeProcessedSpy = jest.fn();
            adaptiveLearning.on('outcomeProcessed', outcomeProcessedSpy);

            await adaptiveLearning.recordOutcome(mockPrediction, mockOutcome);

            expect(mockDataCollector.recordOutcome).toHaveBeenCalledWith(mockPrediction, mockOutcome);
            expect(outcomeProcessedSpy).toHaveBeenCalled();
            expect(adaptiveLearning.recentPerformance).toHaveLength(1);
        });

        it('should trigger learning when performance is below threshold', async () => {
            // Set up poor performance
            adaptiveLearning.learningThreshold = 0.9; // High threshold
            const badOutcome = { ...mockOutcome, direction: -1 }; // Incorrect prediction

            const learningCompleteSpy = jest.fn();
            adaptiveLearning.on('learningComplete', learningCompleteSpy);

            await adaptiveLearning.recordOutcome(mockPrediction, badOutcome);

            expect(mockModelManager.updateModel).toHaveBeenCalled();
            expect(learningCompleteSpy).toHaveBeenCalled();
        });
    });

    describe('performOnlineLearning', () => {
        it('should update underperforming models', async () => {
            // Set up poor performance for a model
            adaptiveLearning.modelPerformance.set('ES_LSTM', 0.5);
            adaptiveLearning.learningThreshold = 0.7;

            await adaptiveLearning.performOnlineLearning();

            expect(mockModelManager.updateModel).toHaveBeenCalledWith(
                'ES_LSTM',
                expect.any(Object)
            );
        });

        it('should skip learning if no training data available', async () => {
            mockDataCollector.prepareTrainingData.mockResolvedValueOnce({
                features: [],
                labels: [],
                timestamps: []
            });

            await adaptiveLearning.performOnlineLearning();

            expect(mockModelManager.updateModel).not.toHaveBeenCalled();
        });
    });

    describe('updateEnsembleWeights', () => {
        it('should update weights based on performance', async () => {
            adaptiveLearning.modelPerformance.set('ES_LSTM', 0.8);
            adaptiveLearning.modelPerformance.set('ES_XGBoost', 0.6);

            const weightsUpdatedSpy = jest.fn();
            adaptiveLearning.on('weightsUpdated', weightsUpdatedSpy);

            await adaptiveLearning.updateEnsembleWeights();

            expect(weightsUpdatedSpy).toHaveBeenCalled();
            const weights = adaptiveLearning.getModelWeights();
            expect(weights.get('ES_LSTM')).toBeGreaterThan(weights.get('ES_XGBoost'));
        });

        it('should ensure minimum weights for all models', async () => {
            adaptiveLearning.modelPerformance.set('ES_LSTM', 0.9);
            adaptiveLearning.modelPerformance.set('ES_XGBoost', 0.1);

            await adaptiveLearning.updateEnsembleWeights();

            const weights = adaptiveLearning.getModelWeights();
            expect(weights.get('ES_XGBoost')).toBeGreaterThanOrEqual(0.1);
        });
    });

    describe('evaluatePrediction', () => {
        it('should correctly evaluate matching directions', () => {
            const result = adaptiveLearning.evaluatePrediction(
                { direction: 1 },
                { direction: 1 }
            );
            expect(result).toBe(true);
        });

        it('should correctly evaluate mismatched directions', () => {
            const result = adaptiveLearning.evaluatePrediction(
                { direction: 1 },
                { direction: -1 }
            );
            expect(result).toBe(false);
        });
    });

    describe('calculateCurrentPerformance', () => {
        it('should calculate correct performance ratio', () => {
            adaptiveLearning.recentPerformance = [true, true, false, true]; // 75% correct
            expect(adaptiveLearning.calculateCurrentPerformance()).toBe(0.75);
        });

        it('should return default value for empty performance history', () => {
            expect(adaptiveLearning.calculateCurrentPerformance()).toBe(0.5);
        });
    });

    describe('reset', () => {
        it('should clear all performance tracking', () => {
            adaptiveLearning.recentPerformance = [true, false];
            adaptiveLearning.modelPerformance.set('ES_LSTM', 0.8);
            adaptiveLearning.modelWeights.set('ES_LSTM', 0.7);

            adaptiveLearning.reset();

            expect(adaptiveLearning.recentPerformance).toHaveLength(0);
            expect(adaptiveLearning.modelPerformance.size).toBe(0);
            expect(adaptiveLearning.modelWeights.size).toBe(0);
        });
    });
}); 