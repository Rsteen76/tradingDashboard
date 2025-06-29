const axios = require('axios');
const WebSocket = require('ws');

console.log('🔍 Checking Manual Trade Logic Issues...');
console.log('=' .repeat(50));

async function checkServerStatus() {
    try {
        const response = await axios.get('http://localhost:3001/api/status');
        console.log('✅ Server Status:', response.data);
        return true;
    } catch (error) {
        console.log('❌ Server not responding:', error.message);
        return false;
    }
}

async function checkCurrentPositions() {
    try {
        const response = await axios.get('http://localhost:3001/api/positions');
        const positions = response.data;
        
        console.log('\n📊 Current Positions:');
        if (positions && positions.length > 0) {
            positions.forEach(pos => {
                console.log(`- ${pos.instrument}: ${pos.direction} ${pos.quantity} @ ${pos.entryPrice}`);
                console.log(`  Stop: ${pos.stopLoss}, Target: ${pos.targetProfit}`);
                console.log(`  Manual: ${pos.isManual || pos.isManualTrade}`);
                console.log(`  Smart Trailing: ${pos.smart_trailing_active}`);
                
                // Check for large stop loss
                if (pos.stopLoss && pos.entryPrice) {
                    const stopDistance = Math.abs(pos.entryPrice - pos.stopLoss);
                    if (stopDistance > 15) {
                        console.log(`  ⚠️  LARGE STOP LOSS: ${stopDistance} points`);
                    }
                }
            });
        } else {
            console.log('  No active positions');
        }
        
        return positions;
    } catch (error) {
        console.log('❌ Failed to get positions:', error.message);
        return [];
    }
}

async function checkTradeOutcomes() {
    try {
        const response = await axios.get('http://localhost:3001/api/trade-outcomes');
        const outcomes = response.data;
        
        console.log('\n📈 Recent Trade Outcomes:');
        if (outcomes && outcomes.length > 0) {
            const recent = outcomes.slice(-5);
            recent.forEach(outcome => {
                console.log(`- ${outcome.instrument}: ${outcome.result} (${outcome.exit_reason})`);
                if (outcome.exit_reason && outcome.exit_reason.includes('Strategy')) {
                    console.log(`  ⚠️  STRATEGY CANCELLATION DETECTED`);
                }
            });
        } else {
            console.log('  No recent outcomes');
        }
        
        return outcomes;
    } catch (error) {
        console.log('❌ Failed to get trade outcomes:', error.message);
        return [];
    }
}

async function testManualTradeFlow() {
    console.log('\n🧪 Testing Manual Trade Flow...');
    
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3001');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected');
            
            // Send test manual trade
            const testTrade = {
                command: 'go_long',
                instrument: 'ES', 
                quantity: 1,
                current_price: 4500,
                stop_price: 4495, // 5 point stop
                target_price: 4510,
                reason: 'Manual Test Trade',
                isManual: true
            };
            
            console.log('📤 Sending test trade:', testTrade);
            ws.send(JSON.stringify(testTrade));
            
            // Listen for response
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log('📥 Response:', message);
                } catch (error) {
                    console.log('📥 Raw response:', data.toString());
                }
            });
            
            setTimeout(() => {
                ws.close();
                resolve();
            }, 5000);
        });
        
        ws.on('error', (error) => {
            console.log('❌ WebSocket error:', error.message);
            resolve();
        });
    });
}

async function checkSmartTrailingConfig() {
    try {
        const response = await axios.get('http://localhost:3001/api/smart-trailing/config');
        console.log('\n🧠 Smart Trailing Config:', response.data);
        
        // Check if manual trades have special handling
        if (response.data.manual_trade_settings) {
            console.log('✅ Manual trade settings found');
        } else {
            console.log('⚠️  No specific manual trade settings');
        }
        
    } catch (error) {
        console.log('\n❌ Failed to get smart trailing config:', error.message);
    }
}

async function runDiagnostics() {
    const serverOk = await checkServerStatus();
    
    if (!serverOk) {
        console.log('\n❌ Cannot proceed - server not responding');
        return;
    }
    
    const positions = await checkCurrentPositions();
    const outcomes = await checkTradeOutcomes();
    
    await checkSmartTrailingConfig();
    await testManualTradeFlow();
    
    console.log('\n🔍 ANALYSIS SUMMARY:');
    console.log('=' .repeat(30));
    
    // Check for large stop issues
    if (positions.some(p => {
        const stopDistance = Math.abs(p.entryPrice - p.stopLoss);
        return stopDistance > 15;
    })) {
        console.log('⚠️  ISSUE: Large stop losses detected');
        console.log('   Solution: Implement immediate smart trailing for manual trades');
    }
    
    // Check for strategy cancellation
    if (outcomes.some(o => o.exit_reason && o.exit_reason.includes('Strategy'))) {
        console.log('⚠️  ISSUE: Strategy cancellation detected');
        console.log('   Solution: Improve exit handling to prevent strategy cancellation');
    }
    
    // Check manual trade detection
    const manualTrades = positions.filter(p => p.isManual || p.isManualTrade);
    if (manualTrades.length === 0 && positions.length > 0) {
        console.log('⚠️  ISSUE: Manual trades not properly flagged');
        console.log('   Solution: Ensure isManual flag is propagated correctly');
    }
    
    // Check smart trailing activation
    if (manualTrades.some(p => !p.smart_trailing_active)) {
        console.log('⚠️  ISSUE: Smart trailing not active for manual trades');
        console.log('   Solution: Activate smart trailing immediately for manual trades');
    }
    
    console.log('\n💡 Recommendations:');
    console.log('1. Monitor stop loss sizes for manual trades');
    console.log('2. Verify manual trade flag propagation');
    console.log('3. Check smart trailing activation timing');
    console.log('4. Review strategy cancellation handling');
}

runDiagnostics().catch(console.error); 