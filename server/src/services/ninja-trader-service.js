// server/src/services/ninja-trader-service.js
// Extracted from your ml-server.backup.js TCP server logic

const net = require('net');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const config = require('../utils/config');

class NinjaTraderService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...config.ninjaTrader, ...options };
    this.server = null;
    this.connections = new Map();
    
    // Connection state tracking (from your existing code)
    this.connectionState = {
      isConnected: false,
      lastHeartbeat: null,
      reconnectAttempts: 0
    };
    
    this.heartbeatInterval = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Create TCP server (from your existing createNinjaTraderServer function)
        this.server = net.createServer((socket) => {
          this.handleConnection(socket);
        });

        this.server.listen(this.config.port, this.config.host, () => {
          logger.logConnection('NinjaTrader TCP', 'listening', { 
            port: this.config.port,
            host: this.config.host 
          });
          this.startHeartbeatMonitoring();
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('❌ NinjaTrader server error:', { error: error.message });
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    this.connections.set(clientId, socket);
    
    logger.logConnection('NinjaTrader', 'connected', { clientId });
    this.connectionState.isConnected = true;
    this.emit('connected', { clientId });
    
    // Socket configuration (from your existing code)
    socket.setEncoding('utf8');
    socket.setTimeout(300000); // 5 minute timeout
    
    let buffer = '';
    let strategyDataReceived = false;
    
    socket.on('data', (data) => {
      try {
        buffer += data.toString();
        logger.debug('📥 Raw data received:', { 
          clientId, 
          dataLength: data.toString().length,
          preview: data.toString().substring(0, 200)
        });
        
        // Process complete JSON messages (from your existing logic)
        let lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        lines.forEach(line => {
          if (line.trim()) {
            this.processMessage(line.trim(), socket, clientId, strategyDataReceived);
          }
        });
        
      } catch (error) {
        logger.error('❌ Error processing NinjaTrader data:', { 
          clientId, 
          error: error.message 
        });
      }
    });

    socket.on('close', () => {
      this.connections.delete(clientId);
      logger.logConnection('NinjaTrader', 'disconnected', { clientId });
      
      if (this.connections.size === 0) {
        this.connectionState.isConnected = false;
        this.emit('allDisconnected');
      }
      this.emit('disconnected', { clientId });
    });

    socket.on('error', (error) => {
      logger.error('❌ NinjaTrader socket error:', { 
        clientId, 
        error: error.message 
      });
      this.connections.delete(clientId);
    });

    socket.on('timeout', () => {
      logger.warn('⏰ NinjaTrader socket timeout:', { clientId });
      socket.destroy();
      this.connections.delete(clientId);
    });
  }

  processMessage(message, socket, clientId, strategyDataReceived) {
    try {
      const jsonData = JSON.parse(message);
      this.connectionState.lastHeartbeat = new Date();
      
      logger.debug('📥 Processing message:', { 
        clientId, 
        type: jsonData.type,
        instrument: jsonData.instrument 
      });
      
      // Handle strategy confirmation (from your existing logic)
      if (!strategyDataReceived && this.isStrategyConfirmationMessage(jsonData)) {
        strategyDataReceived = true;
        logger.info('✅ Strategy confirmed active!', { 
          type: jsonData.type,
          instrument: jsonData.instrument 
        });
        this.emit('strategyConfirmed', { clientId, data: jsonData });
      }
      
      // Emit events based on message type (from your existing switch statement)
      switch (jsonData.type) {
        case 'instrument_registration':
          this.emit('instrumentRegistration', jsonData);
          break;
          
        case 'strategy_signal':
          this.emit('strategySignal', jsonData);
          break;
          
        case 'tick_data':
          this.emit('tickData', jsonData);
          break;
          
        case 'strategy_status':
          this.emit('strategyStatus', jsonData);
          break;
          
        case 'market_data':
          logger.info('📊 Market data received:', { 
            instrument: jsonData.instrument,
            price: jsonData.price,
            timestamp: jsonData.timestamp
          });
          this.emit('marketData', jsonData);
          break;
          
        case 'trade_execution':
          this.emit('tradeExecution', jsonData);
          break;
          
        case 'ml_prediction_request':
          this.emit('mlPredictionRequest', jsonData, socket);
          break;
          
        case 'smart_trailing_request':
          this.emit('smartTrailingRequest', jsonData, socket);
          break;
          
        case 'heartbeat':
          this.handleHeartbeat(jsonData, socket);
          break;
          
        default:
          logger.debug('📥 Unknown message type:', { 
            type: jsonData.type,
            clientId 
          });
          this.emit('unknownMessage', jsonData, socket);
      }
      
    } catch (error) {
      logger.error('❌ Error parsing JSON message:', { 
        clientId,
        error: error.message,
        message: message.substring(0, 200) + '...'
      });
    }
  }

  isStrategyConfirmationMessage(jsonData) {
    // From your existing logic - these message types confirm strategy is active
    return ['instrument_registration', 'tick_data', 'strategy_status'].includes(jsonData.type);
  }

  handleHeartbeat(data, socket) {
    try {
      logger.debug('💓 Heartbeat received:', { 
        instrument: data.instrument, 
        timestamp: data.timestamp 
      });
      
      // Respond with heartbeat (from your existing logic)
      if (socket && socket.writable) {
        socket.write(JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: new Date().toISOString() 
        }) + '\n');
      }
    } catch (error) {
      logger.error('❌ Error handling heartbeat:', { error: error.message });
    }
  }

  // Broadcast to all connections (from your existing broadcastToNinja function)
  broadcast(data) {
    const message = JSON.stringify(data) + '\n';
    let sent = 0;
    
    this.connections.forEach((socket, clientId) => {
      try {
        if (socket.writable) {
          socket.write(message);
          sent++;
        } else {
          this.connections.delete(clientId);
        }
      } catch (error) {
        logger.warn('⚠️ Failed to send to NinjaTrader client:', { 
          clientId, 
          error: error.message 
        });
        this.connections.delete(clientId);
      }
    });
    
    logger.debug('📤 Broadcast message:', { 
      type: data.type, 
      sentTo: sent,
      totalConnections: this.connections.size
    });
    
    return sent;
  }

  // Send to specific client
  sendToClient(clientId, data) {
    const socket = this.connections.get(clientId);
    if (socket && socket.writable) {
      try {
        socket.write(JSON.stringify(data) + '\n');
        return true;
      } catch (error) {
        logger.error('❌ Failed to send to specific client:', { 
          clientId, 
          error: error.message 
        });
        this.connections.delete(clientId);
      }
    }
    return false;
  }

  // Heartbeat monitoring (from your existing heartbeat logic)
  startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState.isConnected && this.connectionState.lastHeartbeat) {
        const timeSinceLastHeartbeat = Date.now() - this.connectionState.lastHeartbeat.getTime();
        
        if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
          logger.warn(`⚠️ NinjaTrader heartbeat timeout: ${Math.round(timeSinceLastHeartbeat/1000)}s`);
          this.emit('heartbeatTimeout', { timeSinceLastHeartbeat });
        }
      }
    }, this.config.heartbeatInterval);
  }

  async stop() {
    logger.info('🛑 Stopping NinjaTrader service...');
    
    try {
      // Clear heartbeat monitoring
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Close all connections
      this.connections.forEach((socket, clientId) => {
        try {
          socket.end();
        } catch (error) {
          logger.warn('Error closing socket:', { clientId, error: error.message });
        }
      });
      this.connections.clear();
      
      // Close server
      if (this.server) {
        return new Promise((resolve) => {
          this.server.close(() => {
            logger.info('✅ NinjaTrader service stopped');
            resolve();
          });
        });
      }
    } catch (error) {
      logger.error('❌ Error stopping NinjaTrader service:', { error: error.message });
      throw error;
    }
  }

  // Getters for status (from your existing code)
  get isConnected() {
    return this.connectionState.isConnected;
  }

  get connectionCount() {
    return this.connections.size;
  }

  get lastHeartbeat() {
    return this.connectionState.lastHeartbeat;
  }

  // Method to send trading commands (from your existing logic)
  sendTradingCommand(command) {
    const sent = this.broadcast({
      type: 'unified_trade_command',
      executionType: 'TRADE_ONLY',
      timestamp: new Date().toISOString(),
      ...command
    });
    
    if (sent > 0) {
      logger.info('📤 Trading command sent:', { 
        command: command.command,
        instrument: command.instrument,
        sentTo: sent 
      });
    } else {
      logger.warn('⚠️ Trading command queued but no NinjaTrader connected:', command);
    }
    
    return sent;
  }
}

module.exports = NinjaTraderService;