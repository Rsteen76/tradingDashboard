// Simple test to debug ML Engine
console.log('🧪 Starting ML Engine test...');

async function test() {
try {
  console.log('Loading MLEngine...');
  const MLEngine = require('./src/core/ml-engine');
  console.log('✅ MLEngine loaded');
  
  console.log('Loading logger...');
  const logger = require('./src/utils/logger');
  console.log('✅ Logger loaded');
  
  console.log('Creating ML Engine instance...');
  const mlEngine = new MLEngine({
    execThreshold: 0.7,
    autoTradingEnabled: false
  });
  console.log('✅ ML Engine instance created');
  
  console.log('Initializing ML Engine...');
  await mlEngine.initialize();
  console.log('✅ ML Engine initialized');
  
  console.log('Testing logger...');
  logger.info('Test log message');
  console.log('✅ Logger test complete');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
}

test(); 