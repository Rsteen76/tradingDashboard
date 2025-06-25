// Test P&L Calculation Accuracy
const io = require('socket.io-client');

function testPnLCalculation() {
  console.log('🧮 Testing P&L Calculation Accuracy');
  console.log('=====================================');
  
  // ES Contract specs: $50 per point, $12.50 per tick (0.25)
  const contractSpecs = {
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 50,
    displayName: 'ES'
  };
  
  // Test scenarios
  const testScenarios = [
    {
      name: 'ES Long Position - 2 Point Gain',
      entryPrice: 21495.50,
      currentPrice: 21497.50,
      positionSize: 1,
      position: 'LONG',
      expectedPnL: 100 // 2 points × $50 = $100
    },
    {
      name: 'ES Short Position - 1.5 Point Loss',
      entryPrice: 21495.50,
      currentPrice: 21497.00,
      positionSize: 1,
      position: 'SHORT',
      expectedPnL: -75 // 1.5 points × $50 = -$75 (loss for short)
    },
    {
      name: 'ES Long Position - 0.5 Point Gain, 2 Contracts',
      entryPrice: 21495.50,
      currentPrice: 21496.00,
      positionSize: 2,
      position: 'LONG',
      expectedPnL: 50 // 0.5 points × $50 × 2 contracts = $50
    },
    {
      name: 'ES Flat Position',
      entryPrice: 0,
      currentPrice: 21497.50,
      positionSize: 0,
      position: 'FLAT',
      expectedPnL: 0 // No position = $0 P&L
    }
  ];
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\n📊 Test ${index + 1}: ${scenario.name}`);
    console.log(`   Entry: $${scenario.entryPrice}`);
    console.log(`   Current: $${scenario.currentPrice}`);
    console.log(`   Size: ${scenario.positionSize} contracts`);
    console.log(`   Position: ${scenario.position}`);
    
    // Calculate P&L using dashboard logic
    let calculatedPnL = 0;
    
    if (scenario.positionSize > 0 && scenario.entryPrice > 0 && scenario.currentPrice > 0 && 
        !scenario.position.toLowerCase().includes('flat')) {
      const isLong = scenario.position.toUpperCase().includes('LONG');
      const pointDifference = isLong 
        ? (scenario.currentPrice - scenario.entryPrice) 
        : (scenario.entryPrice - scenario.currentPrice);
      
      calculatedPnL = pointDifference * scenario.positionSize * contractSpecs.pointValue;
    }
    
    console.log(`   Expected P&L: $${scenario.expectedPnL.toFixed(2)}`);
    console.log(`   Calculated P&L: $${calculatedPnL.toFixed(2)}`);
    
    const isCorrect = Math.abs(calculatedPnL - scenario.expectedPnL) < 0.01;
    console.log(`   Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    if (!isCorrect) {
      console.log(`   ⚠️  Difference: $${Math.abs(calculatedPnL - scenario.expectedPnL).toFixed(2)}`);
    }
  });
  
  console.log('\n🔍 Testing Distance Calculations...');
  
  // Test distance calculations
  const currentPrice = 21496.50;
  const stopLoss = 21494.00;
  const target1 = 21499.00;
  
  const stopDistance = Math.abs(currentPrice - stopLoss);
  const targetDistance = Math.abs(currentPrice - target1);
  
  console.log(`   Current Price: $${currentPrice}`);
  console.log(`   Stop Loss: $${stopLoss}`);
  console.log(`   Target 1: $${target1}`);
  console.log(`   Stop Distance: ${stopDistance.toFixed(2)} pts ($${(stopDistance * contractSpecs.pointValue).toFixed(0)})`);
  console.log(`   Target Distance: ${targetDistance.toFixed(2)} pts ($${(targetDistance * contractSpecs.pointValue).toFixed(0)})`);
  
  console.log('\n✅ P&L calculation tests completed!');
}

function sendTestDataToDashboard() {
  console.log('\n📡 Sending test data to dashboard...');
  
  const socket = io('http://localhost:8080');
  
  socket.on('connect', () => {
    console.log('Connected to ML Dashboard');
    
    // Send test data with correct P&L
    const testData = {
      instrument: 'ES 03-25',
      price: 21497.50,
      position: 'LONG',
      position_size: 1,
      entry_price: 21495.50,
      pnl: 100.00, // Correct P&L: 2 points × $50 = $100
      stop_loss: 21493.00,
      target1: 21500.00,
      target2: 21502.50,
      timestamp: new Date().toISOString(),
      strategy_name: 'ScalperProWithML',
      rsi: 45.2,
      ema_alignment: 25.5,
      signal_strength: 75.0
    };
    
    console.log('📊 Test Position Data:');
    console.log(`   Instrument: ${testData.instrument}`);
    console.log(`   Entry: $${testData.entry_price}`);
    console.log(`   Current: $${testData.price}`);
    console.log(`   Position: ${testData.position} ${testData.position_size} contract(s)`);
    console.log(`   P&L: $${testData.pnl} (should show $100 for 2-point gain)`);
    console.log(`   Stop: $${testData.stop_loss} (${Math.abs(testData.price - testData.stop_loss).toFixed(2)} pts)`);
    console.log(`   Target 1: $${testData.target1} (${Math.abs(testData.price - testData.target1).toFixed(2)} pts)`);
    
    socket.emit('strategy_data', testData);
    
    setTimeout(() => {
      console.log('\n✅ Test data sent to dashboard!');
      console.log('💡 Check your dashboard to verify P&L and distance calculations');
      socket.disconnect();
    }, 1000);
  });
  
  socket.on('connect_error', (error) => {
    console.log('❌ Failed to connect to dashboard:', error.message);
  });
}

// Run the tests
testPnLCalculation();
sendTestDataToDashboard(); 