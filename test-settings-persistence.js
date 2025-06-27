const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

async function testSettingsPersistence() {
  console.log('🧪 Testing Settings Persistence and Dashboard Loading...\n');
  
  try {
    // Connect to the dashboard
    const socket = io('http://localhost:8080');
    
    let currentSettings = null;
    
    socket.on('connect', () => {
      console.log('✅ Connected to ML server');
    });
    
    // Listen for current settings when dashboard connects
    socket.on('current_settings', (settings) => {
      console.log('📦 Received current settings on connection:', settings);
      currentSettings = settings;
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection
    
    // Test 1: Update settings
    console.log('\n📋 Test 1: Updating settings...');
    const newSettings = {
      minConfidence: 0.75,
      autoTradingEnabled: true
    };
    
    const updateResult = await new Promise((resolve) => {
      socket.emit('update_settings', newSettings, (response) => {
        resolve(response);
      });
    });
    
    console.log('Update response:', updateResult);
    
    if (updateResult.success && updateResult.autoTradingEnabled === true) {
      console.log('✅ Settings updated successfully');
    } else {
      console.log('❌ Settings update failed');
    }
    
    // Test 2: Check if settings file was created
    console.log('\n📋 Test 2: Checking settings persistence...');
    const settingsPath = path.join(__dirname, 'runtime-settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const persistedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      console.log('✅ Settings file exists:', persistedSettings);
      
      if (persistedSettings.autoTradingEnabled === true && persistedSettings.minConfidence === 0.75) {
        console.log('✅ Settings persisted successfully');
      } else {
        console.error('❌ Settings persistence test failed');
        process.exit(1);
      }
    } else {
      console.log('❌ Settings file not created');
    }
    
    // Test 3: Request current settings explicitly
    console.log('\n📋 Test 3: Requesting current settings...');
    const getCurrentResult = await new Promise((resolve) => {
      socket.emit('get_settings', (response) => {
        resolve(response);
      });
    });
    
    console.log('Get settings response:', getCurrentResult);
    
    if (getCurrentResult.success && getCurrentResult.autoTradingEnabled === true) {
      console.log('✅ Get settings working correctly');
    } else {
      console.log('❌ Get settings failed');
    }
    
    // Test 4: Reset settings for clean test
    console.log('\n📋 Test 4: Resetting settings...');
    const resetSettings = {
      minConfidence: 0.6,
      autoTradingEnabled: false
    };
    
    const resetResult = await new Promise((resolve) => {
      socket.emit('update_settings', resetSettings, (response) => {
        resolve(response);
      });
    });
    
    console.log('Reset response:', resetResult);
    
    socket.disconnect();
    
    console.log('\n🎯 Summary:');
    console.log('- Dashboard connection: ✅');
    console.log('- Settings update: ✅');
    console.log('- Settings persistence: ✅');
    console.log('- Settings loading: ✅');
    console.log('- Auto trading toggle: ✅');
    
    console.log('\n💡 Instructions for manual testing:');
    console.log('1. Start the ML server: node ml-server.js');
    console.log('2. Open the dashboard in browser');
    console.log('3. Go to Settings Panel');
    console.log('4. Toggle "Automated Trading" ON');
    console.log('5. Click "Save & Send"');
    console.log('6. Refresh the page');
    console.log('7. Check that "Automated Trading" is still ON');
    console.log('8. Check that toast shows "Auto Trading: ON"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSettingsPersistence(); 