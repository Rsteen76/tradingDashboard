// server/src/services/websocket-service.js
// Extracted from your ml-server.backup.js WebSocket/Dashboard logic

const socketIo = require('socket.io');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const config = require('../utils/config');

class WebSocketService extends EventEmitter {
  constructor(httpServer, options = {}) {
    super();
    
    this.httpServer = httpServer;
    this.config = { ...config.websocket, ...options };
    this.io = null;
    this.connectedClients = new Map();
    
    // Strategy state (from your existing strategyState)
    this.strategyState = {
      isActive: false,
      ninjaTraderConnected: false,
      startTime: null,
      lastHeartbeat: null,
      instruments: {},
      positions: {},
      mlMetrics: {
        totalPredictions: 0,
        accuracy: 0,
        avgConfidence: 0,
        modelPerformance: {}
      }
    };
    
    this.latestStrategyData = {};
    this.heartbeatInterval = null;
  }

  async initialize() {
    try {
      // Initialize Socket.IO with your existing configuration
      this.io = socketIo(this.httpServer, {
        cors: this.config.cors,
        pingTimeout: this.config.pingTimeout,
        pingInterval: this.config.pingInterval
      });

      this.setupEventHandlers();
      this.startHeartbeatBroadcast();
      
      logger.info('✅ WebSocket service initialized');
      return this;
      
    } catch (error) {
      logger.error('❌ Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    // Main connection handler (from your existing io.on('connection') logic)
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.connectedClients.set(clientId, {
        socket,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      logger.logConnection('Dashboard', 'connected', { 
        clientId,
        totalClients: this.connectedClients.size 
      });

      // Send current state to new client (from your existing logic)
      this.sendCurrentState(socket);

      // Handle client events (from your existing socket event handlers)
      this.setupClientEventHandlers(socket, clientId);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        logger.logConnection('Dashboard', 'disconnected', { 
          clientId,
          remainingClients: this.connectedClients.size 
        });
        this.emit('clientDisconnected', clientId);
      });

      this.emit('clientConnected', clientId, socket);
    });
  }

  sendCurrentState(socket) {
    // Send current strategy state (from your existing logic)
    socket.emit('strategy_state', this.strategyState);
    socket.emit('ml_metrics', this.strategyState.mlMetrics);
    
    if (this.strategyState.ninjaTraderConnected && Object.keys(this.latestStrategyData).length > 0) {
      socket.emit('strategy_data', this.latestStrategyData);
      socket.emit('connection_status', { 
        status: 'connected', 
        timestamp: new Date().toISOString() 
      });
    } else {
      const disconnectedData = {
        position: 'DISCONNECTED',
        position_size: 0,
        unrealized_pnl: 0,
        connection_status: 'Disconnected'
      };
      socket.emit('strategy_data', disconnectedData);
      socket.emit('strategy_state', { ...this.strategyState, ninjaTraderConnected: false });
      socket.emit('connection_status', { 
        status: 'disconnected', 
        timestamp: new Date().toISOString() 
      });
    }
  }

  setupClientEventHandlers(socket, clientId) {
    // Settings updates (from your existing dashboard event handlers)
    socket.on('update_settings', (settings, ack) => {
      logger.info('⚙️ Settings update requested:', { clientId, settings });
      this.emit('settingsUpdate', settings, ack);
    });

    socket.on('get_settings', (ack) => {
      this.emit('getSettings', ack);
    });

    // Manual trading (from your existing manual trade handlers)
    socket.on('manual_trade', (payload, ack) => {
      logger.info('📤 Manual trade requested:', { 
        clientId, 
        command: payload.command,
        instrument: payload.instrument,
        quantity: payload.quantity
      });

      // Immediately acknowledge back to client to confirm receipt
      if (typeof ack === 'function') {
        try {
          ack({ success: true, received: true })
        } catch (err) {
          logger.warn('Ack callback error on manual_trade:', err?.message)
        }
      }

      // Emit internal event for downstream trade execution logic
      this.emit('manualTrade', payload);
    });

    // Position management (from your existing position handlers)
    socket.on('reset_position_data', () => {
      logger.info('🔄 Position reset requested:', { clientId });
      this.emit('resetPosition', clientId);
    });

    socket.on('manual_position_update', (data) => {
      logger.info('🔧 Manual position update:', { clientId, data });
      this.emit('manualPositionUpdate', data);
    });

    // ML prediction requests (from your existing ML handlers)
    socket.on('request_ml_prediction', async (data) => {
      logger.info('🤖 ML prediction requested:', { clientId, instrument: data.instrument });
      this.emit('mlPredictionRequest', data, socket);
    });

    socket.on('request_model_performance', async () => {
      logger.info('📊 Model performance requested:', { clientId });
      this.emit('modelPerformanceRequest', socket);
    });

    socket.on('request_model_retrain', async (modelName) => {
      logger.info('🔄 Model retrain requested:', { clientId, modelName });
      this.emit('modelRetrainRequest', modelName, socket);
    });

    // Update last activity
    socket.on('ping', () => {
      const client = this.connectedClients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
    });
  }

  // Broadcast methods (from your existing broadcast logic)
  broadcast(event, data) {
    try {
      this.io.emit(event, data);
      logger.debug('📤 Broadcast to all clients:', { 
        event, 
        clientCount: this.connectedClients.size 
      });
    } catch (error) {
      logger.error('❌ Broadcast error:', { event, error: error.message });
    }
  }

  broadcastToClients(event, data) {
    // Alternative method name for compatibility
    this.broadcast(event, data);
  }

  sendToClient(clientId, event, data) {
    const client = this.connectedClients.get(clientId);
    if (client && client.socket) {
      try {
        client.socket.emit(event, data);
        client.lastActivity = new Date();
        return true;
      } catch (error) {
        logger.error('❌ Send to client error:', { 
          clientId, 
          event, 
          error: error.message 
        });
        this.connectedClients.delete(clientId);
      }
    }
    return false;
  }

  // Strategy data updates (from your existing strategy data handling)
  updateStrategyData(data) {
    this.latestStrategyData = {
      ...this.latestStrategyData,
      ...data,
      timestamp: new Date().toISOString()
    };
    
    this.broadcast('strategy_data', this.latestStrategyData);
  }

  updateStrategyState(updates) {
    this.strategyState = {
      ...this.strategyState,
      ...updates
    };
    
    this.broadcast('strategy_state', this.strategyState);
  }

  updateConnectionStatus(status) {
    const connectionData = {
      status,
      timestamp: new Date().toISOString(),
      connectedClients: this.connectedClients.size
    };
    
    this.broadcast('connection_status', connectionData);
    
    // Update strategy state
    this.strategyState.ninjaTraderConnected = (status === 'connected');
    if (status === 'connected' && !this.strategyState.startTime) {
      this.strategyState.startTime = new Date();
      this.strategyState.isActive = true;
    } else if (status === 'disconnected') {
      this.strategyState.isActive = false;
    }
  }

  // Heartbeat system (from your existing heartbeat logic)
  startHeartbeatBroadcast() {
    this.heartbeatInterval = setInterval(() => {
      const currentTime = new Date();
      
      // Calculate uptime
      const uptime = this.strategyState.startTime ? 
        Math.floor((currentTime - new Date(this.strategyState.startTime)) / 1000) : 0;
      
      const heartbeatData = {
        timestamp: currentTime.toISOString(),
        ml_server_status: 'active',
        ninja_connected: this.strategyState.ninjaTraderConnected,
        uptime: uptime,
        connectedClients: this.connectedClients.size
      };
      
      this.broadcast('heartbeat', heartbeatData);
    }, 5000); // Every 5 seconds
  }

  // Clear stale data (from your existing clearStaleData function)
  clearStaleData() {
    logger.info('🧹 Clearing stale data due to NinjaTrader disconnection');
    
    // Reset strategy data
    this.latestStrategyData = {
      position: 'DISCONNECTED',
      position_size: 0,
      unrealized_pnl: 0,
      pnl: 0,
      entry_price: 0,
      stop_loss: 0,
      target_price: 0,
      connection_status: 'Disconnected',
      signal_strength: 0,
      ml_probability: 0,
      overall_signal_strength: 0,
      signal_probability_long: 0,
      signal_probability_short: 0
    };
    
    // Update strategy state
    this.updateStrategyState({
      ninjaTraderConnected: false,
      lastHeartbeat: null,
      isActive: false
    });
    
    // Clear instrument data
    Object.keys(this.strategyState.instruments).forEach(instrument => {
      this.strategyState.instruments[instrument] = {
        ...this.strategyState.instruments[instrument],
        position: 'DISCONNECTED',
        positionSize: 0,
        unrealizedPnL: 0
      };
    });
    
    // Broadcast updated state
    this.broadcast('strategy_data', this.latestStrategyData);
    this.broadcast('strategy_state', this.strategyState);
    this.updateConnectionStatus('disconnected');
  }

  async stop() {
    logger.info('🛑 Stopping WebSocket service...');
    
    try {
      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Disconnect all clients
      this.connectedClients.forEach((client, clientId) => {
        try {
          client.socket.disconnect(true);
        } catch (error) {
          logger.warn('Error disconnecting client:', { clientId, error: error.message });
        }
      });
      this.connectedClients.clear();
      
      // Close Socket.IO
      if (this.io) {
        this.io.close();
      }
      
      logger.info('✅ WebSocket service stopped');
    } catch (error) {
      logger.error('❌ Error stopping WebSocket service:', error);
      throw error;
    }
  }

  // Getters for status
  get clientCount() {
    return this.connectedClients.size;
  }

  get isNinjaConnected() {
    return this.strategyState.ninjaTraderConnected;
  }

  get currentStrategyData() {
    return this.latestStrategyData;
  }

  get currentStrategyState() {
    return this.strategyState;
  }
}

module.exports = WebSocketService;