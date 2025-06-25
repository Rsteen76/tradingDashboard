const io = require('socket.io-client');

console.log('🔧 QUICK POSITION FIX');
console.log('📡 Connecting to ML Server to reset position to FLAT...');

const socket = io('http://localhost:8080');

socket.on('connect', () => {
  console.log('✅ Connected to ML Server');
  
  // Send position reset command
  console.log('🔄 Sending FLAT position update...');
  socket.emit('reset_position_data');
  
  setTimeout(() => {
    console.log('✅ Position reset command sent');
    console.log('🎯 Dashboard should now show FLAT position');
    console.log('💡 If the issue persists, check your NinjaTrader strategy code');
    
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('strategy_data', (data) => {
  console.log('📊 Updated Position:', data.position);
  console.log('📊 Updated P&L:', data.pnl);
  
  if (data.position === 'FLAT') {
    console.log('✅ SUCCESS: Position is now FLAT!');
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Timeout - manual intervention may be required');
  socket.disconnect();
  process.exit(1);
}, 10000);
