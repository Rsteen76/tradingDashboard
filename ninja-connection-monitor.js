const net = require('net');

console.log('👀 Monitoring for NinjaTrader connections on port 9999...');
console.log('📊 Dashboard: http://localhost:3000');
console.log('🔧 ML Server: http://localhost:8080');
console.log('');

// Monitor connections to port 9999
const server = net.createServer((socket) => {
    console.log('🎯 New connection detected from:', socket.remoteAddress + ':' + socket.remotePort);
    
    socket.on('data', (data) => {
        const message = data.toString().trim();
        console.log('📥 Received from NinjaTrader:', message.substring(0, 200) + (message.length > 200 ? '...' : ''));
        
        try {
            const parsed = JSON.parse(message);
            if (parsed.type === 'strategy_status') {
                console.log('✅ Strategy Status:', parsed.data?.strategy_name, 'Price:', parsed.data?.price);
            } else if (parsed.type === 'signal') {
                console.log('🎯 Trading Signal:', parsed.data?.direction, 'at', parsed.data?.price);
            } else if (parsed.type === 'tick_data') {
                console.log('📈 Tick Data: Price:', parsed.data?.price, 'Volume:', parsed.data?.volume);
            }
        } catch (e) {
            // Not JSON, that's okay
        }
    });
    
    socket.on('close', () => {
        console.log('❌ NinjaTrader disconnected');
    });
    
    socket.on('error', (err) => {
        console.log('⚠️ Socket error:', err.message);
    });
});

server.listen(9998, () => {
    console.log('🔍 Connection monitor listening on port 9998');
    console.log('');
    console.log('📋 Instructions:');
    console.log('1. Open NinjaTrader');
    console.log('2. Apply ScalperProWithML strategy to a chart');
    console.log('3. Strategy should connect to localhost:9999');
    console.log('4. Watch this monitor for connection activity');
    console.log('');
    console.log('Press Ctrl+C to stop monitoring...');
});

server.on('error', (err) => {
    console.log('❌ Monitor error:', err.message);
}); 