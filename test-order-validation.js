#!/usr/bin/env node

/**
 * CRITICAL ORDER VALIDATION TEST
 * 
 * This script tests whether stop-loss and take-profit orders are being placed correctly
 * with trades from both manual strategy signals and ML-driven commands.
 */

const net = require('net');

// Test configuration
const NINJA_HOST = 'localhost';
const NINJA_PORT = 9998;
const TEST_DURATION = 30000; // 30 seconds

// Test data for ML commands
const testMLCommands = [
    {
        command: 'go_long',
        quantity: 1,
        entry_price: 21500.00,
        stop_price: 21485.00,    // 15 point stop
        target_price: 21530.00,  // 30 point target
        reason: 'Order Validation Test - Long'
    },
    {
        command: 'go_short',
        quantity: 1,
        entry_price: 21500.00,
        stop_price: 21515.00,    // 15 point stop
        target_price: 21470.00,  // 30 point target
        reason: 'Order Validation Test - Short'
    }
];

class OrderValidationTester {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.testResults = {
            ordersPlaced: [],
            stopsDetected: [],
            targetsDetected: [],
            errors: []
        };
        this.currentTest = 0;
    }

    async start() {
        console.log('🧪 STARTING ORDER VALIDATION TEST');
        console.log('=====================================');
        console.log('This test will:');
        console.log('1. Connect to NinjaTrader strategy');
        console.log('2. Send ML trading commands with stops/targets');
        console.log('3. Monitor for proper order placement');
        console.log('4. Report validation results');
        console.log('');

        try {
            await this.connectToNinja();
            await this.runValidationTests();
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        } finally {
            this.disconnect();
        }
    }

    connectToNinja() {
        return new Promise((resolve, reject) => {
            console.log(`📡 Connecting to NinjaTrader at ${NINJA_HOST}:${NINJA_PORT}...`);
            
            this.client = new net.Socket();
            
            this.client.connect(NINJA_PORT, NINJA_HOST, () => {
                console.log('✅ Connected to NinjaTrader');
                this.isConnected = true;
                resolve();
            });

            this.client.on('data', (data) => {
                this.handleNinjaResponse(data.toString());
            });

            this.client.on('error', (error) => {
                console.error('❌ Connection error:', error.message);
                reject(error);
            });

            this.client.on('close', () => {
                console.log('📡 Connection to NinjaTrader closed');
                this.isConnected = false;
            });

            // Connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    handleNinjaResponse(data) {
        try {
            const messages = data.split('\n').filter(msg => msg.trim());
            
            for (const message of messages) {
                if (message.trim()) {
                    const parsed = JSON.parse(message);
                    this.processNinjaMessage(parsed);
                }
            }
        } catch (error) {
            console.log('📨 Raw response:', data);
        }
    }

    processNinjaMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        
        switch (message.type) {
            case 'command_confirmation':
                this.handleCommandConfirmation(message, timestamp);
                break;
                
            case 'trade_entry':
                this.handleTradeEntry(message, timestamp);
                break;
                
            case 'strategy_status':
                this.handleStrategyStatus(message, timestamp);
                break;
                
            default:
                console.log(`📨 [${timestamp}] ${message.type}:`, JSON.stringify(message, null, 2));
        }
    }

    handleCommandConfirmation(message, timestamp) {
        console.log(`✅ [${timestamp}] Command Confirmation:`, {
            command: message.command,
            success: message.success,
            message: message.message
        });
        
        this.testResults.ordersPlaced.push({
            timestamp,
            command: message.command,
            success: message.success,
            details: message.message
        });
    }

    handleTradeEntry(message, timestamp) {
        console.log(`📈 [${timestamp}] Trade Entry Detected:`, {
            entry_price: message.entry_price,
            stop_loss: message.stop_loss,
            target1: message.target1,
            target2: message.target2,
            quantity: message.quantity
        });

        // Validate stop-loss
        if (message.stop_loss && message.stop_loss > 0) {
            console.log(`🛡️  STOP-LOSS CONFIRMED: ${message.stop_loss}`);
            this.testResults.stopsDetected.push({
                timestamp,
                entry_price: message.entry_price,
                stop_price: message.stop_loss,
                risk_points: Math.abs(message.entry_price - message.stop_loss)
            });
        } else {
            console.log(`❌ MISSING STOP-LOSS!`);
            this.testResults.errors.push({
                timestamp,
                error: 'Missing stop-loss',
                entry_price: message.entry_price
            });
        }

        // Validate take-profit
        const target = message.target1 || message.target2;
        if (target && target > 0) {
            console.log(`🎯 TAKE-PROFIT CONFIRMED: ${target}`);
            this.testResults.targetsDetected.push({
                timestamp,
                entry_price: message.entry_price,
                target_price: target,
                reward_points: Math.abs(target - message.entry_price)
            });
        } else {
            console.log(`❌ MISSING TAKE-PROFIT!`);
            this.testResults.errors.push({
                timestamp,
                error: 'Missing take-profit',
                entry_price: message.entry_price
            });
        }
    }

    handleStrategyStatus(message, timestamp) {
        if (message.position && message.position !== 'Flat') {
            console.log(`📊 [${timestamp}] Position Status:`, {
                position: message.position,
                size: message.position_size,
                entry_price: message.entry_price,
                current_stop: message.stop_loss,
                current_target: message.target_price || message.target1 || message.target2,
                unrealized_pnl: message.unrealized_pnl
            });
        }
    }

    async runValidationTests() {
        console.log('🧪 Starting validation tests...\n');

        for (let i = 0; i < testMLCommands.length; i++) {
            const testCommand = testMLCommands[i];
            console.log(`\n🔬 TEST ${i + 1}: ${testCommand.reason}`);
            console.log('Command:', JSON.stringify(testCommand, null, 2));
            
            await this.sendMLCommand(testCommand);
            await this.wait(5000); // Wait 5 seconds between tests
            
            // Close any open positions before next test
            await this.sendMLCommand({ command: 'close_position', reason: 'Test cleanup' });
            await this.wait(2000);
        }

        console.log('\n⏳ Waiting for final results...');
        await this.wait(5000);
        
        this.generateReport();
    }

    sendMLCommand(command) {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                console.error('❌ Not connected to NinjaTrader');
                resolve();
                return;
            }

            const message = JSON.stringify({
                type: 'ml_command',
                timestamp: new Date().toISOString(),
                ...command
            });

            console.log('📤 Sending command:', command.command);
            this.client.write(message + '\n');
            
            setTimeout(resolve, 1000); // Give time for response
        });
    }

    generateReport() {
        console.log('\n📋 ORDER VALIDATION REPORT');
        console.log('==========================');
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Orders Placed: ${this.testResults.ordersPlaced.length}`);
        console.log(`   Stops Detected: ${this.testResults.stopsDetected.length}`);
        console.log(`   Targets Detected: ${this.testResults.targetsDetected.length}`);
        console.log(`   Errors Found: ${this.testResults.errors.length}`);

        if (this.testResults.stopsDetected.length > 0) {
            console.log(`\n🛡️  STOP-LOSS VALIDATION:`);
            this.testResults.stopsDetected.forEach((stop, i) => {
                console.log(`   ${i + 1}. Entry: ${stop.entry_price} | Stop: ${stop.stop_price} | Risk: ${stop.risk_points.toFixed(2)} pts`);
            });
        }

        if (this.testResults.targetsDetected.length > 0) {
            console.log(`\n🎯 TAKE-PROFIT VALIDATION:`);
            this.testResults.targetsDetected.forEach((target, i) => {
                console.log(`   ${i + 1}. Entry: ${target.entry_price} | Target: ${target.target_price} | Reward: ${target.reward_points.toFixed(2)} pts`);
            });
        }

        if (this.testResults.errors.length > 0) {
            console.log(`\n❌ ERRORS DETECTED:`);
            this.testResults.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error.error} at ${error.timestamp}`);
            });
        }

        // Overall assessment
        const totalTests = testMLCommands.length;
        const successfulStops = this.testResults.stopsDetected.length;
        const successfulTargets = this.testResults.targetsDetected.length;
        
        console.log(`\n🎯 OVERALL ASSESSMENT:`);
        if (successfulStops === totalTests && successfulTargets === totalTests) {
            console.log('   ✅ PASS: All trades have proper stop-loss and take-profit orders');
        } else {
            console.log('   ❌ FAIL: Some trades are missing stop-loss or take-profit orders');
            console.log(`   Stop-loss success rate: ${successfulStops}/${totalTests} (${(successfulStops/totalTests*100).toFixed(1)}%)`);
            console.log(`   Take-profit success rate: ${successfulTargets}/${totalTests} (${(successfulTargets/totalTests*100).toFixed(1)}%)`);
        }

        console.log(`\n💡 RECOMMENDATIONS:`);
        if (this.testResults.errors.length === 0) {
            console.log('   🎉 Excellent! Your order management is working correctly.');
            console.log('   🔄 Continue monitoring live trades to ensure consistency.');
        } else {
            console.log('   🔧 Review the NinjaTrader strategy code for order placement logic.');
            console.log('   🧪 Run this test again after making fixes.');
            console.log('   📊 Check NinjaTrader logs for any order rejection messages.');
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disconnect() {
        if (this.client && this.isConnected) {
            this.client.end();
        }
    }
}

// Run the test
const tester = new OrderValidationTester();
tester.start().catch(console.error); 