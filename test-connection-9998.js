const net = require('net')

console.log('🧪 Simple Connection Test to port 9998')

const client = new net.Socket()

client.connect(9998, 'localhost', () => {
  console.log('✅ Successfully connected to port 9998')
  
  const testMessage = {
    type: 'test_connection',
    message: 'Testing if port 9998 is reachable',
    timestamp: new Date().toISOString()
  }
  
  client.write(JSON.stringify(testMessage) + '\n')
  console.log('📤 Sent test message')
  
  setTimeout(() => {
    client.destroy()
    console.log('🔄 Test complete')
    process.exit(0)
  }, 2000)
})

client.on('error', (err) => {
  console.error('❌ Connection failed:', err.message)
  process.exit(1)
})
