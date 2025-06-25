const AdaptiveLearningEngine = require('./server/adaptive-learning-engine')
const TradingDataCollector = require('./server/data-collector')

async function testLearningSystem() {
  console.log('🧪 Testing Learning System Components...')
  
  try {
    // Test Adaptive Learning Engine
    console.log('\n📊 Testing Adaptive Learning Engine...')
    const learningEngine = new AdaptiveLearningEngine()
    
    // Simulate trade data
    const mockTrade = {
      direction: 'LONG',
      entryPrice: 5850.25,
      exitPrice: 5855.75,
      pnl: 27.50,
      entryTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      exitTime: new Date().toISOString(),
      marketConditions: {
        volatility: 0.65,
        volume: 1250,
        trendStrength: 0.72,
        priceRange: 15.5
      },
      signalStrength: 75.5,
      mlConfidence: 0.82,
      indicators: {
        rsi: 45.2,
        ema_alignment: 0.68,
        momentum: 'bullish'
      }
    }
    
    await learningEngine.learnFromTrade(mockTrade)
    console.log('✅ Learning Engine: Trade processing successful')
    
    // Test performance insights
    const insights = learningEngine.generatePerformanceInsights()
    console.log('✅ Learning Engine: Performance insights generated')
    console.log('   - Strategy Metrics:', Object.keys(insights.overall || {}))
    
    // Test Data Collector
    console.log('\n📈 Testing Data Collector...')
    const dataCollector = new TradingDataCollector()
    
    // Simulate market data
    const mockMarketData = {
      instrument: 'ES 03-25',
      price: 5852.50,
      volume: 1150,
      bid: 5852.25,
      ask: 5852.75,
      rsi: 47.3,
      ema_fast: 5851.20,
      ema_slow: 5849.80,
      ema_alignment: 0.71,
      atr: 12.5,
      volume_sma: 1100
    }
    
    dataCollector.collectMarketData(mockMarketData)
    console.log('✅ Data Collector: Market data collection successful')
    
    // Simulate ML predictions
    const mockMLPredictions = {
      ml_long_probability: 0.68,
      ml_short_probability: 0.32,
      ml_confidence: 0.78,
      signal_strength: 72.5,
      technical_ai_score: 0.65,
      pattern_ai_score: 0.71,
      momentum_ai_score: 0.74,
      volume_ai_score: 0.59,
      market_regime: 'trending',
      pattern_detected: 'bullish_momentum'
    }
    
    dataCollector.collectMLPredictions(mockMLPredictions)
    console.log('✅ Data Collector: ML predictions collection successful')
    
    // Simulate trading signal
    const mockSignal = {
      type: 'entry',
      direction: 'LONG',
      price: 5852.50,
      strength: 75.5,
      confidence: 0.82,
      reasoning: 'Strong bullish momentum with ML confirmation',
      indicators_state: {
        rsi: 47.3,
        ema_alignment: 0.71,
        volume_strength: 'high'
      },
      market_context: {
        regime: 'trending',
        volatility: 'moderate',
        htf_bias: 'bullish'
      }
    }
    
    dataCollector.collectTradingSignal(mockSignal)
    console.log('✅ Data Collector: Trading signal collection successful')
    
    // Test trade outcome collection
    const mockTradeOutcome = {
      id: Date.now(),
      direction: 'LONG',
      entry_price: 5852.50,
      exit_price: 5857.25,
      entry_time: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
      exit_time: new Date().toISOString(),
      pnl: 23.75,
      exit_reason: 'target',
      max_favorable: 6.50,
      max_adverse: -1.25
    }
    
    dataCollector.collectTradeOutcome(mockTradeOutcome)
    console.log('✅ Data Collector: Trade outcome collection successful')
    
    // Test performance report generation
    console.log('\n📋 Testing Performance Analytics...')
    const performanceReport = await dataCollector.generatePerformanceReport()
    console.log('✅ Data Collector: Performance report generated')
    if (performanceReport.summary) {
      console.log('   - Total Trades:', performanceReport.summary.totalTrades)
      console.log('   - Win Rate:', (performanceReport.summary.winRate * 100).toFixed(1) + '%')
      console.log('   - Profit Factor:', performanceReport.summary.profitFactor.toFixed(2))
    }
    
    // Test pattern recognition
    console.log('\n🔍 Testing Pattern Recognition...')
    const marketData = {
      volatility: 0.65,
      volume: 1250,
      trendStrength: 0.72,
      priceRange: 15.5
    }
    
    learningEngine.updateMarketRegimeDetection(marketData)
    console.log('✅ Learning Engine: Market regime detection successful')
    console.log('   - Current Regime:', learningEngine.currentRegime)
    console.log('   - Confidence:', (learningEngine.regimeConfidence * 100).toFixed(1) + '%')
    
    // Test trading recommendations
    console.log('\n💡 Testing Trading Recommendations...')
    const recommendations = learningEngine.generateTradingRecommendations(marketData)
    console.log('✅ Learning Engine: Trading recommendations generated')
    console.log('   - Should Trade:', recommendations.shouldTrade)
    console.log('   - Confidence:', (recommendations.confidence * 100).toFixed(1) + '%')
    console.log('   - Risk Adjustment:', recommendations.riskAdjustment)
    
    console.log('\n🎉 All Learning System Tests Passed!')
    console.log('\n📊 System is ready to learn from real trading data!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testLearningSystem().then(() => {
  console.log('\n✅ Learning System Test Complete')
  process.exit(0)
}).catch(error => {
  console.error('❌ Learning System Test Failed:', error)
  process.exit(1)
}) 