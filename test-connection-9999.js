const net = require('net')

console.log('🔍 Testing TCP connection to port 9999...')

const server = net.createServer((socket) => {
  console.log('📞 Incoming connection from:', socket.remoteAddress + ':' + socket.remotePort)
  console.log('📊 Connection details:', {
    localAddress: socket.localAddress,
    localPort: socket.localPort,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort
  })
  
  socket.on('data', (data) => {
    console.log('📥 Received data:', data.toString())
  })
  
  socket.on('close', () => {
    console.log('📞 Connection closed')
  })
  
  socket.on('error', (error) => {
    console.log('❌ Socket error:', error.message)
  })
})

server.listen(9999, () => {
  console.log('🚀 Test server listening on port 9999')
  console.log('🔍 Waiting for connections from NinjaTrader...')
  console.log('📋 If NinjaTrader is running, it should connect within a few seconds')
  console.log('⏰ Will wait for 30 seconds...')
  
  setTimeout(() => {
    console.log('⏰ 30 seconds elapsed')
    console.log('🔍 If no connections were detected, NinjaTrader may not be configured to connect')
    server.close()
    process.exit(0)
  }, 30000)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log('⚠️ Port 9999 is already in use (ML server is running)')
    console.log('🔍 This means the ML server is active and waiting for NinjaTrader')
    console.log('📋 Check NinjaTrader configuration to ensure it connects to localhost:9999')
  } else {
    console.log('❌ Server error:', error.message)
  }
  process.exit(1)
})

console.log('📋 Press Ctrl+C to stop the test') 