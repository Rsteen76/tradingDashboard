const MLModelManager = require('../src/core/model-manager');
const fs = require('fs').promises;
const path = require('path');
const tf = require('@tensorflow/tfjs');

describe('MLModelManager', () => {
    let modelManager;
    const testModelsDir = path.join(process.cwd(), 'test-models');
    const testBackupDir = path.join(testModelsDir, 'backup');

    beforeEach(async () => {
        // Create test directories
        await fs.mkdir(testModelsDir, { recursive: true });
        await fs.mkdir(testBackupDir, { recursive: true });

        modelManager = new MLModelManager();
        modelManager.modelsDir = testModelsDir;
        modelManager.backupDir = testBackupDir;
    });

    afterEach(async () => {
        await modelManager.cleanup();
        // Clean up test directories
        await fs.rm(testModelsDir, { recursive: true, force: true });
    });

    describe('initialization', () => {
        it('should create model directories on initialization', async () => {
            await modelManager.initialize();
            
            const modelsDirExists = await fs.access(testModelsDir)
                .then(() => true)
                .catch(() => false);
            const backupDirExists = await fs.access(testBackupDir)
                .then(() => true)
                .catch(() => false);

            expect(modelsDirExists).toBe(true);
            expect(backupDirExists).toBe(true);
        });

        it('should emit initialized event after successful initialization', async () => {
            const initPromise = new Promise(resolve => {
                modelManager.once('initialized', resolve);
            });

            await modelManager.initialize();
            await initPromise;
        });
    });

    describe('model operations', () => {
        beforeEach(async () => {
            await modelManager.initialize();

            // Create a test model
            const model = tf.sequential({
                layers: [
                    tf.layers.dense({ units: 10, activation: 'relu', inputShape: [5] }),
                    tf.layers.dense({ units: 2, activation: 'sigmoid' })
                ]
            });

            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            // Save model files
            const modelConfig = {
                layers: model.layers.map(layer => ({
                    type: layer.getClassName().toLowerCase(),
                    config: layer.getConfig()
                })),
                compile: {
                    optimizer: model.optimizer.getConfig(),
                    loss: model.loss,
                    metrics: model.metrics
                }
            };

            const metadata = {
                version: 1,
                state: 'active',
                timestamp: new Date().toISOString()
            };

            // Get weight specifications and binary data
            const weights = model.getWeights();
            const weightSpecs = weights.map(w => ({
                shape: w.shape,
                dtype: w.dtype
            }));
            modelConfig.weightSpecs = weightSpecs;

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

            await fs.writeFile(
                path.join(testModelsDir, 'test_model.json'),
                JSON.stringify(modelConfig, null, 2)
            );

            await fs.writeFile(
                path.join(testModelsDir, 'test_model_metadata.json'),
                JSON.stringify(metadata, null, 2)
            );

            await fs.writeFile(
                path.join(testModelsDir, 'test_model.weights.bin'),
                weightsBuffer
            );

            model.dispose();
        });

        it('should load models from directory', async () => {
            await modelManager.loadModels();
            expect(modelManager.models.has('test_model')).toBe(true);
            expect(modelManager.modelVersions.get('test_model')).toBe(1);
            expect(modelManager.modelStates.get('test_model')).toBe('active');
        });

        it('should save model with binary weights', async () => {
            const model = tf.sequential({
                layers: [
                    tf.layers.dense({ units: 10, activation: 'relu', inputShape: [5] }),
                    tf.layers.dense({ units: 2, activation: 'sigmoid' })
                ]
            });

            model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            modelManager.models.set('new_model', model);
            modelManager.modelVersions.set('new_model', 1);
            modelManager.modelStates.set('new_model', 'active');

            await modelManager.saveModel('new_model');

            const modelExists = await fs.access(path.join(testModelsDir, 'new_model.json'))
                .then(() => true)
                .catch(() => false);
            const metadataExists = await fs.access(path.join(testModelsDir, 'new_model_metadata.json'))
                .then(() => true)
                .catch(() => false);
            const weightsExist = await fs.access(path.join(testModelsDir, 'new_model.weights.bin'))
                .then(() => true)
                .catch(() => false);

            expect(modelExists).toBe(true);
            expect(metadataExists).toBe(true);
            expect(weightsExist).toBe(true);

            const metadata = JSON.parse(
                await fs.readFile(path.join(testModelsDir, 'new_model_metadata.json'), 'utf8')
            );

            expect(metadata.version).toBe(1);
            expect(metadata.state).toBe('active');

            // Verify weights file is binary
            const stats = await fs.stat(path.join(testModelsDir, 'new_model.weights.bin'));
            expect(stats.size % 4).toBe(0); // Should be multiple of 4 bytes (float32)
        });

        it('should make predictions with loaded model', async () => {
            await modelManager.loadModels();
            const features = Array(5).fill(0.5);
            const prediction = await modelManager.predict('test_model', features);

            expect(prediction).toHaveProperty('direction');
            expect(prediction).toHaveProperty('strength');
            expect(prediction).toHaveProperty('confidence');
            expect([-1, 0, 1]).toContain(prediction.direction);
            expect(prediction.strength).toBeGreaterThanOrEqual(0);
            expect(prediction.strength).toBeLessThanOrEqual(1);
            expect(prediction.confidence).toBeGreaterThanOrEqual(0);
            expect(prediction.confidence).toBeLessThanOrEqual(1);
        });

        it('should update model weights', async () => {
            await modelManager.loadModels();
            const model = modelManager.models.get('test_model');
            const weights = model.getWeights().map(w => ({
                data: Array.from(w.dataSync()),
                shape: w.shape
            }));

            // Modify weights slightly
            weights.forEach(w => {
                w.data = w.data.map(v => v * 1.1);
            });

            await modelManager.updateModel('test_model', weights);

            expect(modelManager.modelVersions.get('test_model')).toBe(2);

            // Verify weights were updated
            const updatedWeights = model.getWeights();
            weights.forEach((w, i) => {
                const updated = Array.from(updatedWeights[i].dataSync());
                expect(updated).not.toEqual(w.data);
            });
        });

        it('should properly clean up tensors on error', async () => {
            const initialTensors = tf.memory().numTensors;
            
            // Try to load non-existent model
            await expect(modelManager.loadModel('nonexistent_model'))
                .rejects
                .toThrow();
            
            // Check no tensor leaks
            expect(tf.memory().numTensors).toBe(initialTensors);
        });

        it('should properly clean up tensors after predictions', async () => {
            await modelManager.loadModels();
            const initialTensors = tf.memory().numTensors;
            
            const features = Array(5).fill(0.5);
            await modelManager.predict('test_model', features);
            
            // Check no tensor leaks
            expect(tf.memory().numTensors).toBe(initialTensors);
        });
    });

    describe('error handling', () => {
        it('should throw error when model not found', async () => {
            await expect(modelManager.predict('nonexistent_model', []))
                .rejects
                .toThrow('Model nonexistent_model not found');
        });

        it('should handle model loading errors', async () => {
            await fs.writeFile(
                path.join(testModelsDir, 'invalid_model.json'),
                'invalid json'
            );

            await fs.writeFile(
                path.join(testModelsDir, 'invalid_model_metadata.json'),
                'invalid json'
            );

            await expect(modelManager.loadModel('invalid_model'))
                .rejects
                .toThrow();
        });

        it('should handle invalid layer types', async () => {
            const modelConfig = {
                layers: [{
                    type: 'nonexistentlayer',
                    config: {}
                }]
            };

            await fs.writeFile(
                path.join(testModelsDir, 'invalid_layer_model.json'),
                JSON.stringify(modelConfig)
            );

            await fs.writeFile(
                path.join(testModelsDir, 'invalid_layer_model_metadata.json'),
                JSON.stringify({ version: 1, state: 'active' })
            );

            await expect(modelManager.loadModel('invalid_layer_model'))
                .rejects
                .toThrow('Unsupported layer type: nonexistentlayer');
        });

        it('should handle corrupted weight files', async () => {
            // Create model with invalid weights
            await fs.writeFile(
                path.join(testModelsDir, 'corrupt_model.json'),
                JSON.stringify({
                    layers: [{
                        type: 'dense',
                        config: { units: 1, activation: 'linear', inputShape: [1] }
                    }],
                    weightSpecs: [{ shape: [1, 1], dtype: 'float32' }]
                })
            );

            await fs.writeFile(
                path.join(testModelsDir, 'corrupt_model_metadata.json'),
                JSON.stringify({ version: 1, state: 'active' })
            );

            await fs.writeFile(
                path.join(testModelsDir, 'corrupt_model.weights.bin'),
                Buffer.from([1, 2, 3]) // Invalid size
            );

            await expect(modelManager.loadModel('corrupt_model'))
                .rejects
                .toThrow();
        });
    });
}); 