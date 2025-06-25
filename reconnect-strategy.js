const net = require('net')

console.log('🔧 Strategy Reconnection Tool')
console.log('============================')

// Test NinjaTrader connection
function testNinjaTraderConnection() {
  return new Promise((resolve, reject) => {
    console.log('🎯 Testing NinjaTrader connection on port 9999...')
    
    const client = net.createConnection(9999, 'localhost')
    
    client.on('connect', () => {
      console.log('✅ Connected to NinjaTrader on port 9999')
      
      // Send a ping request to see if strategy is running
      const pingMessage = JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }) + '\n'
      
      client.write(pingMessage)
      
      setTimeout(() => {
        client.end()
        resolve(true)
      }, 2000)
    })
    
    client.on('data', (data) => {
      console.log('📥 Received from NinjaTrader:', data.toString())
    })
    
    client.on('error', (err) => {
      console.log('❌ NinjaTrader connection failed:', err.message)
      resolve(false)
    })
    
    client.on('close', () => {
      console.log('🎯 NinjaTrader connection closed')
    })
  })
}

// Test ML Server connection
function testMLServerConnection() {
  return new Promise((resolve, reject) => {
    console.log('🤖 Testing ML Server connection on port 8080...')
    
    const http = require('http')
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }
    
    const req = http.request(options, (res) => {
      console.log('✅ ML Server is running on port 8080')
      console.log('📊 Status:', res.statusCode)
      resolve(true)
    })
    
    req.on('error', (err) => {
      console.log('❌ ML Server connection failed:', err.message)
      resolve(false)
    })
    
    req.on('timeout', () => {
      console.log('⏰ ML Server connection timeout')
      req.destroy()
      resolve(false)
    })
    
    req.end()
  })
}

// Test Dashboard connection
function testDashboardConnection() {
  return new Promise((resolve, reject) => {
    console.log('🌐 Testing Dashboard connection on port 3000...')
    
    const http = require('http')
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    }
    
    const req = http.request(options, (res) => {
      console.log('✅ Dashboard is running on port 3000')
      resolve(true)
    })
    
    req.on('error', (err) => {
      console.log('❌ Dashboard connection failed:', err.message)
      resolve(false)
    })
    
    req.on('timeout', () => {
      console.log('⏰ Dashboard connection timeout')
      req.destroy()
      resolve(false)
    })
    
    req.end()
  })
}

// Force strategy status update
function forceStrategyStatusUpdate() {
  return new Promise((resolve) => {
    console.log('🔄 Attempting to force strategy status update...')
    
    const client = net.createConnection(9999, 'localhost')
    
    client.on('connect', () => {
      console.log('📡 Connected, sending status request...')
      
      // Send a status request
      const statusRequest = JSON.stringify({
        type: 'status_request',
        timestamp: new Date().toISOString(),
        request_id: 'reconnect_' + Date.now()
      }) + '\n'
      
      client.write(statusRequest)
      
      // Also try sending a heartbeat to trigger response
      setTimeout(() => {
        const heartbeat = JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }) + '\n'
        
        client.write(heartbeat)
      }, 1000)
      
      setTimeout(() => {
        client.end()
        resolve(true)
      }, 3000)
    })
    
    client.on('data', (data) => {
      console.log('📥 Strategy response:', data.toString())
    })
    
    client.on('error', (err) => {
      console.log('❌ Failed to send status request:', err.message)
      resolve(false)
    })
  })
}

// Main reconnection process
async function reconnectStrategy() {
  console.log('')
  console.log('🚀 Starting strategy reconnection process...')
  console.log('')
  
  // Test all connections
  const ninjaConnected = await testNinjaTraderConnection()
  const mlServerConnected = await testMLServerConnection()
  const dashboardConnected = await testDashboardConnection()
  
  console.log('')
  console.log('📊 Connection Status:')
  console.log(`  🎯 NinjaTrader (9999): ${ninjaConnected ? '✅ Connected' : '❌ Disconnected'}`)
  console.log(`  🤖 ML Server (8080): ${mlServerConnected ? '✅ Running' : '❌ Not Running'}`)
  console.log(`  🌐 Dashboard (3000): ${dashboardConnected ? '✅ Running' : '❌ Not Running'}`)
  console.log('')
  
  if (!ninjaConnected) {
    console.log('❌ NinjaTrader is not accessible on port 9999')
    console.log('💡 Solutions:')
    console.log('   1. Check if your strategy is actually running in NinjaTrader')
    console.log('   2. Verify the strategy has TCP communication enabled')
    console.log('   3. Check if port 9999 is not blocked by firewall')
    return
  }
  
  if (!mlServerConnected) {
    console.log('❌ ML Server is not running on port 8080')
    console.log('💡 Solution: Run "node server/ml-server.js" first')
    return
  }
  
  if (ninjaConnected && mlServerConnected) {
    console.log('🔄 Attempting to force strategy reconnection...')
    await forceStrategyStatusUpdate()
    
    console.log('')
    console.log('✅ Reconnection process completed!')
    console.log('')
    console.log('🔍 Next steps:')
    console.log('   1. Check your dashboard at http://localhost:3000')
    console.log('   2. Look for strategy data appearing in the dashboard')
    console.log('   3. If still not working, your strategy might need to send a status update')
    console.log('')
    console.log('💡 Strategy Integration Requirements:')
    console.log('   - Your strategy should send "strategy_status" messages')
    console.log('   - Include current position, P&L, and other data')
    console.log('   - Send periodic updates (every few seconds)')
  }
}

// Run the reconnection
reconnectStrategy().catch(console.error) 