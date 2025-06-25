const net = require('net')

console.log('🔍 Starting NinjaTrader Data Monitor...')
console.log('📡 Listening for data from your ScalperPro strategy...')
console.log('')

// Create server to listen for NinjaTrader data
const server = net.createServer((socket) => {
  console.log('🎯 NinjaTrader connected from:', socket.remoteAddress)
  console.log('⏰ Connection time:', new Date().toLocaleTimeString())
  console.log('')
  
  let buffer = ''
  let messageCount = 0
  
  socket.on('data', (data) => {
    buffer += data.toString()
    
    // Process complete JSON messages
    let lines = buffer.split('\\n')
    buffer = lines.pop() // Keep incomplete line in buffer
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const jsonData = JSON.parse(line.trim())
          messageCount++
          
          console.log(`📥 Message #${messageCount} (${jsonData.type}):`)
          console.log('    Instrument:', jsonData.instrument || 'N/A')
          console.log('    Time:', jsonData.timestamp || 'N/A')
          
          if (jsonData.type === 'instrument_registration') {
            console.log('    🎯 INSTRUMENT REGISTERED!')
            console.log('    Strategy:', jsonData.strategy_name)
            console.log('    Instance ID:', jsonData.strategy_instance_id)
          }
          
          if (jsonData.type === 'strategy_status') {
            console.log('    📊 STRATEGY STATUS:')
            console.log('    Price:', jsonData.price || 'N/A')
            console.log('    RSI:', jsonData.rsi_current || 'N/A')
            console.log('    Position:', jsonData.position_status || 'N/A')
            console.log('    Signal Strength:', jsonData.overall_signal_strength || 'N/A')
          }
          
          if (jsonData.type === 'strategy_signal') {
            console.log('    🎯 SIGNAL:', jsonData.direction, 'at', jsonData.price)
          }
          
          console.log('')
          
        } catch (error) {
          console.error('❌ Error parsing JSON:', error.message)
          console.log('📝 Raw data:', line.substring(0, 100) + '...')
          console.log('')
        }
      }
    })
  })
  
  socket.on('error', (error) => {
    console.error('🔥 Socket error:', error.message)
  })
  
  socket.on('close', () => {
    console.log('📤 NinjaTrader disconnected')
    console.log('⏰ Disconnect time:', new Date().toLocaleTimeString())
    console.log('📊 Total messages received:', messageCount)
    console.log('')
  })
})

server.listen(9998, () => {
  console.log('🚀 Data Monitor Server listening on port 9998')
  console.log('')
  console.log('📋 TO TEST:')
  console.log('1. In NinjaTrader, change ML Server Port to 9998')
  console.log('2. Make sure Enable ML Dashboard = True')
  console.log('3. Apply/restart your strategy')
  console.log('')
  console.log('⏳ Waiting for NinjaTrader connection...')
  console.log('')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down monitor...')
  server.close()
  process.exit(0)
})
