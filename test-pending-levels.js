const net = require('net');

// Test pending trade levels (when not in position)
function testPendingLevels() {
  const client = new net.Socket();
  
  client.connect(9999, 'localhost', () => {
    console.log('🔗 Connected to ML server');
    
    // Test data with trade levels but no position
    const testData = {
      type: 'strategy_status',
      instrument: 'NQ 03-25',
      price: 21500.25,
      position: 'FLAT',
      position_size: 0,
      entry_price: 0,
      stop_loss: 21485.75,  // Stop level for next trade
      target1: 21510.25,    // First target
      target2: 21525.50,    // Second target
      rsi: 52.8,
      ema_alignment_score: 15.2,
      atr: 12.50,
      signal_strength: 65.8,
      ml_long_probability: 0.62,
      ml_short_probability: 0.38,
      ml_confidence_level: 0.58,
      pnl: 0,
      timestamp: new Date().toISOString(),
      bid: 21500.00,
      ask: 21500.50,
      spread: 0.50,
      volume: 850
    };
    
    console.log('📤 Sending pending trade levels data:');
    console.log('   Position: FLAT (no position)');
    console.log('   Stop Level:', testData.stop_loss);
    console.log('   Target 1:', testData.target1);
    console.log('   Target 2:', testData.target2);
    console.log('   Current Price:', testData.price);
    console.log('   -> Should show "Pending Trade Levels" panel');
    
    client.write(JSON.stringify(testData) + '\n');
    
    setTimeout(() => {
      client.destroy();
      console.log('✅ Test completed - check for "Pending Trade Levels" panel!');
    }, 2000);
  });
  
  client.on('error', (err) => {
    console.error('❌ Connection error:', err.message);
  });
  
  client.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

console.log('🧪 Testing pending trade levels...');
testPendingLevels(); 