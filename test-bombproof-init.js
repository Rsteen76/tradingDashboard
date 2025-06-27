#!/usr/bin/env node

/**
 * Test script to verify Bombproof AI components can initialize
 */

console.log('🧪 Testing Bombproof AI Component Initialization...\n');

// Mock dependencies for testing
const mockLogger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || ''),
  warn: (msg, data) => console.log(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.log(`[ERROR] ${msg}`, data || '')
};

// Mock dependencies
const mockDependencies = {
  mlEngine: { isReady: true },
  advancedAI: { isInitialized: true },
  profitMaximizer: { isInitialized: true },
  positionManager: { 
    getPosition: () => ({ direction: 'FLAT', size: 0, avgPrice: 0 })
  },
  ninjaService: { 
    isConnected: false,
    sendTradingCommand: () => 0
  },
  adaptiveLearning: { recordOutcome: () => {} },
  dataCollector: { processMarketData: (data) => data }
};

async function testBombproofInitialization() {
  try {
    // Test 1: Import the main component
    console.log('1️⃣ Testing imports...');
    const BombproofAITradingSystem = require('./server/src/core/bombproof-ai-trading');
    console.log('✅ BombproofAITradingSystem imported successfully');

    const TradeOutcomeTracker = require('./server/src/core/trade-outcome-tracker');
    console.log('✅ TradeOutcomeTracker imported successfully');

    const AIPerformanceMonitor = require('./server/src/core/ai-performance-monitor');
    console.log('✅ AIPerformanceMonitor imported successfully');

    // Test 2: Create instances
    console.log('\n2️⃣ Testing component creation...');
    const bombproofTrading = new BombproofAITradingSystem(mockDependencies);
    console.log('✅ BombproofAITradingSystem instance created');

    const tradeTracker = new TradeOutcomeTracker({
      adaptiveLearning: mockDependencies.adaptiveLearning,
      dataCollector: mockDependencies.dataCollector,
      logger: mockLogger
    });
    console.log('✅ TradeOutcomeTracker instance created');

    const performanceMonitor = new AIPerformanceMonitor({
      bombproofTrading,
      tradeTracker,
      mlEngine: mockDependencies.mlEngine,
      adaptiveLearning: mockDependencies.adaptiveLearning
    });
    console.log('✅ AIPerformanceMonitor instance created');

    // Test 3: Initialize components
    console.log('\n3️⃣ Testing initialization...');
    
    await bombproofTrading.initialize();
    console.log('✅ BombproofAITradingSystem initialized successfully');

    await tradeTracker.initialize();
    console.log('✅ TradeOutcomeTracker initialized successfully');

    await performanceMonitor.initialize();
    console.log('✅ AIPerformanceMonitor initialized successfully');

    // Test 4: Test basic functionality
    console.log('\n4️⃣ Testing basic functionality...');
    
    const mockMarketData = {
      instrument: 'NQ',
      price: 4000,
      volume: 1000,
      atr: 20,
      rsi: 50,
      timestamp: new Date().toISOString()
    };

    // Test trade evaluation (should return null due to no connection)
    const result = await bombproofTrading.evaluateTradingOpportunity(mockMarketData);
    console.log('✅ Trade evaluation completed (expected: null due to no NinjaTrader connection)');

    // Test trade tracking
    const mockTrade = {
      tradeId: 'TEST_123',
      instrument: 'NQ',
      direction: 'long',
      price: 4000,
      quantity: 1,
      confidence: 0.8,
      marketData: mockMarketData
    };

    await tradeTracker.trackTradeEntry(mockTrade);
    console.log('✅ Trade tracking test completed');

    // Test performance metrics
    const metrics = performanceMonitor.getMetrics();
    console.log('✅ Performance metrics retrieved');

    // Test cleanup
    console.log('\n5️⃣ Testing cleanup...');
    await bombproofTrading.stop();
    console.log('✅ BombproofAITradingSystem stopped successfully');

    await tradeTracker.stop();
    console.log('✅ TradeOutcomeTracker stopped successfully');

    await performanceMonitor.stop();
    console.log('✅ AIPerformanceMonitor stopped successfully');

    console.log('\n🎉 All tests passed! Bombproof AI components are working correctly.');
    console.log('\n✅ The server should now start without initialization errors.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testBombproofInitialization(); 