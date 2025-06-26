const PositionManager = require('../src/core/position-manager');
const logger = require('../src/utils/logger');

describe('Position Manager', () => {
    let positionManager;
    const testInstrument = 'BTC-USD';

    beforeEach(() => {
        positionManager = new PositionManager(logger);
    });

    afterEach(() => {
        positionManager.cleanup();
    });

    describe('Position Updates', () => {
        test('should handle string position updates', async () => {
            // Set mock ML position to match update
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 0,
                avgPrice: 0
            });
            
            await positionManager.updatePosition(testInstrument, 'LONG');
            const position = positionManager.getPosition(testInstrument);
            expect(position.direction).toBe('LONG');
            expect(position.size).toBe(0);
        });

        test('should handle numeric position updates', async () => {
            // Set mock ML position to match update
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 2,
                avgPrice: 0
            });
            
            await positionManager.updatePosition(testInstrument, 2);
            const position = positionManager.getPosition(testInstrument);
            expect(position.direction).toBe('LONG');
            expect(position.size).toBe(2);
        });

        test('should handle object position updates', async () => {
            // Set mock ML position to match update
            positionManager.setMockMLPosition({
                direction: 'SHORT',
                size: 1.5,
                avgPrice: 50000
            });
            
            await positionManager.updatePosition(testInstrument, {
                direction: 'SHORT',
                size: 1.5,
                avgPrice: 50000
            });
            const position = positionManager.getPosition(testInstrument);
            expect(position.direction).toBe('SHORT');
            expect(position.size).toBe(1.5);
            expect(position.avgPrice).toBe(50000);
        });

        test('should emit position update events', (done) => {
            // Set mock ML position to match update
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 0,
                avgPrice: 0
            });
            
            positionManager.once('positionUpdate', (update) => {
                expect(update.instrument).toBe(testInstrument);
                expect(update.position.direction).toBe('LONG');
                done();
            });
            positionManager.updatePosition(testInstrument, 'LONG');
        });
    });

    describe('Position History', () => {
        test('should store position history', async () => {
            // Set mock ML position for both updates
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 0,
                avgPrice: 0
            });
            await positionManager.updatePosition(testInstrument, 'LONG');
            
            positionManager.setMockMLPosition({
                direction: 'SHORT',
                size: 0,
                avgPrice: 0
            });
            await positionManager.updatePosition(testInstrument, 'SHORT');
            
            const history = positionManager.getPositionHistory(testInstrument);
            expect(history.length).toBe(2);
            expect(history[0].direction).toBe('SHORT');
            expect(history[1].direction).toBe('LONG');
        });

        test('should filter history by timeframe', async () => {
            const mockDate = new Date('2024-01-01T12:00:00Z');
            const originalNow = Date.now;
            Date.now = jest.fn(() => mockDate.getTime());

            const position1Time = new Date('2024-01-01T10:00:00Z');
            const position2Time = new Date('2024-01-01T11:45:00Z');

            positionManager.positionHistory.set(testInstrument, [
                { timestamp: position1Time, direction: 'LONG', size: 1 },
                { timestamp: position2Time, direction: 'SHORT', size: 1 }
            ]);

            const history1h = positionManager.getPositionHistory(testInstrument, '1h');
            const history1d = positionManager.getPositionHistory(testInstrument, '1d');

            expect(history1h.length).toBe(1);
            expect(history1d.length).toBe(2);

            Date.now = originalNow;
        });
    });

    describe('Position Validation', () => {
        test('should detect position discrepancies', (done) => {
            // Set mock ML position to create discrepancy
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 1,
                avgPrice: 0
            });

            positionManager.once('positionDiscrepancy', (discrepancy) => {
                expect(discrepancy.instrument).toBe(testInstrument);
                expect(discrepancy.type).toBe('direction');
                done();
            });

            positionManager.updatePosition(testInstrument, 'SHORT');
        });

        test('should attempt position reconciliation', (done) => {
            // Set mock ML position and ensure update succeeds
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 1,
                avgPrice: 0
            });
            positionManager.setMockUpdateSuccess(true);

            positionManager.once('positionReconciled', (result) => {
                expect(result.instrument).toBe(testInstrument);
                expect(result.position.direction).toBe('SHORT');
                done();
            });

            positionManager.updatePosition(testInstrument, 'SHORT');
        });

        test('should handle max reconciliation attempts', async () => {
            const maxAttempts = 3;
            positionManager.maxReconciliationAttempts = maxAttempts;

            // Set mock ML position and force updates to fail
            positionManager.setMockMLPosition({
                direction: 'LONG',
                size: 2,
                avgPrice: 50000
            });
            positionManager.setMockUpdateSuccess(false);

            let attempts = 0;
            let reconciliationFailedEmitted = false;

            const reconciliationFailedPromise = new Promise((resolve) => {
                positionManager.on('reconciliationError', () => {
                    attempts++;
                });

                positionManager.on('reconciliationFailed', (data) => {
                    reconciliationFailedEmitted = true;
                    resolve();
                });
            });

            await positionManager.handleDiscrepancy(testInstrument, {
                direction: 'SHORT',
                size: 2,
                avgPrice: 50000
            }, {
                direction: 'LONG',
                size: 2,
                avgPrice: 50000
            });

            await reconciliationFailedPromise;

            expect(reconciliationFailedEmitted).toBe(true);
            expect(attempts).toBe(maxAttempts);
        });
    });

    describe('Position Normalization', () => {
        test('should normalize string positions', () => {
            const normalized = positionManager.normalizePosition('long');
            expect(normalized).toEqual({
                direction: 'LONG',
                size: 0,
                avgPrice: 0
            });
        });

        test('should normalize numeric positions', () => {
            const normalized = positionManager.normalizePosition(2);
            expect(normalized).toEqual({
                direction: 'LONG',
                size: 2,
                avgPrice: 0
            });
        });

        test('should normalize object positions', () => {
            const normalized = positionManager.normalizePosition({
                direction: 'short',
                size: 1.5,
                avgPrice: 50000
            });
            expect(normalized).toEqual({
                direction: 'SHORT',
                size: 1.5,
                avgPrice: 50000
            });
        });

        test('should handle invalid positions', () => {
            const normalized = positionManager.normalizePosition(null);
            expect(normalized).toEqual({
                direction: 'FLAT',
                size: 0,
                avgPrice: 0
            });
        });
    });

    describe('Cleanup', () => {
        test('should clear all data on cleanup', () => {
            positionManager.updatePosition(testInstrument, 'LONG');
            positionManager.cleanup();
            expect(positionManager.getPosition(testInstrument).direction).toBe('FLAT');
            expect(positionManager.getPositionHistory(testInstrument).length).toBe(0);
        });
    });
}); 