#!/usr/bin/env node

console.log('🔍 COMPREHENSIVE CONNECTION DIAGNOSTIC');
console.log('=====================================');
console.log('Analyzing TradingDashboard connection issues...\n');

const net = require('net');
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  tests: {},
  summary: {
    critical_issues: [],
    warnings: [],
    recommendations: []
  }
};

// Test 1: Check if ML Server is running
async function testMLServerRunning() {
  console.log('🔌 Test 1: Checking if ML Server is running...');
  
  return new Promise((resolve) => {
    const socket = net.createConnection(8080, 'localhost');
    
    socket.on('connect', () => {
      console.log('✅ ML Server HTTP port 8080 is active');
      socket.destroy();
      resolve({ status: 'pass', message: 'ML Server HTTP port active' });
    });
    
    socket.on('error', (error) => {
      console.log('❌ ML Server HTTP port 8080 NOT ACTIVE');
      console.log('   Error:', error.code);
      resolve({ status: 'fail', message: `HTTP port error: ${error.code}` });
    });
    
    setTimeout(() => {
      socket.destroy();
      resolve({ status: 'fail', message: 'Connection timeout' });
    }, 5000);
  });
}

// Test 2: Check TCP port 9999 for NinjaTrader
async function testTCPPort() {
  console.log('🔌 Test 2: Checking TCP port 9999 for NinjaTrader...');
  
  return new Promise((resolve) => {
    const socket = net.createConnection(9999, 'localhost');
    
    socket.on('connect', () => {
      console.log('✅ TCP port 9999 is listening for NinjaTrader');
      socket.destroy();
      resolve({ status: 'pass', message: 'NinjaTrader TCP port active' });
    });
    
    socket.on('error', (error) => {
      console.log('❌ TCP port 9999 NOT ACTIVE');
      console.log('   Error:', error.code);
      resolve({ status: 'fail', message: `TCP port error: ${error.code}` });
    });
    
    setTimeout(() => {
      socket.destroy();
      resolve({ status: 'fail', message: 'Connection timeout' });
    }, 5000);
  });
}

// Test 3: Socket.IO Connection
async function testSocketIO() {
  console.log('🔌 Test 3: Testing Socket.IO connection...');
  
  return new Promise((resolve) => {
    const socket = io('http://localhost:8080', {
      timeout: 5000,
      forceNew: true
    });

    let connected = false;
    let dataReceived = false;
    
    socket.on('connect', () => {
      console.log('✅ Socket.IO connection successful');
      connected = true;
      
      // Listen for data
      socket.on('strategy_data', (data) => {
        dataReceived = true;
        console.log('📊 Received strategy data:', {
          instrument: data.instrument,
          price: data.price,
          hasMLData: !!(data.ml_long_probability || data.ml_short_probability)
        });
      });
      
      socket.on('heartbeat', () => {
        console.log('💓 Received heartbeat');
      });
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ Socket.IO connection failed:', error.message);
      resolve({ 
        status: 'fail', 
        message: `Socket.IO error: ${error.message}`,
        connected: false,
        dataReceived: false
      });
    });
    
    setTimeout(() => {
      socket.disconnect();
      resolve({ 
        status: connected ? 'pass' : 'fail', 
        message: connected ? 'Socket.IO connected' : 'Socket.IO connection failed',
        connected,
        dataReceived
      });
    }, 8000);
  });
}

// Test 4: Check Log Files
async function checkLogFiles() {
  console.log('📋 Test 4: Analyzing log files...');
  
  const logFiles = [
    'logs/error.log',
    'logs/combined.log'
  ];
  
  const logAnalysis = {
    status: 'pass',
    message: 'Logs analyzed',
    errors: [],
    warnings: []
  };
  
  for (const logFile of logFiles) {
    try {
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').slice(-100); // Last 100 lines
        
        // Look for specific errors
        const validationErrors = lines.filter(line => 
          line.includes('Validation failed') && line.includes('type') && line.includes('not allowed')
        ).length;
        
        const redisErrors = lines.filter(line => 
          line.includes('Redis connection failed')
        ).length;
        
        const mlErrors = lines.filter(line => 
          line.includes('ML Prediction error')
        ).length;
        
        if (validationErrors > 0) {
          logAnalysis.errors.push(`${validationErrors} validation errors found in ${logFile}`);
          logAnalysis.status = 'warn';
        }
        
        if (redisErrors > 0) {
          logAnalysis.warnings.push(`Redis connection issues in ${logFile}`);
        }
        
        if (mlErrors > 0) {
          logAnalysis.errors.push(`${mlErrors} ML prediction errors in ${logFile}`);
          logAnalysis.status = 'fail';
        }
        
        console.log(`📄 ${logFile}: ${validationErrors} validation errors, ${mlErrors} ML errors`);
      } else {
        console.log(`⚠️ Log file not found: ${logFile}`);
        logAnalysis.warnings.push(`Missing log file: ${logFile}`);
      }
    } catch (error) {
      console.log(`❌ Error reading ${logFile}:`, error.message);
      logAnalysis.errors.push(`Cannot read ${logFile}: ${error.message}`);
      logAnalysis.status = 'fail';
    }
  }
  
  return logAnalysis;
}

// Test 5: Check Process Status
async function checkProcesses() {
  console.log('⚙️ Test 5: Checking running processes...');
  
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Check for Node.js processes
    exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Cannot check processes:', error.message);
        resolve({ status: 'fail', message: 'Process check failed' });
        return;
      }
      
      const processes = stdout.split('\n').filter(line => line.includes('node.exe'));
      console.log(`✅ Found ${processes.length - 1} Node.js processes running`);
      
      resolve({ 
        status: 'pass', 
        message: `${processes.length - 1} Node.js processes found`,
        processes: processes.length - 1
      });
    });
  });
}

// Main diagnostic function
async function runDiagnostic() {
  console.log('Starting comprehensive diagnostic...\n');
  
  try {
    // Run all tests
    results.tests.mlServer = await testMLServerRunning();
    results.tests.tcpPort = await testTCPPort();
    results.tests.socketIO = await testSocketIO();
    results.tests.logFiles = await checkLogFiles();
    results.tests.processes = await checkProcesses();
    
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=====================');
    
    // Analyze results
    let criticalIssues = 0;
    let warnings = 0;
    
    // Check ML Server
    if (results.tests.mlServer.status === 'fail') {
      criticalIssues++;
      results.summary.critical_issues.push('ML Server not running on port 8080');
      console.log('❌ CRITICAL: ML Server not running');
    }
    
    // Check TCP Port
    if (results.tests.tcpPort.status === 'fail') {
      criticalIssues++;
      results.summary.critical_issues.push('TCP port 9999 not accepting NinjaTrader connections');
      console.log('❌ CRITICAL: NinjaTrader TCP port not available');
    }
    
    // Check Socket.IO
    if (results.tests.socketIO.status === 'fail') {
      criticalIssues++;
      results.summary.critical_issues.push('Socket.IO connection failed');
      console.log('❌ CRITICAL: Dashboard connection failed');
    } else if (!results.tests.socketIO.dataReceived) {
      warnings++;
      results.summary.warnings.push('No data flowing through Socket.IO');
      console.log('⚠️ WARNING: No data flowing to dashboard');
    }
    
    // Check logs
    if (results.tests.logFiles.status === 'fail') {
      criticalIssues++;
      results.summary.critical_issues.push('Critical errors found in logs');
      console.log('❌ CRITICAL: Errors in log files');
    } else if (results.tests.logFiles.status === 'warn') {
      warnings++;
      results.summary.warnings.push('Warnings found in logs');
      console.log('⚠️ WARNING: Issues in log files');
    }
    
    console.log(`\n🔍 Issues Found: ${criticalIssues} critical, ${warnings} warnings`);
    
    // Generate recommendations
    if (criticalIssues === 0 && warnings === 0) {
      console.log('✅ All systems operational!');
      results.summary.recommendations.push('System appears healthy');
    } else {
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (results.tests.mlServer.status === 'fail') {
        console.log('1. Start ML Server: npm run server');
        results.summary.recommendations.push('Start ML Server with: npm run server');
      }
      
      if (results.tests.logFiles.errors.some(e => e.includes('validation'))) {
        console.log('2. Fix validation schema in ml-server.js');
        results.summary.recommendations.push('Fix data validation schema issues');
      }
      
      if (!results.tests.socketIO.dataReceived) {
        console.log('3. Check NinjaTrader strategy connection and data flow');
        results.summary.recommendations.push('Verify NinjaTrader is sending data');
      }
      
      if (results.tests.logFiles.warnings.some(w => w.includes('Redis'))) {
        console.log('4. Consider starting Redis server for caching (optional)');
        results.summary.recommendations.push('Start Redis server for better performance');
      }
    }
    
    // Save results
    fs.writeFileSync('diagnostic-results.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Detailed results saved to diagnostic-results.json');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Run the diagnostic
if (require.main === module) {
  runDiagnostic().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Diagnostic error:', error);
    process.exit(1);
  });
}

module.exports = { runDiagnostic };
