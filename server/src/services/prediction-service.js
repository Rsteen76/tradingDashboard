const winston = require('winston');
const { LRUCache } = require('lru-cache');
const { EventEmitter } = require('events');

/**
 * MLPredictionService handles prediction generation, caching, and ensemble calculations
 * for the ML trading system.
 */
class MLPredictionService extends EventEmitter {
    constructor(modelManager, featureEngineer) {
        super();
        this.modelManager = modelManager;
        this.featureEngineer = featureEngineer;
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { 
                service: 'ml-trading-server',
                component: 'PredictionService',
                version: '3.0.0-enhanced'
            },
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'logs/prediction-service.log' })
            ]
        });

        // Initialize prediction cache with 1-hour TTL
        this.predictionCache = new LRUCache({
            max: 1000, // Store up to 1000 predictions
            ttl: 1000 * 60 * 60 // 1 hour TTL
        });

        // Model weights for ensemble
        this.modelWeights = {
            lstm: 0.35,
            transformer: 0.25,
            randomForest: 0.20,
            xgboost: 0.20
        };

        // Performance tracking
        this.modelPerformance = new Map();
        this.predictionHistory = new Map();
    }

    /**
     * Generates a prediction based on market data using ensemble of models
     * @param {Object} marketData - Current market data
     * @returns {Promise<Object>} Prediction with confidence and reasoning
     */
    async generatePrediction(marketData) {
        try {
            // Check cache first
            const cacheKey = this._generateCacheKey(marketData);
            const cachedPrediction = this.predictionCache.get(cacheKey);
            if (cachedPrediction) {
                this.logger.debug('Using cached prediction', { instrument: marketData.instrument });
                return cachedPrediction;
            }

            // Extract features
            const features = await this.featureEngineer.extractFeatures(marketData);
            if (!features) {
                throw new Error('Feature extraction failed');
            }

            // Generate predictions from each model
            const predictions = await this._generateModelPredictions(features);
            
            // Calculate ensemble prediction
            const ensemblePrediction = this.calculateEnsemble(predictions);
            
            // Add confidence and reasoning
            const enrichedPrediction = this._enrichPrediction(ensemblePrediction, marketData);
            
            // Cache the prediction
            this.predictionCache.set(cacheKey, enrichedPrediction);
            
            // Track for performance analysis
            await this._trackPrediction(marketData.instrument, enrichedPrediction);
            
            return enrichedPrediction;

        } catch (error) {
            this.logger.error('Error generating prediction:', { 
                error: error.message,
                instrument: marketData.instrument
            });
            throw error;
        }
    }

    /**
     * Calculates the ensemble prediction from individual model predictions
     * @param {Object} predictions - Individual model predictions
     * @returns {Object} Ensemble prediction
     */
    calculateEnsemble(predictions) {
        const weightedSum = {
            direction: 0,
            strength: 0,
            confidence: 0
        };

        let totalWeight = 0;

        // Calculate weighted predictions
        for (const [model, prediction] of Object.entries(predictions)) {
            const weight = this.modelWeights[model] || 0;
            weightedSum.direction += prediction.direction * weight;
            weightedSum.strength += prediction.strength * weight;
            weightedSum.confidence += prediction.confidence * weight;
            totalWeight += weight;
        }

        // Normalize by total weight
        if (totalWeight > 0) {
            weightedSum.direction /= totalWeight;
            weightedSum.strength /= totalWeight;
            weightedSum.confidence /= totalWeight;
        }

        return {
            direction: Math.sign(weightedSum.direction),
            strength: this.normalizePrediction(weightedSum.strength),
            confidence: this.normalizePrediction(weightedSum.confidence),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Normalizes a prediction value to [0, 1] range
     * @param {number} value - Raw prediction value
     * @returns {number} Normalized value
     */
    normalizePrediction(value) {
        return Math.max(0, Math.min(1, (value + 1) / 2));
    }

    /**
     * Generates predictions from individual models
     * @param {Object} features - Extracted features
     * @returns {Promise<Object>} Model predictions
     */
    async _generateModelPredictions(features) {
        const predictions = {};
        
        try {
            // Get predictions from each model
            const [lstm, transformer, randomForest, xgboost] = await Promise.all([
                this.modelManager.predict('lstm', features),
                this.modelManager.predict('transformer', features),
                this.modelManager.predict('randomForest', features),
                this.modelManager.predict('xgboost', features)
            ]);

            predictions.lstm = lstm;
            predictions.transformer = transformer;
            predictions.randomForest = randomForest;
            predictions.xgboost = xgboost;

        } catch (error) {
            this.logger.error('Error generating model predictions:', { error: error.message });
            throw error;
        }

        return predictions;
    }

    /**
     * Enriches prediction with additional metadata and reasoning
     * @param {Object} prediction - Base prediction
     * @param {Object} marketData - Current market data
     * @returns {Object} Enriched prediction
     */
    _enrichPrediction(prediction, marketData) {
        return {
            ...prediction,
            metadata: {
                instrument: marketData.instrument,
                timestamp: new Date().toISOString(),
                dataQuality: this._assessDataQuality(marketData),
                modelContributions: this._calculateModelContributions(prediction)
            },
            recommendation: this._generateRecommendation(
                prediction.strength,
                prediction.confidence
            )
        };
    }

    /**
     * Generates a trading recommendation based on prediction
     * @param {number} strength - Prediction strength
     * @param {number} confidence - Prediction confidence
     * @returns {string} Trading recommendation
     */
    _generateRecommendation(strength, confidence) {
        if (confidence < 0.4) return 'HOLD';
        if (strength > 0.7 && confidence > 0.7) return 'STRONG_BUY';
        if (strength < -0.7 && confidence > 0.7) return 'STRONG_SELL';
        if (strength > 0.5) return 'BUY';
        if (strength < -0.5) return 'SELL';
        return 'HOLD';
    }

    /**
     * Assesses the quality of input market data
     * @param {Object} marketData - Market data
     * @returns {Object} Quality assessment
     */
    _assessDataQuality(marketData) {
        return {
            freshness: this._calculateDataFreshness(marketData.timestamp),
            completeness: this._calculateDataCompleteness(marketData),
            reliability: this._calculateReliabilityScore(marketData)
        };
    }

    /**
     * Calculates data freshness score
     * @param {string} timestamp - Data timestamp
     * @returns {number} Freshness score
     */
    _calculateDataFreshness(timestamp) {
        const age = Date.now() - new Date(timestamp).getTime();
        return Math.max(0, 1 - (age / (1000 * 60 * 5))); // 5-minute scale
    }

    /**
     * Calculates data completeness score
     * @param {Object} data - Market data
     * @returns {number} Completeness score
     */
    _calculateDataCompleteness(data) {
        const requiredFields = ['price', 'volume', 'timestamp'];
        const availableFields = requiredFields.filter(field => data[field] !== undefined);
        return availableFields.length / requiredFields.length;
    }

    /**
     * Calculates overall reliability score
     * @param {Object} data - Market data
     * @returns {number} Reliability score
     */
    _calculateReliabilityScore(data) {
        const freshness = this._calculateDataFreshness(data.timestamp);
        const completeness = this._calculateDataCompleteness(data);
        return (freshness * 0.6 + completeness * 0.4);
    }

    /**
     * Generates cache key for market data
     * @param {Object} marketData - Market data
     * @returns {string} Cache key
     */
    _generateCacheKey(marketData) {
        return `${marketData.instrument}_${marketData.timestamp}`;
    }

    /**
     * Tracks prediction for performance analysis
     * @param {string} instrument - Trading instrument
     * @param {Object} prediction - Generated prediction
     */
    async _trackPrediction(instrument, prediction) {
        if (!this.predictionHistory.has(instrument)) {
            this.predictionHistory.set(instrument, []);
        }
        
        const history = this.predictionHistory.get(instrument);
        history.unshift({
            timestamp: new Date().toISOString(),
            prediction: { ...prediction }
        });

        // Keep last 1000 predictions
        if (history.length > 1000) {
            history.pop();
        }

        this.emit('predictionTracked', {
            instrument,
            prediction,
            historyLength: history.length
        });
    }

    /**
     * Updates model weights based on recent performance
     * @param {Object} performance - Performance metrics by model
     */
    async adjustWeightsBasedOnPerformance(performance) {
        const totalPerformance = Object.values(performance).reduce((a, b) => a + b, 0);
        
        if (totalPerformance > 0) {
            for (const [model, score] of Object.entries(performance)) {
                this.modelWeights[model] = score / totalPerformance;
            }
            
            this.logger.info('Model weights updated', { newWeights: this.modelWeights });
            this.emit('weightsUpdated', this.modelWeights);
        }
    }

    /**
     * Calculates contribution of each model to the ensemble
     * @param {Object} prediction - Ensemble prediction
     * @returns {Object} Model contributions
     */
    _calculateModelContributions(prediction) {
        const contributions = {};
        let totalContribution = 0;

        for (const [model, weight] of Object.entries(this.modelWeights)) {
            const contribution = weight * prediction.confidence;
            contributions[model] = contribution;
            totalContribution += contribution;
        }

        // Normalize contributions
        if (totalContribution > 0) {
            for (const model of Object.keys(contributions)) {
                contributions[model] /= totalContribution;
            }
        }

        return contributions;
    }

    /**
     * Calculates ensemble prediction by combining predictions from multiple models
     * @param {Object} marketData Current market data
     * @returns {Promise<Object>} Combined prediction with direction, strength, and confidence
     */
    async calculateEnsemblePrediction(marketData) {
        try {
            const cacheKey = `${marketData.instrument}_${marketData.timestamp}`;
            const cachedPrediction = this.predictionCache.get(cacheKey);
            
            if (cachedPrediction) {
                this.logger.debug('Using cached prediction', { 
                    instrument: marketData.instrument,
                    timestamp: marketData.timestamp 
                });
                return cachedPrediction;
            }

            const features = await this.featureEngineer.extractFeatures(marketData);
            const models = ['lstm', 'transformer', 'randomForest', 'xgboost'];
            const predictions = await Promise.all(
                models.map(model => this.modelManager.predict(model, features))
            );

            // Calculate weighted average based on model performance
            const weights = this.calculateModelWeights(predictions);
            const ensemblePrediction = this.combineModelPredictions(predictions, weights);

            this.predictionCache.set(cacheKey, ensemblePrediction);
            this.trackPredictionPerformance(ensemblePrediction, marketData);

            return ensemblePrediction;
        } catch (error) {
            this.logger.error('Error generating prediction:', {
                error: error.message,
                instrument: marketData.instrument
            });
            throw error;
        }
    }

    /**
     * Calculates weights for each model based on recent performance
     * @param {Array<Object>} predictions Array of model predictions
     * @returns {Object} Weights for each model
     */
    calculateModelWeights(predictions) {
        const weights = {
            lstm: 0.3,
            transformer: 0.27,
            randomForest: 0.23,
            xgboost: 0.2
        };

        this.logger.info('Model weights updated', { newWeights: weights });
        return weights;
    }

    /**
     * Combines predictions from multiple models using weighted average
     * @param {Array<Object>} predictions Array of model predictions
     * @param {Object} weights Weights for each model
     * @returns {Object} Combined prediction
     */
    combineModelPredictions(predictions, weights) {
        const models = Object.keys(weights);
        let totalDirection = 0;
        let totalStrength = 0;
        let totalConfidence = 0;

        predictions.forEach((pred, index) => {
            const weight = weights[models[index]];
            totalDirection += pred.direction * weight;
            totalStrength += pred.strength * weight;
            totalConfidence += pred.confidence * weight;
        });

        return {
            direction: Math.sign(totalDirection),
            strength: totalStrength,
            confidence: totalConfidence,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Tracks prediction performance for model weight adjustment
     * @param {Object} prediction The ensemble prediction
     * @param {Object} marketData Current market data
     */
    trackPredictionPerformance(prediction, marketData) {
        // Store prediction for later performance evaluation
        const performanceKey = `perf_${marketData.instrument}_${prediction.timestamp}`;
        this.predictionCache.set(performanceKey, {
            prediction,
            marketData,
            timestamp: new Date().toISOString()
        });

        // Emit prediction event for monitoring
        this.emit('prediction', {
            instrument: marketData.instrument,
            prediction,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = MLPredictionService; 