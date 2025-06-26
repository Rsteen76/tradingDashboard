const winston = require('winston');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const tf = require('@tensorflow/tfjs');

// Configure TensorFlow.js to use CPU backend
tf.setBackend('cpu');

/**
 * MLModelManager handles model loading, versioning, updates, and persistence
 * for the ML trading system.
 */
class MLModelManager extends EventEmitter {
    constructor() {
        super();
        this.models = new Map();
        this.modelVersions = new Map();
        this.modelStates = new Map();
        this.trainingStatus = new Map();
        this.modelsDir = path.join(process.cwd(), 'models');
        this.backupDir = path.join(this.modelsDir, 'backup');
        
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { 
                service: 'ml-trading-server',
                component: 'ModelManager'
            },
            transports: [
                new winston.transports.File({ filename: 'logs/model-manager.log' })
            ]
        });

        // Initialize TensorFlow memory tracking
        this.tensorCounts = new Map();
        this.enableMemoryTracking();
    }

    enableMemoryTracking() {
        // Log memory stats periodically
        setInterval(() => {
            const memoryInfo = tf.memory();
            this.logger.debug('TensorFlow memory stats', {
                numTensors: memoryInfo.numTensors,
                numDataBuffers: memoryInfo.numDataBuffers,
                unreliable: memoryInfo.unreliable,
                reasons: memoryInfo.reasons
            });
        }, 60000); // Check every minute
    }

    async initialize() {
        await fs.mkdir(this.modelsDir, { recursive: true });
        await fs.mkdir(this.backupDir, { recursive: true });
        await this.loadModels();
        this.emit('initialized');
    }

    async loadModels() {
        const files = await fs.readdir(this.modelsDir);
        const modelFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('_metadata.json'));

        for (const file of modelFiles) {
            const modelName = path.basename(file, '.json');
            await this.loadModel(modelName);
        }
    }

    async loadModel(modelName) {
        let model = null;
        let weightTensors = [];
        
        try {
            const modelPath = path.join(this.modelsDir, `${modelName}.json`);
            const metadataPath = path.join(this.modelsDir, `${modelName}_metadata.json`);
            const weightsPath = path.join(this.modelsDir, `${modelName}.weights.bin`);
            
            // Load model metadata
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            // Load model architecture
            const modelConfig = JSON.parse(await fs.readFile(modelPath, 'utf8'));
            model = tf.sequential();
            
            // Reconstruct model from config
            for (const layer of modelConfig.layers) {
                const layerType = layer.type.toLowerCase();
                if (!tf.layers[layerType]) {
                    throw new Error(`Unsupported layer type: ${layerType}`);
                }
                model.add(tf.layers[layerType](layer.config));
            }
            
            // Create and configure optimizer with CPU-compatible settings
            let optimizer;
            if (modelConfig.compile?.optimizer) {
                const optimizerConfig = modelConfig.compile.optimizer;
                const learningRate = optimizerConfig.config?.learningRate || 0.001;
                
                switch (optimizerConfig.className.toLowerCase()) {
                    case 'adam':
                        optimizer = tf.train.adam(learningRate);
                        break;
                    case 'sgd':
                        optimizer = tf.train.sgd(learningRate);
                        break;
                    case 'rmsprop':
                        optimizer = tf.train.rmsprop(learningRate);
                        break;
                    default:
                        optimizer = tf.train.adam(0.001);
                }
            } else {
                optimizer = tf.train.adam(0.001);
            }
            
            // Compile model with optimizer
            model.compile({
                optimizer: optimizer,
                loss: modelConfig.compile?.loss || 'meanSquaredError',
                metrics: modelConfig.compile?.metrics || ['accuracy']
            });
            
            // Load weights if they exist
            if (await fs.access(weightsPath).then(() => true).catch(() => false)) {
                const weightsBuffer = await fs.readFile(weightsPath);
                const weightSpecs = modelConfig.weightSpecs || [];
                
                try {
                    let offset = 0;
                    weightTensors = weightSpecs.map(spec => {
                        const size = spec.shape.reduce((a, b) => a * b, 1);
                        const values = new Float32Array(
                            weightsBuffer.buffer,
                            offset,
                            size
                        );
                        offset += size * 4; // 4 bytes per float32
                        return tf.tensor(values, spec.shape, spec.dtype);
                    });
                    
                    model.setWeights(weightTensors);
                    
                    // Clean up weight tensors after setting them
                    weightTensors.forEach(t => {
                        if (t && t.dispose) t.dispose();
                    });
                    weightTensors = [];
                } catch (error) {
                    // Clean up on weight loading error
                    weightTensors.forEach(t => {
                        if (t && t.dispose) t.dispose();
                    });
                    throw error;
                }
            }

            this.models.set(modelName, model);
            this.modelVersions.set(modelName, metadata.version);
            this.modelStates.set(modelName, metadata.state);
            this.tensorCounts.set(modelName, tf.memory().numTensors);
            
            this.logger.info('Model loaded successfully', {
                model: modelName,
                version: metadata.version,
                state: metadata.state,
                tensors: tf.memory().numTensors,
                backend: tf.getBackend()
            });
        } catch (error) {
            // Clean up on error
            if (model && model.dispose) {
                model.dispose();
            }
            weightTensors.forEach(t => {
                if (t && t.dispose) t.dispose();
            });
            
            this.logger.error('Error loading model', {
                model: modelName,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async saveModel(modelName) {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Model ${modelName} not found`);
        }

        try {
            const modelPath = path.join(this.modelsDir, `${modelName}.json`);
            const metadataPath = path.join(this.modelsDir, `${modelName}_metadata.json`);
            const weightsPath = path.join(this.modelsDir, `${modelName}.weights.bin`);

            // Save model architecture and compilation config
            const modelConfig = {
                layers: model.layers.map(layer => ({
                    type: layer.getClassName().toLowerCase(),
                    config: layer.getConfig()
                })),
                compile: model.optimizer ? {
                    optimizer: model.optimizer.getConfig(),
                    loss: model.loss,
                    metrics: model.metrics
                } : null
            };

            // Get weight specifications
            const weights = model.getWeights();
            const weightSpecs = weights.map(w => ({
                shape: w.shape,
                dtype: w.dtype
            }));
            modelConfig.weightSpecs = weightSpecs;

            // Save model architecture
            await fs.writeFile(modelPath, JSON.stringify(modelConfig, null, 2));

            // Save weights as binary
            const totalSize = weights.reduce((sum, w) => 
                sum + w.size * Float32Array.BYTES_PER_ELEMENT, 0);
            const weightsBuffer = Buffer.alloc(totalSize);
            
            let offset = 0;
            weights.forEach(w => {
                const values = w.dataSync();
                const bytes = new Uint8Array(values.buffer);
                weightsBuffer.set(bytes, offset);
                offset += bytes.length;
            });
            
            await fs.writeFile(weightsPath, weightsBuffer);

            // Save metadata
            const metadata = {
                version: this.modelVersions.get(modelName) || 1,
                state: this.modelStates.get(modelName) || 'active',
                timestamp: new Date().toISOString()
            };
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            this.logger.info('Model saved successfully', {
                model: modelName,
                version: metadata.version,
                state: metadata.state
            });
        } catch (error) {
            this.logger.error('Error saving model', {
                model: modelName,
                error: error.message
            });
            throw error;
        }
    }

    async predict(modelName, features) {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Model ${modelName} not found`);
        }

        let inputTensor = null;
        try {
            // Convert input to tensor with CPU backend
            inputTensor = tf.tensor2d(features, [1, features.length]);
            
            // Make prediction
            const prediction = await model.predict(inputTensor);
            
            // Get prediction data and clean up
            const result = await prediction.data();
            prediction.dispose();
            
            const rawResult = Array.from(result);
            
            // Convert raw prediction to structured format based on model type
            return this.formatPrediction(modelName, rawResult);
        } catch (error) {
            this.logger.error('Prediction error', {
                model: modelName,
                error: error.message,
                backend: tf.getBackend()
            });
            throw error;
        } finally {
            // Clean up input tensor
            if (inputTensor && inputTensor.dispose) {
                inputTensor.dispose();
            }
            // Force immediate garbage collection
            tf.tidy(() => {});
        }
    }

    formatPrediction(modelName, rawResult) {
        // Format raw model output into structured prediction object
        switch (modelName) {
            case 'lstm':
                return {
                    priceDirection: rawResult[0] || 0.5,
                    confidence: Math.abs(rawResult[0] - 0.5) * 2 || 0.1,
                    volatility: rawResult[1] || 0.5
                };
            
            case 'transformer':
                return {
                    trendStrength: rawResult[0] || 0.5,
                    reversalProbability: rawResult[1] || 0.5,
                    confidence: Math.max(...rawResult) || 0.1
                };
            
            case 'randomForest':
                return {
                    direction: rawResult[0] > 0.5 ? 1 : -1,
                    confidence: Math.abs(rawResult[0] - 0.5) * 2 || 0.1
                };
            
            case 'xgboost':
                return {
                    direction: rawResult[0] > 0.5 ? 1 : -1,
                    confidence: Math.abs(rawResult[0] - 0.5) * 2 || 0.1
                };
            
            case 'dqn':
                return {
                    action: rawResult.indexOf(Math.max(...rawResult)),
                    qValues: rawResult
                };
            
            default:
                // Generic format for unknown models
                return {
                    direction: rawResult[0] > 0.5 ? 1 : -1,
                    confidence: Math.abs(rawResult[0] - 0.5) * 2 || 0.1,
                    rawOutput: rawResult
                };
        }
    }

    async updateModel(modelName, weights) {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Model ${modelName} not found`);
        }

        let weightTensors = [];
        try {
            // Convert weights to tensors using CPU backend
            weightTensors = weights.map(w => tf.tensor(w.values, w.shape));
            
            // Update model weights
            model.setWeights(weightTensors);
            
            // Increment version
            const currentVersion = this.modelVersions.get(modelName) || 1;
            this.modelVersions.set(modelName, currentVersion + 1);
            
            // Save updated model
            await this.saveModel(modelName);
            
            this.logger.info('Model updated successfully', {
                model: modelName,
                version: currentVersion + 1,
                backend: tf.getBackend()
            });
        } catch (error) {
            this.logger.error('Error updating model', {
                model: modelName,
                error: error.message,
                backend: tf.getBackend()
            });
            throw error;
        } finally {
            // Clean up weight tensors
            weightTensors.forEach(t => {
                if (t && t.dispose) t.dispose();
            });
            // Force immediate garbage collection
            tf.tidy(() => {});
        }
    }

    cleanup() {
        try {
            // Dispose all models
            for (const [modelName, model] of this.models.entries()) {
                if (model && model.dispose) {
                    const beforeCount = tf.memory().numTensors;
                    model.dispose();
                    const afterCount = tf.memory().numTensors;
                    
                    this.logger.info('Model cleanup', {
                        model: modelName,
                        tensorsFreed: beforeCount - afterCount,
                        backend: tf.getBackend()
                    });
                }
            }
            
            // Clear all maps
            this.models.clear();
            this.modelVersions.clear();
            this.modelStates.clear();
            this.tensorCounts.clear();
            
            // Force garbage collection
            tf.tidy(() => {});
            
            this.logger.info('Cleanup complete', {
                remainingTensors: tf.memory().numTensors,
                backend: tf.getBackend()
            });
        } catch (error) {
            this.logger.error('Cleanup error', {
                error: error.message,
                backend: tf.getBackend()
            });
            throw error;
        }
    }
}

module.exports = MLModelManager;