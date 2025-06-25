const net = require('net');

// Test trade levels data transmission
function testTradeLevels() {
  const client = new net.Socket();
  
  client.connect(9999, 'localhost', () => {
    console.log('🔗 Connected to ML server');
    
    // Test data with trade levels
    const testData = {
      type: 'strategy_status',
      instrument: 'NQ 03-25',
      price: 21500.25,
      position: 'LONG',
      position_size: 2,
      entry_price: 21495.50,
      stop_loss: 21485.75,
      target1: 21510.25,
      target2: 21525.50,
      rsi: 45.2,
      ema_alignment_score: 25.5,
      atr: 12.50,
      signal_strength: 75.3,
      ml_long_probability: 0.72,
      ml_short_probability: 0.28,
      ml_confidence_level: 0.68,
      pnl: 9.50,
      timestamp: new Date().toISOString(),
      bid: 21500.00,
      ask: 21500.50,
      spread: 0.50,
      volume: 1250
    };
    
    console.log('📤 Sending test data with trade levels:');
    console.log('   Stop Loss:', testData.stop_loss);
    console.log('   Target 1:', testData.target1);
    console.log('   Target 2:', testData.target2);
    console.log('   Position:', testData.position);
    console.log('   Entry Price:', testData.entry_price);
    console.log('   Current Price:', testData.price);
    
    client.write(JSON.stringify(testData) + '\n');
    
    setTimeout(() => {
      client.destroy();
      console.log('✅ Test completed - check your dashboard for trade levels!');
    }, 2000);
  });
  
  client.on('data', (data) => {
    console.log('📥 Received response:', data.toString());
  });
  
  client.on('error', (err) => {
    console.error('❌ Connection error:', err.message);
  });
  
  client.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

console.log('🧪 Starting trade levels test...');
testTradeLevels(); 