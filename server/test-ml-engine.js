// server/test-ml-engine.js
// Test the extracted ML Engine

const MLEngine = require('./src/core/ml-engine');
const logger = require('./src/utils/logger');

async function testMLEngine() {
  try {
    logger.info('🧪 Testing ML Engine...');
    
    // Create and initialize ML Engine
    const mlEngine = new MLEngine({
      execThreshold: 0.7,
      autoTradingEnabled: false // Safe for testing
    });
    
    logger.info('Initializing ML Engine...');
    await mlEngine.initialize();
    
    logger.info('✅ ML Engine initialized successfully');
    
    // Test prediction generation
    const testMarketData = {
      instrument: 'NQ 03-25',
      price: 21500.50,
      rsi: 65.5,
      ema_alignment: 25.3,
      atr: 12.75,
      volume: 1250,
      timestamp: new Date().toISOString()
    };
    
    logger.info('Testing ML prediction...');
    const prediction = await mlEngine.generatePrediction(testMarketData);
    
    logger.info('✅ ML Prediction generated:', {
      direction: prediction.direction,
      confidence: `${(prediction.confidence * 100).toFixed(1)}%`,
      strength: `${(prediction.strength * 100).toFixed(1)}%`,
      recommendation: prediction.recommendation,
      processingTime: `${prediction.processingTime}ms`
    });
    
    // Test smart trailing
    const testPosition = {
      direction: 'long',
      entryPrice: 21500,
      currentPrice: 21520,
      profitPercent: 0.5,
      instrument: 'NQ 03-25'
    };
    
    logger.info('Testing smart trailing...');
    const trailingStop = await mlEngine.calculateSmartTrailing(testPosition, testMarketData);
    
    logger.info('✅ Smart trailing calculated:', {
      algorithm: trailingStop.algorithm,
      stopPrice: trailingStop.stopPrice,
      confidence: `${(trailingStop.confidence * 100).toFixed(1)}%`
    });
    
    // Test trading opportunity evaluation
    logger.info('Testing trading opportunity evaluation...');
    const tradingOpp = await mlEngine.evaluateTradingOpportunity(testMarketData);
    
    if (tradingOpp) {
      logger.info('✅ Trading opportunity found:', {
        command: tradingOpp.command,
        reason: tradingOpp.reason
      });
    } else {
      logger.info('✅ No trading opportunity (confidence below threshold)');
    }
    
    // Test settings update
    logger.info('Testing settings update...');
    const newSettings = mlEngine.updateSettings({
      execThreshold: 0.8,
      autoTradingEnabled: true
    });
    
    logger.info('✅ Settings updated:', newSettings);
    
    // Show ML Engine stats
    logger.info('✅ ML Engine stats:', mlEngine.stats);
    
    // Test stop
    await mlEngine.stop();
    logger.info('✅ ML Engine stopped gracefully');
    
    logger.info('');
    logger.info('🎉 ALL ML ENGINE TESTS PASSED!');
    logger.info('✅ Ready for full server integration');
    
  } catch (error) {
    logger.error('❌ ML Engine test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMLEngine();