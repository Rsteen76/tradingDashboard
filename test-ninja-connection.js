const net = require('net');

console.log('🔍 Testing NinjaTrader connection to ML server...');

// Test connection to port 9999 (NinjaTrader TCP)
const client = new net.Socket();

client.connect(9999, 'localhost', () => {
    console.log('✅ Successfully connected to ML server on port 9999');
    console.log('🎯 NinjaTrader should be able to connect to this port');
    
    // Send a test message similar to what NinjaTrader would send
    const testMessage = JSON.stringify({
        type: 'strategy_status',
        instrument: 'ES 03-25',
        timestamp: new Date().toISOString(),
        data: {
            strategy_name: 'ScalperProWithML',
            status: 'Active',
            price: 5850.25,
            signal_strength: 75.5
        }
    }) + '\n';
    
    client.write(testMessage);
    console.log('📤 Sent test message to ML server');
});

client.on('data', (data) => {
    console.log('📥 Received response from ML server:', data.toString());
});

client.on('error', (err) => {
    console.log('❌ Connection error:', err.message);
});

client.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
});

// Close after 5 seconds
setTimeout(() => {
    client.end();
}, 5000); 