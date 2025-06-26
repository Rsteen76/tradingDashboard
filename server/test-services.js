// server/test-services.js
// Quick test to verify our extracted services work

const http = require('http');
const express = require('express');

// Import our extracted services
const NinjaTraderService = require('./src/services/ninja-trader-service');
const WebSocketService = require('./src/services/websocket-service');
const logger = require('./src/utils/logger');
const config = require('./src/utils/config');

async function testServices() {
  try {
    logger.info('🧪 Testing extracted services...');
    
    // Create basic Express app
    const app = express();
    const server = http.createServer(app);
    
    // Test NinjaTrader Service
    logger.info('Testing NinjaTrader Service...');
    const ninjaService = new NinjaTraderService();
    
    // Add some event listeners
    ninjaService.on('connected', ({ clientId }) => {
      logger.info('✅ NinjaTrader client connected:', { clientId });
    });
    
    ninjaService.on('strategyStatus', (data) => {
      logger.info('📊 Strategy status received:', { 
        instrument: data.instrument,
        position: data.position 
      });
    });
    
    await ninjaService.start();
    logger.info('✅ NinjaTrader service started successfully');
    
    // Test WebSocket Service
    logger.info('Testing WebSocket Service...');
    const webSocketService = new WebSocketService(server);
    
    // Add event listeners
    webSocketService.on('clientConnected', (clientId) => {
      logger.info('✅ Dashboard client connected:', { clientId });
    });
    
    webSocketService.on('settingsUpdate', (settings) => {
      logger.info('⚙️ Settings update received:', settings);
    });
    
    await webSocketService.initialize();
    logger.info('✅ WebSocket service initialized successfully');
    
    // Start HTTP server
    const port = 8081; // Different port for testing
    server.listen(port, () => {
      logger.info(`🌐 Test server running on port ${port}`);
      logger.info(`📊 Test dashboard: http://localhost:${port}`);
      logger.info(`🎯 NinjaTrader TCP: localhost:9999`);
      logger.info('');
      logger.info('✅ ALL SERVICES STARTED SUCCESSFULLY!');
      logger.info('🎉 Ready for next extraction phase');
      logger.info('');
      logger.info('Press Ctrl+C to stop test server');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Stopping test services...');
      try {
        await ninjaService.stop();
        await webSocketService.stop();
        server.close();
        logger.info('✅ Test services stopped');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error stopping services:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    logger.error('❌ Service test failed:', error);
    process.exit(1);
  }
}

// Start the test
testServices();