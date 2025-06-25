const io = require('socket.io-client');

console.log('🔍 Testing ScalperPro Dashboard Connection...');

// Test ML Server connection
const testMLServer = () => {
  console.log('📡 Connecting to ML Server (port 8080)...');
  
  const socket = io('http://localhost:8080');
  
  socket.on('connect', () => {
    console.log('✅ ML Server connected successfully');
    console.log('📊 Listening for strategy data...');
  });
  
  socket.on('disconnect', () => {
    console.log('❌ ML Server disconnected');
  });
  
  socket.on('strategy_data', (data) => {
    console.log('📈 Strategy data received:', {
      instrument: data.instrument,
      price: data.price,
      position: data.position,
      pnl: data.pnl,
      timestamp: new Date(data.timestamp).toLocaleTimeString()
    });
  });
  
  socket.on('strategy_state', (state) => {
    console.log('🎯 Strategy state received:', {
      isActive: state.isActive,
      totalTrades: state.dailyStats?.totalTrades || 0,
      totalPnL: state.dailyStats?.totalPnL || 0
    });
  });
  
  socket.on('trade_execution', (trade) => {
    console.log('🔔 Trade execution:', trade);
  });
  
  socket.on('trade_completed', (trade) => {
    console.log('✅ Trade completed:', trade);
  });
  
  setTimeout(() => {
    socket.close();
    console.log('🔚 Test completed');
  }, 10000);
};

// Test Dashboard connection
const testDashboard = () => {
  console.log('🌐 Testing Dashboard (port 3000)...');
  
  const http = require('http');
  
  const req = http.get('http://localhost:3000', (res) => {
    console.log(`✅ Dashboard responding with status: ${res.statusCode}`);
  });
  
  req.on('error', (error) => {
    console.log('❌ Dashboard connection error:', error.message);
  });
};

// Run tests
testMLServer();
setTimeout(testDashboard, 2000);
