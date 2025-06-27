#!/usr/bin/env node

/**
 * Verification Script for Bombproof AI Trading System Integration
 * 
 * This script verifies that all components are properly integrated and functioning
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Bombproof AI Trading System Integration...\n');

// Check if core files exist
const coreFiles = [
    'server/src/core/bombproof-ai-trading.js',
    'server/src/core/trade-outcome-tracker.js',
    'server/src/core/ai-performance-monitor.js'
];

console.log('📁 Checking core files...');
let filesOK = true;
coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing`);
        filesOK = false;
    }
});

if (!filesOK) {
    console.log('\n❌ Missing core files. Please copy them from Bombproof/ folder.');
    process.exit(1);
}

// Check server.js for proper imports
console.log('\n📜 Checking server.js integration...');
const serverPath = 'server/src/server.js';
if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    const checks = [
        {
            name: 'Bombproof imports',
            pattern: /const BombproofAITradingSystem.*require.*bombproof-ai-trading/,
            found: false
        },
        {
            name: 'Trade tracker import',
            pattern: /const TradeOutcomeTracker.*require.*trade-outcome-tracker/,
            found: false
        },
        {
            name: 'Performance monitor import',
            pattern: /const AIPerformanceMonitor.*require.*ai-performance-monitor/,
            found: false
        },
        {
            name: 'Bombproof initialization',
            pattern: /this\.bombproofTrading.*new BombproofAITradingSystem/,
            found: false
        },
        {
            name: 'Trade tracker initialization',
            pattern: /this\.tradeTracker.*new TradeOutcomeTracker/,
            found: false
        },
        {
            name: 'Performance monitor initialization',
            pattern: /this\.performanceMonitor.*new AIPerformanceMonitor/,
            found: false
        },
        {
            name: 'Event handlers setup',
            pattern: /setupTradingSystemEvents/,
            found: false
        },
        {
            name: 'Bombproof evaluation',
            pattern: /bombproofTrading\.evaluateTradingOpportunity/,
            found: false
        }
    ];
    
    checks.forEach(check => {
        check.found = check.pattern.test(serverContent);
        console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
    });
    
    const integrationScore = checks.filter(c => c.found).length / checks.length * 100;
    console.log(`\n📊 Integration Score: ${integrationScore.toFixed(1)}%`);
    
    if (integrationScore < 100) {
        console.log('\n⚠️  Some integration steps are missing. Please review the implementation guide.');
    } else {
        console.log('\n🎉 All integration checks passed!');
    }
} else {
    console.log('❌ server.js not found');
}

// Check for test configuration
console.log('\n⚙️  Checking test configuration...');
if (fs.existsSync('bombproof-test-config.json')) {
    console.log('✅ Test configuration found');
    try {
        const config = JSON.parse(fs.readFileSync('bombproof-test-config.json', 'utf8'));
        console.log(`   📋 Paper Mode: ${config.paperMode ? 'Enabled' : 'Disabled'}`);
        console.log(`   🛑 Auto Trading: ${config.autoTradingEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`   🎯 Min Confidence: ${config.minConfidence}`);
        console.log(`   💰 Max Daily Loss: $${config.maxDailyLoss}`);
    } catch (e) {
        console.log('⚠️  Configuration file exists but has syntax errors');
    }
} else {
    console.log('⚠️  Test configuration not found (optional)');
}

// Provide next steps
console.log('\n📋 Next Steps:');
console.log('1. Start the server: npm start (or node server/src/server.js)');
console.log('2. Check logs for:');
console.log('   ✅ "Bombproof AI Trading System initialized"');
console.log('   ✅ "Trade Outcome Tracker initialized"');
console.log('   ✅ "AI Performance Monitor initialized"');
console.log('3. Enable paper trading in dashboard');
console.log('4. Monitor for trade execution logs with unique IDs');
console.log('5. Verify position sync with NinjaTrader\n');

console.log('🛡️  Bombproof AI Trading System verification complete!');
console.log('📖 For troubleshooting, check: server/src/utils/logger.js'); 