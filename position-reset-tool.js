const io = require('socket.io-client');

console.log('🔧 POSITION RESET TOOL');
console.log('📡 Connecting to ML Server...');

const socket = io('http://localhost:8080');

socket.on('connect', () => {
  console.log('✅ Connected to ML Server');
  console.log('📊 Current position data will be shown...');
  console.log('🔄 You can manually send position reset commands\n');
});

socket.on('strategy_data', (data) => {
  console.log('📈 Current Strategy Data:');
  console.log('  Position:', data.position);
  console.log('  Position Size:', data.position_size);
  console.log('  P&L:', data.pnl);
  console.log('  Price:', data.price);
  console.log('  Instrument:', data.instrument);
  console.log('  Timestamp:', data.timestamp);
  console.log('  Entry Price:', data.entry_price);
  console.log('  Stop Loss:', data.stop_loss);
  console.log('  Target Price:', data.target_price);
  console.log('---');
});

socket.on('strategy_state', (state) => {
  console.log('🎯 Strategy State:');
  console.log('  Active:', state.isActive);
  console.log('  Total Trades:', state.dailyStats.totalTrades);
  console.log('  Total P&L:', state.dailyStats.totalPnL);
  console.log('---');
});

// Command line interface
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('💡 Commands available:');
console.log('  flat    - Set position to FLAT');
console.log('  long    - Set position to Long');
console.log('  short   - Set position to Short');
console.log('  reset   - Reset all position data');
console.log('  exit    - Exit the tool');
console.log('');

rl.on('line', (input) => {
  const command = input.trim().toLowerCase();
  
  switch (command) {
    case 'flat':
      console.log('🔄 Setting position to FLAT...');
      // Send a mock flat position update
      socket.emit('manual_position_update', {
        type: 'strategy_status',
        position_status: 'FLAT',
        position: 'FLAT',
        position_size: 0,
        unrealized_pnl: 0,
        entry_price: 0,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'long':
      console.log('🔄 Setting position to Long...');
      socket.emit('manual_position_update', {
        type: 'strategy_status',
        position_status: 'Long',
        position: 'Long',
        position_size: 1,
        unrealized_pnl: 0,
        entry_price: 68.50,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'short':
      console.log('🔄 Setting position to Short...');
      socket.emit('manual_position_update', {
        type: 'strategy_status',
        position_status: 'Short',
        position: 'Short',
        position_size: 1,
        unrealized_pnl: 0,
        entry_price: 69.00,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'reset':
      console.log('🔄 Resetting all position data...');
      socket.emit('reset_position_data');
      break;
      
    case 'exit':
      console.log('👋 Goodbye!');
      rl.close();
      socket.disconnect();
      process.exit(0);
      break;
      
    default:
      console.log('❌ Unknown command. Try: flat, long, short, reset, or exit');
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  socket.disconnect();
  process.exit(0);
});
