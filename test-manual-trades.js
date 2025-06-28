// test-manual-trades.js
// Test script for manual trading functionality

const io = require('socket.io-client');

class ManualTradeTest {
    constructor() {
        this.socket = null;
        this.testResults = [];
    }

    async connectToServer() {
        return new Promise((resolve, reject) => {
            this.socket = io('http://localhost:3001');
            
            this.socket.on('connect', () => {
                console.log('✅ Connected to ML Trading Server');
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection failed:', error.message);
                reject(error);
            });
            
            this.socket.on('manual_trade_response', (response) => {
                console.log('📨 Manual trade response:', response);
            });
        });
    }

    async testManualLongTrade() {
        console.log('\n🧪 Testing Manual Long Trade...');
        
        const testTrade = {
            command: 'go_long',
            quantity: 1,
            stop_price: 21892.00,    // 8 points below current price
            target_price: 21912.00,  // 12 points above current price
            reason: 'Test Manual Long Trade'
        };

        return new Promise((resolve) => {
            this.socket.emit('manual_trade', testTrade, (response) => {
                console.log('📈 Long trade response:', response);
                this.testResults.push({
                    test: 'Manual Long Trade',
                    success: response.success,
                    response: response
                });
                resolve(response);
            });
        });
    }

    async testManualShortTrade() {
        console.log('\n🧪 Testing Manual Short Trade...');
        
        const testTrade = {
            command: 'go_short',
            quantity: 1,
            stop_price: 21908.00,    // 8 points above current price
            target_price: 21888.00,  // 12 points below current price
            reason: 'Test Manual Short Trade'
        };

        return new Promise((resolve) => {
            this.socket.emit('manual_trade', testTrade, (response) => {
                console.log('📉 Short trade response:', response);
                this.testResults.push({
                    test: 'Manual Short Trade',
                    success: response.success,
                    response: response
                });
                resolve(response);
            });
        });
    }

    async testManualClose() {
        console.log('\n🧪 Testing Manual Close Position...');
        
        const testClose = {
            command: 'close_position',
            reason: 'Test Manual Close'
        };

        return new Promise((resolve) => {
            this.socket.emit('manual_trade', testClose, (response) => {
                console.log('🔄 Close position response:', response);
                this.testResults.push({
                    test: 'Manual Close Position',
                    success: response.success,
                    response: response
                });
                resolve(response);
            });
        });
    }

    async testMarketOrderOnly() {
        console.log('\n🧪 Testing Market Order Only (No Stops/Targets)...');
        
        const testTrade = {
            command: 'go_long',
            quantity: 1,
            stop_price: 0,    // No stop
            target_price: 0,  // No target
            reason: 'Test Market Order Only'
        };

        return new Promise((resolve) => {
            this.socket.emit('manual_trade', testTrade, (response) => {
                console.log('📈 Market order response:', response);
                this.testResults.push({
                    test: 'Market Order Only',
                    success: response.success,
                    response: response
                });
                resolve(response);
            });
        });
    }

    async waitForOrderProcessing() {
        console.log('⏳ Waiting for order processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    printResults() {
        console.log('\n📊 TEST RESULTS:');
        console.log('================');
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            console.log(`${index + 1}. ${result.test}: ${status}`);
            if (!result.success && result.response.error) {
                console.log(`   Error: ${result.response.error}`);
            }
        });
        
        const passCount = this.testResults.filter(r => r.success).length;
        const totalTests = this.testResults.length;
        console.log(`\nOverall: ${passCount}/${totalTests} tests passed`);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('🔌 Disconnected from server');
        }
    }
}

async function runTests() {
    const tester = new ManualTradeTest();
    
    try {
        console.log('🚀 Starting Manual Trade Tests...');
        
        // Connect to server
        await tester.connectToServer();
        await tester.waitForOrderProcessing();
        
        // Test 1: Manual long trade with stops/targets
        await tester.testManualLongTrade();
        await tester.waitForOrderProcessing();
        
        // Test 2: Close position
        await tester.testManualClose();
        await tester.waitForOrderProcessing();
        
        // Test 3: Manual short trade with stops/targets
        await tester.testManualShortTrade();
        await tester.waitForOrderProcessing();
        
        // Test 4: Close position again
        await tester.testManualClose();
        await tester.waitForOrderProcessing();
        
        // Test 5: Market order only (no stops/targets)
        await tester.testMarketOrderOnly();
        await tester.waitForOrderProcessing();
        
        // Test 6: Final close
        await tester.testManualClose();
        
        // Print results
        tester.printResults();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        tester.disconnect();
    }
}

// Run the tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = ManualTradeTest; 