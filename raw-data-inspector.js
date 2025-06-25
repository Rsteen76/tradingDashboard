const net = require('net');

console.log('🔍 RAW NINJATRADER DATA INSPECTOR');
console.log('📡 Connecting to NinjaTrader on port 12345...');

// Create TCP server to listen for NinjaTrader data
const server = net.createServer((socket) => {
  console.log('🎯 NinjaTrader connected from:', socket.remoteAddress);
  
  let buffer = '';
  let messageCount = 0;
  
  socket.on('data', (data) => {
    messageCount++;
    buffer += data.toString();
    
    console.log(`\n📥 RAW MESSAGE #${messageCount}:`);
    console.log('Raw bytes:', data.toString());
    
    // Process complete JSON messages
    let lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        console.log(`\n🔍 LINE ${index + 1}:`, line.trim());
        try {
          const jsonData = JSON.parse(line.trim());
          console.log('✅ PARSED JSON:', JSON.stringify(jsonData, null, 2));
          
          // Highlight position-related data
          if (jsonData.position || jsonData.position_status || jsonData.position_size) {
            console.log('🎯 POSITION DATA DETECTED:');
            console.log('  - position:', jsonData.position);
            console.log('  - position_status:', jsonData.position_status);
            console.log('  - position_size:', jsonData.position_size);
            console.log('  - unrealized_pnl:', jsonData.unrealized_pnl);
            console.log('  - realized_pnl:', jsonData.realized_pnl);
            console.log('  - entry_price:', jsonData.entry_price);
          }
          
          // Show signal data
          if (jsonData.signal_strength || jsonData.overall_signal_strength) {
            console.log('📊 SIGNAL DATA:');
            console.log('  - signal_strength:', jsonData.signal_strength);
            console.log('  - overall_signal_strength:', jsonData.overall_signal_strength);
            console.log('  - ml_probability:', jsonData.ml_probability);
          }
          
        } catch (error) {
          console.log('❌ JSON PARSE ERROR:', error.message);
          console.log('   Raw line:', line.trim());
        }
      }
    });
  });
  
  socket.on('end', () => {
    console.log('📡 NinjaTrader disconnected');
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error.message);
  });
});

server.listen(12345, () => {
  console.log('🚀 Raw data inspector listening on port 12345');
  console.log('💡 This will show EXACTLY what NinjaTrader is sending...');
  console.log('⏰ Waiting for data from NinjaTrader...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down raw data inspector...');
  server.close();
  process.exit(0);
});
