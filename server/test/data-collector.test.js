const DataCollector = require('../src/core/data-collector');

describe('DataCollector', () => {
    let dataCollector;
    const mockMarketData = {
        instrument: 'ES',
        timestamp: '2024-03-20T10:00:00Z',
        price: 4500,
        volume: 1000,
        bid: 4499.75,
        ask: 4500.25
    };

    const mockPrediction = {
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
        dataCollector = new DataCollector();
    });

    afterEach(() => {
        dataCollector.cleanup();
    });

    describe('collectMarketData', () => {
        it('should collect and cache market data', async () => {
            const marketDataCollectedSpy = jest.fn();
            dataCollector.on('marketDataCollected', marketDataCollectedSpy);

            await dataCollector.collectMarketData(mockMarketData);

            expect(marketDataCollectedSpy).toHaveBeenCalledWith({
                instrument: mockMarketData.instrument,
                timestamp: mockMarketData.timestamp
            });

            const cacheKey = `${mockMarketData.instrument}_${mockMarketData.timestamp}`;
            expect(dataCollector.marketDataCache.get(cacheKey)).toEqual(mockMarketData);
        });

        it('should handle errors gracefully', async () => {
            const invalidData = null;
            await expect(dataCollector.collectMarketData(invalidData))
                .rejects
                .toThrow();
        });
    });

    describe('recordOutcome', () => {
        it('should record prediction outcomes', async () => {
            const outcomeRecordedSpy = jest.fn();
            dataCollector.on('outcomeRecorded', outcomeRecordedSpy);

            await dataCollector.recordOutcome(mockPrediction, mockOutcome);

            expect(outcomeRecordedSpy).toHaveBeenCalledWith({
                instrument: mockPrediction.instrument,
                timestamp: mockPrediction.timestamp
            });

            const cacheKey = `${mockPrediction.instrument}_${mockPrediction.timestamp}`;
            const cachedOutcome = dataCollector.outcomeCache.get(cacheKey);
            expect(cachedOutcome.prediction).toEqual(mockPrediction);
            expect(cachedOutcome.outcome).toEqual(mockOutcome);
        });

        it('should handle invalid outcomes gracefully', async () => {
            const invalidOutcome = null;
            await expect(dataCollector.recordOutcome(mockPrediction, invalidOutcome))
                .rejects
                .toThrow();
        });
    });

    describe('prepareTrainingData', () => {
        it('should prepare training data from collected data', async () => {
            // Collect some test data first
            await dataCollector.collectMarketData(mockMarketData);
            await dataCollector.recordOutcome(mockPrediction, mockOutcome);

            const trainingData = await dataCollector.prepareTrainingData('ES');

            expect(trainingData).toHaveProperty('features');
            expect(trainingData).toHaveProperty('labels');
            expect(trainingData).toHaveProperty('timestamps');
            expect(trainingData.features.length).toBe(1);
            expect(trainingData.labels.length).toBe(1);
            expect(trainingData.timestamps.length).toBe(1);
        });

        it('should handle empty data gracefully', async () => {
            const trainingData = await dataCollector.prepareTrainingData('UNKNOWN');
            expect(trainingData.features).toHaveLength(0);
            expect(trainingData.labels).toHaveLength(0);
            expect(trainingData.timestamps).toHaveLength(0);
        });
    });

    describe('cleanup', () => {
        it('should clear all caches', async () => {
            await dataCollector.collectMarketData(mockMarketData);
            await dataCollector.recordOutcome(mockPrediction, mockOutcome);

            dataCollector.cleanup();

            expect(dataCollector.marketDataCache.size).toBe(0);
            expect(dataCollector.predictionCache.size).toBe(0);
            expect(dataCollector.outcomeCache.size).toBe(0);
        });
    });
}); 