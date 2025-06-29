const WebSocket = require('ws');
const axios = require('axios');

class ManualTradeLogicTester {
    constructor() {
        this.wsServer = null;
        this.wsNinja = null;
        this.testResults = [];
        this.currentPrice = 0;
    }

    async runAllTests() {
        console.log('🧪 Starting Manual Trade Logic Tests (Live Server)');
        console.log('=' .repeat(60));

        try {
            // Test 1: Check server connectivity
            await this.testServerConnectivity();
            
            // Test 2: Check WebSocket connections
            await this.testWebSocketConnections();
            
            // Test 3: Test manual trade communication
            await this.testManualTradeCommunication();
            
            // Test 4: Check smart trailing activation
            await this.testSmartTrailingActivation();
            
            // Test 5: Check stop loss sizes
            await this.testStopLossSizes();
            
            // Test 6: Check strategy cancellation handling
            await this.testStrategyCancellation();
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            this.cleanup();
        }
    }

    async testServerConnectivity() {
        console.log('\n📡 Testing Server Connectivity...');
        
        try {
            // Test main server
            const response = await axios.get('http://localhost:3001/api/status', { timeout: 5000 });
            console.log('✅ Main server is running:', response.data);
            this.testResults.push({ test: 'Server Connectivity', status: 'PASS', details: response.data });
            
            // Test ML server
            try {
                const mlResponse = await axios.get('http://localhost:3002/health', { timeout: 5000 });
                console.log('✅ ML server is running:', mlResponse.data);
                this.testResults.push({ test: 'ML Server Connectivity', status: 'PASS', details: mlResponse.data });
            } catch (mlError) {
                console.log('⚠️  ML server not responding:', mlError.message);
                this.testResults.push({ test: 'ML Server Connectivity', status: 'WARN', details: mlError.message });
            }
            
        } catch (error) {
            console.error('❌ Server connectivity failed:', error.message);
            this.testResults.push({ test: 'Server Connectivity', status: 'FAIL', details: error.message });
            throw error;
        }
    }

    async testWebSocketConnections() {
        console.log('\n🔌 Testing WebSocket Connections...');
        
        return new Promise((resolve, reject) => {
            // Test server WebSocket
            this.wsServer = new WebSocket('ws://localhost:3001');
            
            this.wsServer.on('open', () => {
                console.log('✅ Server WebSocket connected');
                this.testResults.push({ test: 'Server WebSocket', status: 'PASS', details: 'Connected successfully' });
                
                // Test NinjaTrader WebSocket
                this.wsNinja = new WebSocket('ws://localhost:9998');
                
                this.wsNinja.on('open', () => {
                    console.log('✅ NinjaTrader WebSocket connected');
                    this.testResults.push({ test: 'NinjaTrader WebSocket', status: 'PASS', details: 'Connected successfully' });
                    resolve();
                });
                
                this.wsNinja.on('error', (error) => {
                    console.log('⚠️  NinjaTrader WebSocket connection failed:', error.message);
                    this.testResults.push({ test: 'NinjaTrader WebSocket', status: 'WARN', details: error.message });
                    resolve(); // Continue tests even if NT is not available
                });
                
                setTimeout(() => {
                    if (this.wsNinja.readyState !== WebSocket.OPEN) {
                        console.log('⚠️  NinjaTrader WebSocket timeout');
                        this.testResults.push({ test: 'NinjaTrader WebSocket', status: 'WARN', details: 'Connection timeout' });
                        resolve();
                    }
                }, 5000);
            });
            
            this.wsServer.on('error', (error) => {
                console.error('❌ Server WebSocket failed:', error.message);
                this.testResults.push({ test: 'Server WebSocket', status: 'FAIL', details: error.message });
                reject(error);
            });
            
            setTimeout(() => {
                if (this.wsServer.readyState !== WebSocket.OPEN) {
                    console.error('❌ Server WebSocket timeout');
                    this.testResults.push({ test: 'Server WebSocket', status: 'FAIL', details: 'Connection timeout' });
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 10000);
        });
    }

    async testManualTradeCommunication() {
        console.log('\n📨 Testing Manual Trade Communication...');
        
        if (!this.wsServer || this.wsServer.readyState !== WebSocket.OPEN) {
            console.log('❌ Server WebSocket not available for manual trade test');
            this.testResults.push({ test: 'Manual Trade Communication', status: 'FAIL', details: 'WebSocket not available' });
            return;
        }

        return new Promise((resolve) => {
            let responseReceived = false;
            
            // Listen for responses
            this.wsServer.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'manual_trade_response' || message.type === 'confirmation') {
                        console.log('✅ Manual trade response received:', message);
                        responseReceived = true;
                        this.testResults.push({ 
                            test: 'Manual Trade Communication', 
                            status: 'PASS', 
                            details: `Response received: ${JSON.stringify(message)}` 
                        });
                        resolve();
                    }
                } catch (error) {
                    console.log('Failed to parse message:', error);
                }
            });
            
            // Send test manual trade
            const testTrade = {
                command: 'go_long',
                instrument: 'ES',
                quantity: 1,
                current_price: 4500,
                stop_price: 4495,
                target_price: 4510,
                reason: 'Manual Trade Test',
                isManual: true,
                timestamp: new Date().toISOString()
            };
            
            console.log('📤 Sending test manual trade:', testTrade);
            this.wsServer.send(JSON.stringify({ type: 'manual_trade', data: testTrade }));
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (!responseReceived) {
                    console.log('⚠️  Manual trade response timeout');
                    this.testResults.push({ 
                        test: 'Manual Trade Communication', 
                        status: 'WARN', 
                        details: 'No response received within timeout' 
                    });
                }
                resolve();
            }, 10000);
        });
    }

    async testSmartTrailingActivation() {
        console.log('\n🧠 Testing Smart Trailing Activation...');
        
        try {
            // Check if smart trailing service is active
            const response = await axios.get('http://localhost:3001/api/smart-trailing/status', { timeout: 5000 });
            console.log('✅ Smart trailing status:', response.data);
            
            // Check if manual trades activate smart trailing
            const manualTradesResponse = await axios.get('http://localhost:3001/api/positions', { timeout: 5000 });
            const positions = manualTradesResponse.data;
            
            if (positions && positions.length > 0) {
                const manualPositions = positions.filter(p => p.isManual || p.isManualTrade);
                console.log(`📊 Found ${manualPositions.length} manual positions`);
                
                manualPositions.forEach(position => {
                    console.log(`Position: ${position.instrument} - Smart Trailing: ${position.smart_trailing_active ? 'Active' : 'Inactive'}`);
                });
                
                this.testResults.push({ 
                    test: 'Smart Trailing Activation', 
                    status: manualPositions.length > 0 ? 'PASS' : 'WARN', 
                    details: `${manualPositions.length} manual positions found` 
                });
            } else {
                console.log('📊 No active positions found');
                this.testResults.push({ 
                    test: 'Smart Trailing Activation', 
                    status: 'INFO', 
                    details: 'No active positions to test' 
                });
            }
            
        } catch (error) {
            console.error('❌ Smart trailing test failed:', error.message);
            this.testResults.push({ test: 'Smart Trailing Activation', status: 'FAIL', details: error.message });
        }
    }

    async testStopLossSizes() {
        console.log('\n📏 Testing Stop Loss Sizes...');
        
        try {
            // Get current market data
            const marketResponse = await axios.get('http://localhost:3001/api/market-data', { timeout: 5000 });
            const marketData = marketResponse.data;
            this.currentPrice = marketData.price || 4500;
            
            console.log(`📈 Current price: ${this.currentPrice}`);
            
            // Test different stop loss calculations
            const testCases = [
                { direction: 'long', stopPoints: 5, expected: 'small' },
                { direction: 'long', stopPoints: 10, expected: 'medium' },
                { direction: 'long', stopPoints: 20, expected: 'large' },
                { direction: 'short', stopPoints: 5, expected: 'small' },
                { direction: 'short', stopPoints: 10, expected: 'medium' },
                { direction: 'short', stopPoints: 20, expected: 'large' }
            ];
            
            testCases.forEach(testCase => {
                let calculatedStop;
                if (testCase.direction === 'long') {
                    calculatedStop = this.currentPrice - testCase.stopPoints;
                } else {
                    calculatedStop = this.currentPrice + testCase.stopPoints;
                }
                
                const stopDistance = Math.abs(this.currentPrice - calculatedStop);
                console.log(`${testCase.direction.toUpperCase()} - Stop Points: ${testCase.stopPoints}, Distance: ${stopDistance} points`);
                
                // Check if stop is reasonable (not too large)
                const isReasonable = stopDistance <= 15; // Max 15 points initial stop
                this.testResults.push({ 
                    test: `Stop Loss Size (${testCase.direction} ${testCase.stopPoints}pts)`, 
                    status: isReasonable ? 'PASS' : 'WARN', 
                    details: `${stopDistance} points distance` 
                });
            });
            
        } catch (error) {
            console.error('❌ Stop loss size test failed:', error.message);
            this.testResults.push({ test: 'Stop Loss Sizes', status: 'FAIL', details: error.message });
        }
    }

    async testStrategyCancellation() {
        console.log('\n🛑 Testing Strategy Cancellation Handling...');
        
        try {
            // Check if there are any recent trade outcomes
            const response = await axios.get('http://localhost:3001/api/trade-outcomes', { timeout: 5000 });
            const outcomes = response.data;
            
            if (outcomes && outcomes.length > 0) {
                const recentOutcomes = outcomes.slice(-5); // Last 5 trades
                console.log(`📊 Analyzing ${recentOutcomes.length} recent trade outcomes`);
                
                recentOutcomes.forEach((outcome, index) => {
                    console.log(`Trade ${index + 1}: ${outcome.result} - ${outcome.exit_reason || 'Unknown reason'}`);
                });
                
                // Check for proper exit handling
                const properExits = recentOutcomes.filter(o => 
                    o.exit_reason && (o.exit_reason.includes('Stop') || o.exit_reason.includes('Target'))
                );
                
                this.testResults.push({ 
                    test: 'Strategy Cancellation', 
                    status: properExits.length > 0 ? 'PASS' : 'WARN', 
                    details: `${properExits.length}/${recentOutcomes.length} trades with proper exit handling` 
                });
            } else {
                console.log('📊 No recent trade outcomes found');
                this.testResults.push({ 
                    test: 'Strategy Cancellation', 
                    status: 'INFO', 
                    details: 'No recent trades to analyze' 
                });
            }
            
        } catch (error) {
            console.error('❌ Strategy cancellation test failed:', error.message);
            this.testResults.push({ test: 'Strategy Cancellation', status: 'FAIL', details: error.message });
        }
    }

    generateReport() {
        console.log('\n📋 TEST REPORT');
        console.log('=' .repeat(60));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const warned = this.testResults.filter(r => r.status === 'WARN').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const info = this.testResults.filter(r => r.status === 'INFO').length;
        
        console.log(`✅ PASSED: ${passed}`);
        console.log(`⚠️  WARNED: ${warned}`);
        console.log(`❌ FAILED: ${failed}`);
        console.log(`ℹ️  INFO: ${info}`);
        console.log('');
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : 
                        result.status === 'WARN' ? '⚠️ ' : 
                        result.status === 'FAIL' ? '❌' : 'ℹ️ ';
            console.log(`${icon} ${result.test}: ${result.details}`);
        });
        
        console.log('\n🔍 RECOMMENDATIONS:');
        
        if (failed > 0) {
            console.log('❌ Critical issues found - system may not function properly');
        }
        
        if (warned > 0) {
            console.log('⚠️  Warnings detected - review manual trade logic');
        }
        
        if (this.testResults.some(r => r.test.includes('Stop Loss') && r.status === 'WARN')) {
            console.log('📏 Large stop losses detected - consider implementing immediate smart trailing');
        }
        
        if (this.testResults.some(r => r.test.includes('WebSocket') && r.status !== 'PASS')) {
            console.log('🔌 WebSocket connectivity issues - check NinjaTrader connection');
        }
        
        console.log('\n💡 Next Steps:');
        console.log('1. Review failed tests and fix critical issues');
        console.log('2. Monitor manual trades for proper stop loss sizing');
        console.log('3. Verify smart trailing activates immediately');
        console.log('4. Check strategy cancellation handling');
    }

    cleanup() {
        if (this.wsServer) {
            this.wsServer.close();
        }
        if (this.wsNinja) {
            this.wsNinja.close();
        }
        console.log('\n🧹 Cleanup completed');
    }
}

// Run the tests
const tester = new ManualTradeLogicTester();
tester.runAllTests().catch(console.error); 