// Check Pre-flight Status - Debugging Tool
const path = require('path');

// Mock the logger first
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

// Mock dependencies
const mockDependencies = {
  mlEngine: null,
  advancedAI: null,
  profitMaximizer: null,
  positionManager: null,
  ninjaService: null, // This is null - one reason for pre-flight failures
  adaptiveLearning: null,
  dataCollector: null
};

async function checkPreflightStatus() {
  try {
    console.log('🔍 Analyzing Pre-flight Check Failures...\n');
    
    // Load the Bombproof system
    const BombproofAITradingSystem = require('./server/src/core/bombproof-ai-trading');
    const system = new BombproofAITradingSystem(mockDependencies);
    
    // Initialize the system
    await system.initialize();
    
    // Create mock market data for testing
    const mockMarketData = {
      instrument: 'NQ',
      price: 15000,
      volume: 1000,
      atr: 150,
      rsi: 50,
      timestamp: new Date().toISOString(),
      trend: 'up'
    };
    
    console.log('📊 Mock Market Data:', mockMarketData);
    console.log('\n🛡️ Running Pre-flight Checks...\n');
    
    // Run pre-flight checks and see what fails
    const preflightResult = await system.runPreflightChecks(mockMarketData);
    
    console.log('📋 Pre-flight Results:');
    console.log(`   Status: ${preflightResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Failed Checks: ${preflightResult.reasons.length}`);
    
    if (preflightResult.reasons.length > 0) {
      console.log('\n🚨 Specific Failures:');
      preflightResult.reasons.forEach((reason, i) => {
        console.log(`   ${i + 1}. ${reason}`);
      });
    }
    
    // Check system health components
    console.log('\n🔧 System Component Status:');
    console.log(`   ML Engine: ${system.mlEngine ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   NinjaTrader: ${system.ninjaService ? (system.ninjaService.isConnected ? '✅ Connected' : '⚠️ Available but not connected') : '❌ Not Available'}`);
    console.log(`   Position Manager: ${system.positionManager ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   Profit Maximizer: ${system.profitMaximizer ? '✅ Available' : '❌ Not Available'}`);
    
    // Check risk state
    console.log('\n💰 Risk Management State:');
    console.log(`   Daily P&L: $${system.riskState.dailyPnL}`);
    console.log(`   Daily Trade Count: ${system.riskState.dailyTradeCount}/${system.riskState.maxDailyTrades}`);
    console.log(`   Consecutive Losses: ${system.riskState.consecutiveLosses}/${system.riskState.maxConsecutiveLosses}`);
    console.log(`   Max Daily Loss: $${system.riskState.maxDailyLoss}`);
    
    // Check data quality
    console.log('\n📈 Data Quality Assessment:');
    const dataQuality = system.assessDataQuality(mockMarketData);
    console.log(`   Score: ${(dataQuality.score * 100).toFixed(1)}%`);
    if (dataQuality.issues.length > 0) {
      console.log(`   Issues: ${dataQuality.issues.join(', ')}`);
    }
    
    console.log('\n💡 Recommendations:');
    if (!system.ninjaService) {
      console.log('   • NinjaTrader service not connected - this is normal in paper mode');
    }
    if (dataQuality.score < 0.8) {
      console.log('   • Improve data quality for better trade evaluation');
    }
    if (system.riskState.dailyPnL <= system.riskState.maxDailyLoss) {
      console.log('   • Daily loss limit reached - system is protecting capital');
    }
    
    console.log('\n📋 Current Configuration:');
    console.log(`   Paper Mode: ${process.env.PAPER_MODE || 'true'}`);
    console.log(`   Auto Trading: ${process.env.AUTO_TRADING || 'false'}`);
    console.log(`   Min Confidence: ${system.confidenceThresholds.current}`);
    
    await system.stop();
    
  } catch (error) {
    console.error('❌ Error analyzing pre-flight status:', error.message);
  }
}

checkPreflightStatus(); 