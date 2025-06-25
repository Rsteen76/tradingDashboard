const net = require('net');

// Test market data handling
function testMarketData() {
  const client = new net.Socket();
  
  client.connect(9999, 'localhost', () => {
    console.log('🔗 Connected to ML server');
    
    // Test market data (similar to what caused the error)
    const testData = {
      type: 'market_data',
      timestamp: new Date().toISOString(),
      instrument: 'MNQ 09-25',
      price: 22375.25,
      ema5: 22377.1228117658,
      ema8: 22376.9789353811,
      ema13: 22375.8065886501,
      ema21: 22372.8368895792,
      ema50: 22360.511498057,
      rsi: 56.4098962182583,
      atr: 6.74233349934234,
      adx: 27.3193487853866,
      volume: 776,
      volume_ratio: 0.553890078515346,
      regime: 'Bullish'
    };
    
    console.log('📤 Sending market data:');
    console.log('   Type:', testData.type);
    console.log('   Instrument:', testData.instrument);
    console.log('   Price:', testData.price);
    console.log('   Volume:', testData.volume);
    
    client.write(JSON.stringify(testData) + '\n');
    
    setTimeout(() => {
      client.destroy();
      console.log('✅ Market data test completed - should not see handleMarketData error!');
    }, 2000);
  });
  
  client.on('error', (err) => {
    console.error('❌ Connection error:', err.message);
  });
  
  client.on('close', () => {
    console.log('🔌 Connection closed');
  });
}

console.log('🧪 Testing market data handling...');
testMarketData(); 