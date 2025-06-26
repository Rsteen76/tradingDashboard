const winston = require('winston');
const { EventEmitter } = require('events');

/**
 * AdaptiveLearningSystem handles online learning and model adaptation
 * for the ML trading system.
 */
class AdaptiveLearningSystem extends EventEmitter {
    constructor(modelManager, dataCollector) {
        super();
        this.modelManager = modelManager;
        this.dataCollector = dataCollector;
        this.performanceWindow = 100; // Number of predictions to track
        this.learningThreshold = 0.7; // Performance threshold to trigger learning
        this.modelWeights = new Map();
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { 
                service: 'ml-trading-server',
                component: 'AdaptiveLearning'
            },
            transports: [
                new winston.transports.File({ filename: 'logs/adaptive-learning.log' })
            ]
        });

        // Initialize performance tracking
        this.recentPerformance = [];
        this.modelPerformance = new Map();
    }

    /**
     * Records a prediction outcome and triggers learning if needed
     * @param {Object} prediction The original prediction
     * @param {Object} outcome The actual outcome
     */
    async recordOutcome(prediction, outcome) {
        try {
            // Record outcome in data collector
            await this.dataCollector.recordOutcome(prediction, outcome);

            // Calculate performance score
            const correct = this.evaluatePrediction(prediction, outcome);
            this.recentPerformance.push(correct);

            // Maintain performance window
            if (this.recentPerformance.length > this.performanceWindow) {
                this.recentPerformance.shift();
            }

            // Update model-specific performance
            this.updateModelPerformance(prediction.model, correct);

            // Check if learning is needed
            const currentPerformance = this.calculateCurrentPerformance();
            if (currentPerformance < this.learningThreshold) {
                await this.performOnlineLearning();
            }

            this.emit('outcomeProcessed', {
                performance: currentPerformance,
                correct
            });
        } catch (error) {
            this.logger.error('Error recording outcome', { error: error.message });
            throw error;
        }
    }

    /**
     * Performs online learning based on recent performance
     */
    async performOnlineLearning() {
        try {
            this.logger.info('Starting online learning cycle');
            
            // Get recent training data
            const trainingData = await this.prepareTrainingData();
            if (!trainingData.features.length) {
                this.logger.warn('No training data available');
                return;
            }

            // Update each model
            for (const [modelName, performance] of this.modelPerformance.entries()) {
                if (performance < this.learningThreshold) {
                    await this.modelManager.updateModel(modelName, trainingData);
                    this.logger.info('Model updated', { modelName, performance });
                }
            }

            // Update ensemble weights
            await this.updateEnsembleWeights();
            
            this.emit('learningComplete', {
                modelsUpdated: Array.from(this.modelPerformance.keys()),
                performance: this.calculateCurrentPerformance()
            });
        } catch (error) {
            this.logger.error('Error during online learning', { error: error.message });
            throw error;
        }
    }

    /**
     * Updates weights for ensemble prediction based on performance
     */
    async updateEnsembleWeights() {
        try {
            const weights = new Map();
            let totalPerformance = 0;

            // Calculate total performance
            for (const performance of this.modelPerformance.values()) {
                totalPerformance += Math.max(0.1, performance); // Minimum weight of 0.1
            }

            // Update weights proportionally to performance
            for (const [model, performance] of this.modelPerformance.entries()) {
                const weight = Math.max(0.1, performance) / totalPerformance;
                weights.set(model, weight);
            }

            this.modelWeights = weights;
            this.emit('weightsUpdated', Object.fromEntries(weights));
            
            this.logger.info('Ensemble weights updated', {
                weights: Object.fromEntries(weights)
            });
        } catch (error) {
            this.logger.error('Error updating ensemble weights', { error: error.message });
            throw error;
        }
    }

    /**
     * Evaluates if a prediction was correct
     * @param {Object} prediction The prediction
     * @param {Object} outcome The actual outcome
     * @returns {boolean} Whether the prediction was correct
     */
    evaluatePrediction(prediction, outcome) {
        return prediction.direction === outcome.direction;
    }

    /**
     * Updates performance tracking for a specific model
     * @param {string} model The model name
     * @param {boolean} correct Whether the prediction was correct
     */
    updateModelPerformance(model, correct) {
        const currentPerformance = this.modelPerformance.get(model) || 0.5;
        const alpha = 0.1; // Learning rate for performance update
        const newPerformance = currentPerformance * (1 - alpha) + (correct ? alpha : 0);
        this.modelPerformance.set(model, newPerformance);
    }

    /**
     * Calculates current overall performance
     * @returns {number} Performance score between 0 and 1
     */
    calculateCurrentPerformance() {
        if (!this.recentPerformance.length) return 0.5;
        const correct = this.recentPerformance.filter(x => x).length;
        return correct / this.recentPerformance.length;
    }

    /**
     * Prepares training data for online learning
     * @returns {Object} Training data batch
     */
    async prepareTrainingData() {
        try {
            // Get unique instruments from model performance tracking
            const instruments = new Set();
            for (const [model] of this.modelPerformance.entries()) {
                const [instrument] = model.split('_');
                instruments.add(instrument);
            }

            // Prepare training data for each instrument
            const allData = {
                features: [],
                labels: [],
                timestamps: []
            };

            for (const instrument of instruments) {
                const data = await this.dataCollector.prepareTrainingData(instrument);
                allData.features.push(...data.features);
                allData.labels.push(...data.labels);
                allData.timestamps.push(...data.timestamps);
            }

            return allData;
        } catch (error) {
            this.logger.error('Error preparing training data', { error: error.message });
            throw error;
        }
    }

    /**
     * Gets current model weights for ensemble prediction
     * @returns {Map<string, number>} Model weights
     */
    getModelWeights() {
        return new Map(this.modelWeights);
    }

    /**
     * Resets performance tracking
     */
    reset() {
        this.recentPerformance = [];
        this.modelPerformance.clear();
        this.modelWeights.clear();
        this.logger.info('Adaptive learning system reset');
    }
}

module.exports = AdaptiveLearningSystem; 