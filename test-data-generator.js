const net = require('net')

// Test client to simulate NinjaTrader sending data
const client = new net.Socket()

client.connect(9999, 'localhost', () => {
  console.log('🎯 Connected to ML Dashboard Server')
  
  // Send instrument registration
  const registration = {
    type: 'instrument_registration',
    instrument: 'ES 12-25',
    timestamp: new Date().toISOString(),
    strategy_instance_id: 'ES_TEST_' + Date.now(),
    strategy_name: 'ScalperProWithML',
    tick_size: 0.25,
    point_value: 50,
    order_quantity: 1,
    risk_reward_ratio: 3.0
  }
  
  client.write(JSON.stringify(registration) + '\\n')
  console.log('📡 Sent instrument registration')
  
  // Send periodic strategy status updates
  setInterval(() => {
    const statusData = {
      type: 'strategy_status',
      instrument: 'ES 12-25',
      timestamp: new Date().toISOString(),
      price: 5850 + (Math.random() - 0.5) * 20, // Random price around 5850
      signal_strength: Math.random() * 100,
      ml_probability: Math.random() * 100,
      rsi_current: 30 + Math.random() * 40, // RSI between 30-70
      ema_alignment: (Math.random() - 0.5) * 180, // -90 to +90 degrees
      realized_pnl: (Math.random() - 0.5) * 500, // Random P&L
      position_status: ['FLAT', 'LONG', 'SHORT'][Math.floor(Math.random() * 3)],
      volume_ratio: 0.8 + Math.random() * 0.4,
      signal_type: ['momentum', 'reversal', 'breakout'][Math.floor(Math.random() * 3)],
      htf_bias: Math.random() > 0.5 ? 'Bullish' : 'Bearish',
      volatility_state: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      connection_status: 'Connected'
    }
    
    client.write(JSON.stringify(statusData) + '\\n')
    console.log('📊 Sent status update - Price:', statusData.price.toFixed(2), 'Signal:', statusData.signal_strength.toFixed(1) + '%')
    
    // Occasionally send signals
    if (Math.random() > 0.8) {
      const signal = {
        type: 'strategy_signal',
        instrument: 'ES 12-25',
        timestamp: new Date().toISOString(),
        direction: Math.random() > 0.5 ? 'LONG' : 'SHORT',
        price: statusData.price,
        signal_type: 'momentum',
        executed: Math.random() > 0.3,
        signal_strength: statusData.signal_strength,
        ml_probability: statusData.ml_probability
      }
      
      client.write(JSON.stringify(signal) + '\\n')
      console.log('🎯 Sent signal:', signal.direction, 'at', signal.price.toFixed(2))
    }
    
  }, 2000) // Send update every 2 seconds
})

client.on('error', (err) => {
  console.error('❌ Connection error:', err.message)
})

client.on('close', () => {
  console.log('📤 Connection closed')
})

console.log('🧪 Starting test data generator...')
console.log('📡 Connecting to localhost:9999...')
