const net = require('net')

console.log('🔍 Data Inspector - Listening for EXACT data from NinjaTrader...')
console.log('📡 This will show you the RAW data format coming from NinjaTrader')

const server = net.createServer((socket) => {
  console.log('\n🎯 NinjaTrader connected!')
  console.log('📋 Raw data will appear below:')
  console.log(''.padEnd(80, '='))
  
  let messageCount = 0
  let buffer = ''
  
  socket.on('data', (data) => {
    const rawData = data.toString()
    console.log(`\n📥 RAW MESSAGE #${++messageCount}:`)
    console.log('Length:', rawData.length, 'bytes')
    console.log('Content:', JSON.stringify(rawData))
    console.log('Visible:', rawData)
    
    // Try to parse as JSON
    buffer += rawData
    let lines = buffer.split('\n')
    buffer = lines.pop()
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line.trim())
          console.log('✅ PARSED JSON:', JSON.stringify(parsed, null, 2))
        } catch (e) {
          console.log('❌ NOT VALID JSON:', line.trim())
        }
      }
    })
    console.log(''.padEnd(80, '-'))
  })
  
  socket.on('close', () => {
    console.log('\n📤 NinjaTrader disconnected')
    console.log('📊 Total messages received:', messageCount)
  })
})

server.listen(9998, () => {
  console.log('🚀 Data Inspector listening on port 9998')
  console.log('💡 Change NinjaTrader ML Server Port to 9998 temporarily')
  console.log('⏳ Waiting for data...\n')
})
