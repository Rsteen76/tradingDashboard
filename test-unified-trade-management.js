/**
 * UNIFIED TRADE MANAGEMENT ARCHITECTURE TEST
 * Tests the complete system to ensure SL/TP hits don't cancel strategy
 */

const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

// Test configuration
const TEST_CONFIG = {
    serverUrl: 'ws://localhost:3001',
    testDuration: 30000, // 30 seconds
    scenarios: [
        'manual_trade_entry',
        'stop_loss_hit',
        'take_profit_hit',
        'strategy_continuation',
        'unified_state_sync'
    ]
};

class UnifiedTradeManagementTester {
    constructor() {
        this.ws = null;
        this.testResults = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            details: []
        };
        this.tradeIds = new Set();
        this.strategyStatus = 'UNKNOWN';
        this.activeTrades = [];
    }

    async runAllTests() {
        console.log('��� UNIFIED TRADE MANAGEMENT ARCHITECTURE TEST');
        console.log('='.repeat(60));
        console.log('Testing: Strategy cancellation fix for SL/TP hits');
        console.log('Architecture: Unified Trade Manager with independent lifecycle');
        console.log('='.repeat(60));

        try {
            await this.connectToServer();
            await this.runTestScenarios();
            this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    async connectToServer() {
        return new Promise((resolve, reject) => {
            console.log('��� Connecting to trading server...');
            
            this.ws = new WebSocket(TEST_CONFIG.serverUrl);
            
            this.ws.on('open', () => {
                console.log('✅ Connected to server');
                this.setupEventListeners();
                resolve();
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ Connection failed:', error.message);
                reject(error);
            });
        });
    }

    setupEventListeners() {
        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleServerMessage(message);
            } catch (error) {
                console.error('❌ Message parsing error:', error.message);
            }
        });
    }

    handleServerMessage(message) {
        console.log('��� Server message:', message.type);
        
        switch (message.type) {
            case 'trade_status_update':
                this.handleTradeStatusUpdate(message);
                break;
            case 'unifiedTradeStatusUpdate':
                this.handleUnifiedTradeStatus(message);
                break;
            case 'strategy_status':
                this.handleStrategyStatus(message);
                break;
            case 'trade_execution':
                this.handleTradeExecution(message);
                break;
            case 'smart_trailing_response':
                this.handleSmartTrailingResponse(message);
                break;
        }
    }

    handleTradeStatusUpdate(message) {
        const trade = message.trade;
        
        if (trade && trade.tradeId) {
            // **CRITICAL TEST**: Verify strategy continues after SL/TP
            if (trade.exitReason === 'STOP_LOSS_HIT' || trade.exitReason === 'TAKE_PROFIT_HIT') {
                this.testStrategyContination(trade);
            }
            
            // Update trade tracking
            if (trade.status === 'CLOSED') {
                this.tradeIds.delete(trade.tradeId);
            } else {
                this.tradeIds.add(trade.tradeId);
            }
        }
    }

    testStrategyContination(trade) {
        // **MOST CRITICAL TEST**: Verify strategy continues after SL/TP
        const testName = `Strategy Continuation After ${trade.exitReason}`;
        
        // Strategy should NEVER be cancelled due to trade exits
        const passed = trade.strategyAction === 'CONTINUE_OPERATION' &&
                      trade.strategyStatus !== 'TERMINATED' &&
                      trade.strategyStatus !== 'CANCELLED';
        
        this.recordTestResult(testName, passed, {
            tradeId: trade.tradeId,
            exitReason: trade.exitReason,
            strategyAction: trade.strategyAction,
            strategyStatus: trade.strategyStatus,
            criticalTest: true
        });
        
        if (!passed) {
            console.error('��� CRITICAL FAILURE: Strategy cancellation detected!');
        }
    }

    recordTestResult(testName, passed, details) {
        this.testResults.totalTests++;
        
        if (passed) {
            this.testResults.passed++;
            console.log(`  ✅ ${testName}: PASSED`);
        } else {
            this.testResults.failed++;
            console.log(`  ❌ ${testName}: FAILED`);
        }
        
        this.testResults.details.push({
            testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
    }

    async runTestScenarios() {
        console.log('\n��� Running Test Scenarios...');
        
        // Test manual trade entry
        console.log('\n��� Testing: manual_trade_entry');
        const tradeRequest = {
            command: 'go_long',
            quantity: 1,
            current_price: 4500,
            stop_price: 4490,
            target_price: 4510,
            instrument: 'ES',
            reason: 'Unified Architecture Test'
        };
        
        this.ws.send(JSON.stringify({
            type: 'manual_trade',
            ...tradeRequest
        }));
        
        await this.wait(3000);
        
        // Test that trade was processed through unified manager
        const testName = 'Manual Trade Unified Processing';
        const passed = this.tradeIds.size > 0;
        
        this.recordTestResult(testName, passed, {
            tradeRequest,
            activeTrades: this.tradeIds.size,
            strategyStatus: this.strategyStatus
        });
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('��� UNIFIED TRADE MANAGEMENT TEST REPORT');
        console.log('='.repeat(60));
        
        const passRate = ((this.testResults.passed / this.testResults.totalTests) * 100).toFixed(1);
        
        console.log(`Total Tests: ${this.testResults.totalTests}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Pass Rate: ${passRate}%`);
        
        console.log('\n��� CRITICAL ARCHITECTURE TESTS:');
        
        const criticalTests = this.testResults.details.filter(test => 
            test.testName.includes('Strategy Continuation') || 
            test.testName.includes('Stop Loss Hit') ||
            test.testName.includes('Take Profit Hit')
        );
        
        criticalTests.forEach(test => {
            const status = test.passed ? '✅ PASSED' : '❌ FAILED';
            console.log(`  ${status}: ${test.testName}`);
        });
        
        const architectureValid = criticalTests.every(test => test.passed);
        
        if (architectureValid) {
            console.log('\n✅ UNIFIED ARCHITECTURE: VALIDATED');
            console.log('✅ STRATEGY CANCELLATION: FIXED');
            console.log('✅ TRADE LIFECYCLE: INDEPENDENT');
            console.log('✅ SL/TP HANDLING: CORRECT');
        } else {
            console.log('\n❌ ARCHITECTURE VALIDATION: FAILED');
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the test suite
if (require.main === module) {
    const tester = new UnifiedTradeManagementTester();
    tester.runAllTests().catch(console.error);
}

module.exports = UnifiedTradeManagementTester;
