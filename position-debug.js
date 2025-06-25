const net = require('net');

console.log('🔍 Position Debug Tool - Monitoring live data from NinjaTrader...');

const server = net.createServer((socket) => {
    console.log('📡 Strategy connected');
    
    socket.on('data', (data) => {
        const messages = data.toString().split('\n').filter(msg => msg.trim());
        
        for (const message of messages) {
            try {
                const parsed = JSON.parse(message);
                
                if (parsed.type === 'strategy_status') {
                    console.log('\n=== POSITION DEBUG ===');
                    console.log(`Timestamp: ${parsed.timestamp}`);
                    console.log(`Validated Position: ${parsed.position || 'undefined'}`);
                    console.log(`Position Size: ${parsed.position_size || 'undefined'}`);
                    console.log(`Unrealized P&L: ${parsed.unrealized_pnl || 'undefined'}`);
                    
                    // Debug fields we added
                    if (parsed.debug_strategy_position !== undefined) {
                        console.log(`Debug - Strategy Position: ${parsed.debug_strategy_position}`);
                        console.log(`Debug - Strategy Quantity: ${parsed.debug_strategy_quantity}`);
                    }
                    
                    console.log('========================\n');
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        }
    });
    
    socket.on('end', () => {
        console.log('Strategy disconnected');
    });
    
    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

server.listen(8765, () => {
    console.log('Position debug server listening on port 8765');
    console.log('Make sure your NinjaTrader strategy is connecting to this port');
    console.log('Waiting for position data...\n');
});

server.on('error', (err) => {
    console.error('Server error:', err.message);
});
