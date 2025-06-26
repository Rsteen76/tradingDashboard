const { EventEmitter } = require('events');

class PositionManager extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        this.positions = new Map();
        this.positionHistory = new Map();
        this.reconciliationAttempts = new Map();
        this.maxReconciliationAttempts = 3;
        this.mockMLPosition = null; // For testing
        this.mockUpdateSuccess = true; // For testing
    }

    normalizePosition(position) {
        if (!position) {
            return {
                direction: 'FLAT',
                size: 0,
                avgPrice: 0
            };
        }

        if (typeof position === 'string') {
            return {
                direction: position.toUpperCase(),
                size: 0,
                avgPrice: 0
            };
        }

        if (typeof position === 'number') {
            return {
                direction: position > 0 ? 'LONG' : position < 0 ? 'SHORT' : 'FLAT',
                size: Math.abs(position),
                avgPrice: 0
            };
        }

        return {
            direction: (position.direction || 'FLAT').toUpperCase(),
            size: Math.abs(position.size || 0),
            avgPrice: position.avgPrice || 0
        };
    }

    getPosition(instrument) {
        return this.positions.get(instrument) || {
            direction: 'FLAT',
            size: 0,
            avgPrice: 0,
            lastUpdate: new Date()
        };
    }

    updatePosition(instrument, position) {
        const normalizedPosition = this.normalizePosition(position);
        this.positions.set(instrument, {
            ...normalizedPosition,
            lastUpdate: new Date()
        });

        // Add to history (newest first)
        const history = this.positionHistory.get(instrument) || [];
        history.unshift({
            ...normalizedPosition,
            timestamp: new Date()
        });
        this.positionHistory.set(instrument, history);

        this.logger.info(`Position updated for ${instrument}`, {
            ...normalizedPosition,
            lastUpdate: new Date()
        });

        // Emit update event
        this.emit('positionUpdate', {
            instrument,
            position: normalizedPosition
        });

        // Check for discrepancies with ML position
        return this.getMLPosition(instrument).then(mlPosition => {
            const discrepancy = this.checkDiscrepancy(normalizedPosition, mlPosition);
            if (discrepancy) {
                this.logger.warn('Position mismatch detected:', {
                    instrument,
                    current: normalizedPosition,
                    ml: mlPosition,
                    detected: new Date(),
                    type: discrepancy
                });

                this.emit('positionDiscrepancy', {
                    instrument,
                    current: normalizedPosition,
                    ml: mlPosition,
                    type: discrepancy
                });

                return this.handleDiscrepancy(instrument, normalizedPosition, mlPosition);
            }
            return Promise.resolve();
        }).catch(error => {
            this.logger.error('Failed to get ML position:', {
                instrument,
                error: error.message
            });
            return Promise.reject(error);
        });
    }

    checkDiscrepancy(currentPosition, mlPosition) {
        if (currentPosition.direction !== mlPosition.direction) {
            return 'direction';
        }
        if (currentPosition.size !== mlPosition.size) {
            return 'size';
        }
        return null;
    }

    async updateMLPosition(instrument, position) {
        if (this.mockUpdateSuccess) {
            return Promise.resolve();
        }
        return Promise.reject(new Error('Update failed'));
    }

    async getMLPosition(instrument) {
        if (this.mockMLPosition) {
            return Promise.resolve(this.mockMLPosition);
        }
        return Promise.resolve({
            direction: 'LONG',
            size: 1,
            avgPrice: 0
        });
    }

    getPositionHistory(instrument, timeframe) {
        const history = this.positionHistory.get(instrument) || [];
        if (!timeframe) return history;

        const timeframes = {
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000,
            '1w': 7 * 24 * 60 * 60 * 1000
        };

        const duration = timeframes[timeframe] || timeframes['1d'];
        const cutoffTime = new Date(Date.now() - duration);
        
        return history.filter(p => p.timestamp > cutoffTime);
    }

    async handleDiscrepancy(instrument, currentPosition, mlPosition) {
        const attempts = this.reconciliationAttempts.get(instrument) || 0;
        
        // Check max attempts first
        if (attempts >= this.maxReconciliationAttempts) {
            this.logger.error('Failed to reconcile positions:', {
                instrument,
                attempts,
                current: currentPosition,
                ml: mlPosition
            });

            // Emit max attempts event
            this.emit('reconciliationFailed', {
                instrument,
                attempts,
                current: currentPosition,
                ml: mlPosition
            });
            return Promise.resolve();
        }

        try {
            // Increment attempts counter before trying
            this.reconciliationAttempts.set(instrument, attempts + 1);

            // Try to update ML position
            await this.updateMLPosition(instrument, currentPosition);
            
            // If successful, reset attempts counter
            this.reconciliationAttempts.delete(instrument);
            
            this.logger.info('Position reconciled:', {
                ...currentPosition,
                instrument
            });
            
            this.emit('positionReconciled', {
                instrument,
                position: currentPosition
            });

            return Promise.resolve();
        } catch (error) {
            this.logger.error('Reconciliation error:', {
                instrument,
                error: error.message,
                attempts: this.reconciliationAttempts.get(instrument)
            });

            this.emit('reconciliationError', {
                instrument,
                error: error.message,
                attempts: this.reconciliationAttempts.get(instrument)
            });

            return this.handleDiscrepancy(instrument, currentPosition, mlPosition);
        }
    }

    // For testing
    setMockMLPosition(position) {
        this.mockMLPosition = position;
    }

    setMockUpdateSuccess(success) {
        this.mockUpdateSuccess = success;
    }

    cleanup() {
        this.positions.clear();
        this.positionHistory.clear();
        this.reconciliationAttempts.clear();
        this.mockMLPosition = null;
        this.mockUpdateSuccess = true;
        this.removeAllListeners();
    }
}

module.exports = PositionManager;