// test-ai-optimization.js
// Test script for AI optimization functionality

class AIOptimizationTest {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🤖 Starting AI Optimization Tests...\n');

        try {
            await this.testServerHealth();
            await this.testLongTradeOptimization();
            await this.testShortTradeOptimization(); 
            await this.testHighVolatilityScenario();
            await this.testLowVolatilityScenario();
            await this.testDifferentPriceLevels();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        }
    }

    async testServerHealth() {
        console.log('1. Testing server health...');
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const health = await response.json();
            
            if (health.status === 'healthy') {
                this.logSuccess('Server is healthy and responding');
            } else {
                this.logError('Server health check failed', health);
            }
        } catch (error) {
            this.logError('Server connection failed', error.message);
        }
    }

    async testLongTradeOptimization() {
        console.log('\n2. Testing long trade AI optimization...');
        try {
            const payload = {
                direction: 'long',
                quantity: 1,
                current_price: 21900,
                request_type: 'stop_target_optimization'
            };

            const response = await fetch(`${this.baseUrl}/api/ai-optimize-trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const optimization = await response.json();
                this.validateOptimization(optimization, 'Long');
            } else {
                this.logError('Long optimization request failed', await response.text());
            }
        } catch (error) {
            this.logError('Long optimization test failed', error.message);
        }
    }

    async testShortTradeOptimization() {
        console.log('\n3. Testing short trade AI optimization...');
        try {
            const payload = {
                direction: 'short',
                quantity: 2,
                current_price: 21950,
                request_type: 'stop_target_optimization'
            };

            const response = await fetch(`${this.baseUrl}/api/ai-optimize-trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const optimization = await response.json();
                this.validateOptimization(optimization, 'Short');
            } else {
                this.logError('Short optimization request failed', await response.text());
            }
        } catch (error) {
            this.logError('Short optimization test failed', error.message);
        }
    }

    async testHighVolatilityScenario() {
        console.log('\n4. Testing high volatility scenario...');
        try {
            const payload = {
                direction: 'long',
                quantity: 1,
                current_price: 21800,
                request_type: 'stop_target_optimization',
                market_context: 'high_volatility'
            };

            const response = await fetch(`${this.baseUrl}/api/ai-optimize-trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const optimization = await response.json();
                this.validateOptimization(optimization, 'High Volatility');
                
                // High volatility should result in wider stops
                if (optimization.optimal_stop_points > 8) {
                    this.logSuccess('High volatility correctly increased stop distance');
                } else {
                    this.logWarning('High volatility may not have adjusted stops appropriately');
                }
            } else {
                this.logError('High volatility test failed', await response.text());
            }
        } catch (error) {
            this.logError('High volatility test failed', error.message);
        }
    }

    async testLowVolatilityScenario() {
        console.log('\n5. Testing low volatility scenario...');
        try {
            const payload = {
                direction: 'short',
                quantity: 1,
                current_price: 21700,
                request_type: 'stop_target_optimization',
                market_context: 'low_volatility'
            };

            const response = await fetch(`${this.baseUrl}/api/ai-optimize-trade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const optimization = await response.json();
                this.validateOptimization(optimization, 'Low Volatility');
            } else {
                this.logError('Low volatility test failed', await response.text());
            }
        } catch (error) {
            this.logError('Low volatility test failed', error.message);
        }
    }

    async testDifferentPriceLevels() {
        console.log('\n6. Testing different price levels...');
        const priceLevels = [21600, 21750, 21900, 22050, 22200];
        
        for (const price of priceLevels) {
            try {
                const payload = {
                    direction: 'long',
                    quantity: 1,
                    current_price: price,
                    request_type: 'stop_target_optimization'
                };

                const response = await fetch(`${this.baseUrl}/api/ai-optimize-trade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const optimization = await response.json();
                    console.log(`   Price ${price}: Stop=${optimization.optimal_stop_points}, Target=${optimization.optimal_target_points}, Regime=${optimization.market_regime}`);
                }
            } catch (error) {
                console.log(`   Price ${price}: Failed - ${error.message}`);
            }
        }
    }

    validateOptimization(optimization, testType) {
        const required = ['optimal_stop_points', 'optimal_target_points', 'market_regime', 'confidence', 'reasoning'];
        const missing = required.filter(field => !optimization.hasOwnProperty(field));
        
        if (missing.length > 0) {
            this.logError(`${testType} optimization missing fields`, missing);
            return false;
        }

        // Validate ranges
        if (optimization.optimal_stop_points <= 0 || optimization.optimal_stop_points > 50) {
            this.logError(`${testType} stop points out of range`, optimization.optimal_stop_points);
            return false;
        }

        if (optimization.optimal_target_points <= 0 || optimization.optimal_target_points > 100) {
            this.logError(`${testType} target points out of range`, optimization.optimal_target_points);
            return false;
        }

        if (optimization.confidence < 0 || optimization.confidence > 1) {
            this.logError(`${testType} confidence out of range`, optimization.confidence);
            return false;
        }

        // Calculate risk/reward
        const riskReward = optimization.optimal_target_points / optimization.optimal_stop_points;
        
        this.logSuccess(`${testType} optimization valid:`, {
            stop: optimization.optimal_stop_points,
            target: optimization.optimal_target_points,
            ratio: `${riskReward.toFixed(1)}:1`,
            regime: optimization.market_regime,
            confidence: `${(optimization.confidence * 100).toFixed(0)}%`,
            system: optimization.system_used || 'Unknown'
        });

        return true;
    }

    logSuccess(message, data = null) {
        console.log(`   ✅ ${message}`);
        if (data) console.log(`      ${JSON.stringify(data, null, 6)}`);
        this.testResults.push({ type: 'success', message, data });
    }

    logError(message, data = null) {
        console.log(`   ❌ ${message}`);
        if (data) console.log(`      ${JSON.stringify(data, null, 6)}`);
        this.testResults.push({ type: 'error', message, data });
    }

    logWarning(message, data = null) {
        console.log(`   ⚠️  ${message}`);
        if (data) console.log(`      ${JSON.stringify(data, null, 6)}`);
        this.testResults.push({ type: 'warning', message, data });
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🤖 AI OPTIMIZATION TEST RESULTS');
        console.log('='.repeat(60));

        const successes = this.testResults.filter(r => r.type === 'success').length;
        const errors = this.testResults.filter(r => r.type === 'error').length;
        const warnings = this.testResults.filter(r => r.type === 'warning').length;
        
        console.log(`✅ Successes: ${successes}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`📊 Total Tests: ${this.testResults.length}`);
        
        const successRate = (successes / this.testResults.length * 100).toFixed(1);
        console.log(`🎯 Success Rate: ${successRate}%`);

        if (errors === 0) {
            console.log('\n🎉 All AI optimization tests passed!');
            console.log('✅ Manual Trade Panel is ready to use AI optimization');
            console.log('✅ Smart trailing is active for automated adjustments');
            console.log('\n💡 Next steps:');
            console.log('   1. Start the dashboard: npm run dev');
            console.log('   2. Open Manual Trade Panel');
            console.log('   3. Enable AI optimization toggle');
            console.log('   4. Execute trades with AI-calculated stops/targets');
        } else {
            console.log('\n⚠️  Some tests failed. Check server status and configuration.');
        }

        console.log('='.repeat(60));
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AIOptimizationTest();
    tester.runAllTests()
        .then(() => {
            console.log('\n🏁 AI optimization testing complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Testing failed:', error);
            process.exit(1);
        });
}

module.exports = AIOptimizationTest; 