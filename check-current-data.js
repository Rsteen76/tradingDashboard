console.log('🔍 Checking what data is currently flowing through port 9999...')
console.log('📡 If NinjaTrader is sending data, we should see it here')

// Let's check what processes are listening on 9999
const { exec } = require('child_process')

exec('netstat -an | findstr :9999', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Error checking port:', error.message)
    return
  }
  
  console.log('📊 Port 9999 connections:')
  console.log(stdout)
  
  if (stdout.includes('ESTABLISHED')) {
    console.log('✅ NinjaTrader is connected to port 9999')
    console.log('💡 The ML server should be receiving data')
    console.log('📋 Check your ML server terminal for messages like:')
    console.log('   📥 Raw data received: ...')
    console.log('   🔍 Processing line: ...')
  } else {
    console.log('❌ No active connection to port 9999')
  }
})
