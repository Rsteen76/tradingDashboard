const io = require('socket.io-client');
const axios = require('axios');

async function testAutomatedTrading() {
  console.log('🧪 Testing Automated Trading System...\n');
  
  try {
    // Connect to the dashboard
    const socket = io('http://localhost:3001');
    
    socket.on('connect', async () => {
      console.log('✅ Connected to ML server dashboard');
      
      // Test 1: Enable automated trading
      console.log('\n📋 Test 1: Enabling automated trading...');
      socket.emit('update_settings', {
        minConfidence: 0.3, // Low threshold for testing
        autoTradingEnabled: true
      }, (response) => {
        console.log('Settings response:', response);
        if (response.autoTradingEnabled) {
          console.log('✅ Automated trading ENABLED');
        } else {
          console.log('❌ Failed to enable automated trading');
        }
      });
      
      // Wait for settings to be applied
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Send mock market data to trigger evaluation
      console.log('\n📋 Test 2: Sending mock market data...');
      
      // Simulate market data that should trigger a trade
      const mockMarketData = {
        type: 'market_data',
        instrument: 'TEST_ES',
        price: 5000.25,
        volume: 1500,
        atr: 12.5,
        rsi: 65,
        ema_alignment: 25,
        bid: 5000.00,
        ask: 5000.50,
        timestamp: new Date().toISOString()
      };
      
      // Emit the market data
      socket.emit('market_data', mockMarketData);
      console.log('📊 Mock market data sent:', mockMarketData);
      
      // Test 3: Check for automated trading commands
      console.log('\n📋 Test 3: Listening for automated trading commands...');
      
      // Listen for any responses
      socket.on('prediction_result', (data) => {
        console.log('🎯 Prediction result:', data);
      });
      
      socket.on('trading_command', (data) => {
        console.log('🚀 AUTOMATED TRADING COMMAND:', data);
      });
      
      // Wait for responses
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test 4: Test with manual trade to compare
      console.log('\n📋 Test 4: Testing manual trade for comparison...');
      socket.emit('manual_trade', {
        command: 'go_long',
        instrument: 'TEST_ES',
        quantity: 1
      }, (response) => {
        console.log('Manual trade response:', response);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test 5: Disable automated trading
      console.log('\n📋 Test 5: Disabling automated trading...');
      socket.emit('update_settings', {
        autoTradingEnabled: false
      }, (response) => {
        console.log('Settings response:', response);
        if (!response.autoTradingEnabled) {
          console.log('✅ Automated trading DISABLED');
        } else {
          console.log('❌ Failed to disable automated trading');
        }
      });
      
      console.log('\n🏁 Test completed. Check server logs for automated trading activity.');
      console.log('💡 Key things to verify:');
      console.log('   - Server logs show "🤖 Evaluating automated trading opportunity"');
      console.log('   - ML predictions are being generated');
      console.log('   - Trading commands are sent to NinjaTrader when confidence > threshold');
      console.log('   - Manual trades work the same as before');
      
      process.exit(0);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Failed to connect to ML server:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAutomatedTrading(); 