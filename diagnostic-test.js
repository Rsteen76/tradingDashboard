const net = require('net')

// Simple diagnostic client to test NinjaTrader connection
const client = new net.Socket()

console.log('🔍 Testing NinjaTrader connection to localhost:9999...')

client.connect(9999, 'localhost', () => {
  console.log('✅ Successfully connected to ML Dashboard Server')
  console.log('🎯 NinjaTrader should be able to connect here')
  
  // Send a test message to see if our server processes it
  const testMessage = {
    type: 'diagnostic_test',
    source: 'manual_test',
    timestamp: new Date().toISOString(),
    message: 'Testing connection from diagnostic script'
  }
  
  client.write(JSON.stringify(testMessage) + '\\n')
  console.log('📤 Sent test message to server')
  
  // Close after a moment
  setTimeout(() => {
    console.log('✅ Test completed - connection working')
    client.destroy()
  }, 2000)
})

client.on('error', (err) => {
  console.error('❌ Connection failed:', err.message)
  console.log('🔧 This means the ML server might not be running on port 9999')
})

client.on('close', () => {
  console.log('📤 Test connection closed')
})
