const io = require('socket.io-client');

console.log('🧪 Testing dashboard with NinjaTrader disconnected...');

const socket = io('http://localhost:8080');

socket.on('connect', () => {
    console.log('✅ Connected to ML dashboard server');
});

socket.on('strategy_data', (data) => {
    console.log('📊 Received strategy data:');
    console.log(`   Position: ${data.position}`);
    console.log(`   Position Size: ${data.position_size}`);
    console.log(`   Connection Status: ${data.connection_status}`);
    console.log(`   Unrealized P&L: ${data.unrealized_pnl}`);
    
    if (data.position === 'DISCONNECTED') {
        console.log('✅ SUCCESS: Dashboard correctly shows DISCONNECTED state!');
    } else {
        console.log('❌ PROBLEM: Dashboard still shows cached data:', data.position);
    }
});

socket.on('connection_status', (statusData) => {
    console.log('🔌 Connection status event:', statusData);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from ML dashboard server');
});

setTimeout(() => {
    console.log('🏁 Test complete');
    process.exit(0);
}, 3000);
