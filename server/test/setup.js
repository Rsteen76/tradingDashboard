const tf = require('@tensorflow/tfjs');

// Configure TensorFlow.js to use CPU backend
tf.setBackend('cpu');

// Clean up any remaining tensors after each test
afterEach(async () => {
    // Force garbage collection of tensors
    tf.tidy(() => {});
    
    // Verify no memory leaks
    const memoryInfo = tf.memory();
    if (memoryInfo.numTensors > 0) {
        console.warn(`Memory leak detected: ${memoryInfo.numTensors} tensors remaining`);
        console.warn('Memory info:', memoryInfo);
    }
});

// Global test timeout of 10 seconds
jest.setTimeout(10000); 