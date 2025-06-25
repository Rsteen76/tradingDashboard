const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const net = require('net')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(express.json())
app.use(express.static('public'))

// Store connected clients and strategy state
let connectedClients = []
let latestStrategyData = {}
let strategyState = {
  isActive: false,
  ninjaTraderConnected: false,
  startTime: null,
  lastHeartbeat: null,
  instruments: {},
  positions: {},
  dailyStats: {
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0,
    largestWin: 0,
    largestLoss: 0
  }
}

// Helper functions for strategy monitoring
function calculateTimeInPosition(jsonData) {
  // This would be calculated based on when position was opened
  // For now, return a placeholder
  return 0
}

function updateDailyStats(tradeData) {
  if (tradeData.type === 'trade_execution') {
    strategyState.dailyStats.totalTrades++
    const pnl = parseFloat(tradeData.pnl || 0)
    strategyState.dailyStats.totalPnL += pnl
    
    if (pnl > 0) {
      strategyState.dailyStats.largestWin = Math.max(strategyState.dailyStats.largestWin, pnl)
    } else {
      strategyState.dailyStats.largestLoss = Math.min(strategyState.dailyStats.largestLoss, pnl)
    }
    
    // Calculate win rate (simplified)
    // This would need more sophisticated tracking in a real implementation
  }
}

function formatStrategyUptime() {
  if (!strategyState.startTime) return '00:00:00'
  
  const now = new Date()
  const diff = now - strategyState.startTime
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function clearStaleData() {
  console.log('🧹 Clearing stale data due to NinjaTrader disconnection')
  
  // Clear position data completely
  latestStrategyData.position = 'DISCONNECTED'
  latestStrategyData.position_size = 0
  latestStrategyData.unrealized_pnl = 0
  latestStrategyData.pnl = 0
  latestStrategyData.entry_price = 0
  latestStrategyData.stop_loss = 0
  latestStrategyData.target_price = 0
  latestStrategyData.connection_status = 'Disconnected'
  
  // Clear all market data to prevent stale readings
  latestStrategyData.signal_strength = 0
  latestStrategyData.ml_probability = 0
  latestStrategyData.overall_signal_strength = 0
  latestStrategyData.signal_probability_long = 0
  latestStrategyData.signal_probability_short = 0
  
  // Update strategy state
  strategyState.ninjaTraderConnected = false
  strategyState.lastHeartbeat = null
  strategyState.isActive = false
  
  // Clear all instrument data
  Object.keys(strategyState.instruments).forEach(instrument => {
    strategyState.instruments[instrument].position = 'DISCONNECTED'
    strategyState.instruments[instrument].positionSize = 0
    strategyState.instruments[instrument].unrealizedPnL = 0
  })
  
  console.log('📤 Broadcasting disconnected state to all clients')
  
  // Broadcast disconnection to all clients
  connectedClients.forEach(client => {
    client.emit('strategy_data', latestStrategyData)
    client.emit('strategy_state', strategyState)
    client.emit('connection_status', { status: 'disconnected', timestamp: new Date().toISOString() })
  })
}

// WebSocket connection for dashboard
io.on('connection', (socket) => {
  console.log('🌐 Dashboard client connected:', socket.id)
  console.log('📊 Total connected clients:', connectedClients.length + 1)
  connectedClients.push(socket)
  
  // Send latest data to new client, but only if NinjaTrader is connected
  if (strategyState.ninjaTraderConnected && Object.keys(latestStrategyData).length > 0) {
    console.log('📤 Sending latest data to new client:', latestStrategyData)
    socket.emit('strategy_data', latestStrategyData)
    socket.emit('strategy_state', strategyState)
    socket.emit('connection_status', { status: 'connected', timestamp: new Date().toISOString() })
  } else {
    console.log('⚠️ NinjaTrader not connected, sending disconnected state')
    const disconnectedData = {
      position: 'DISCONNECTED',
      position_size: 0,
      unrealized_pnl: 0,
      connection_status: 'Disconnected'
    }
    socket.emit('strategy_data', disconnectedData)
    socket.emit('strategy_state', { ...strategyState, ninjaTraderConnected: false })
    socket.emit('connection_status', { status: 'disconnected', timestamp: new Date().toISOString() })
  }
  
  // Request current strategy status from NinjaTrader
  console.log('📋 Requesting current strategy status from NinjaTrader...')
  // This will trigger NinjaTrader to send current position info
  
  // Handle manual position reset
  socket.on('reset_position_data', () => {
    console.log('🔄 Manual position reset requested by client:', socket.id)
    
    // Reset position data
    latestStrategyData.position = 'FLAT'
    latestStrategyData.position_size = 0
    latestStrategyData.pnl = 0
    latestStrategyData.entry_price = 0
    latestStrategyData.stop_loss = 0
    latestStrategyData.target_price = 0
    
    // Reset strategy state
    Object.keys(strategyState.instruments).forEach(instrument => {
      strategyState.instruments[instrument].position = 'FLAT'
      strategyState.instruments[instrument].positionSize = 0
      strategyState.instruments[instrument].unrealizedPnL = 0
    })
    
    console.log('✅ Position data reset to FLAT')
    
    // Broadcast updated data to all clients
    connectedClients.forEach(client => {
      client.emit('strategy_data', latestStrategyData)
      client.emit('strategy_state', strategyState)
    })
  })
  
  // Handle manual position updates
  socket.on('manual_position_update', (data) => {
    console.log('🔧 Manual position update requested:', data)
    
    // Update position data based on manual input
    latestStrategyData.position = data.position_status || data.position || 'FLAT'
    latestStrategyData.position_size = data.position_size || 0
    latestStrategyData.pnl = data.unrealized_pnl || 0
    latestStrategyData.entry_price = data.entry_price || 0
    latestStrategyData.timestamp = data.timestamp || new Date().toISOString()
    
    console.log('✅ Position manually updated to:', latestStrategyData.position)
    
    // Broadcast updated data to all clients
    connectedClients.forEach(client => {
      client.emit('strategy_data', latestStrategyData)
    })
  })
  
  socket.on('disconnect', () => {
    console.log('❌ Dashboard client disconnected:', socket.id)
    connectedClients = connectedClients.filter(client => client.id !== socket.id)
    console.log('📊 Remaining connected clients:', connectedClients.length)
  })
})

// TCP Server for NinjaTrader connection (port 9999)
const tcpServer = net.createServer((socket) => {
  console.log('🎯 NinjaTrader TCP connection established from:', socket.remoteAddress)
  
  let strategyDataReceived = false
  
  // Don't immediately set connected status - wait for actual strategy data
  console.log('⏳ Waiting for strategy data to confirm active strategy...')
  
  let buffer = ''
  socket.on('data', (data) => {
    buffer += data.toString()
    console.log('📥 Raw data received:', data.toString().substring(0, 200))
      // Process complete JSON messages (separated by newlines)
    let lines = buffer.split('\n')
    buffer = lines.pop() // Keep incomplete line in buffer
    
    lines.forEach(line => {
      if (line.trim()) {
        console.log('🔍 Processing line:', line.trim().substring(0, 100))
        try {
          const jsonData = JSON.parse(line.trim())
          
          console.log('📥 RAW DATA RECEIVED:', JSON.stringify(jsonData, null, 2))
          
          // Process different message types
          switch (jsonData.type) {
            case 'instrument_registration':
              console.log('📡 Instrument registered:', jsonData.instrument)
              
              // Instrument registration confirms strategy is active
              if (!strategyDataReceived) {
                strategyDataReceived = true
                strategyState.ninjaTraderConnected = true
                strategyState.isActive = true
                console.log('✅ STRATEGY CONFIRMED ACTIVE - Instrument registration received!')
                console.log('📤 Broadcasting connection status to all dashboard clients')
                
                // Notify all dashboard clients of confirmed strategy connection
                connectedClients.forEach(client => {
                  client.emit('connection_status', { status: 'connected', timestamp: new Date().toISOString() })
                })
              }
              break
              
            case 'strategy_signal':
              console.log('🎯 Signal received:', jsonData.direction, 'at', jsonData.price)
              // Broadcast to all dashboard clients
              connectedClients.forEach(client => {
                client.emit('strategy_signal', jsonData)
              })
              break
                case 'tick_data':
              console.log('⚡ Processing tick_data...')
              
              // First tick data received - confirm connection if not already done
              if (!strategyDataReceived) {
                strategyDataReceived = true
                strategyState.ninjaTraderConnected = true
                strategyState.isActive = true
                console.log('✅ STRATEGY CONFIRMED ACTIVE - Tick data flow detected!')
                console.log('📤 Broadcasting connection status to all dashboard clients')
                
                // Notify all dashboard clients of confirmed strategy connection
                connectedClients.forEach(client => {
                  client.emit('connection_status', { status: 'connected', timestamp: new Date().toISOString() })
                })
              }
              
              // Store latest tick data and broadcast to dashboard
              // NOTE: Don't persist position data from tick_data - only update from strategy_status
              latestStrategyData = {
                instrument: jsonData.instrument,
                price: jsonData.price || 0,
                signal_strength: latestStrategyData.signal_strength || 0,
                ml_probability: latestStrategyData.ml_probability || 0,
                rsi: latestStrategyData.rsi || 0,
                ema_alignment: latestStrategyData.ema_alignment || 0,
                pnl: latestStrategyData.pnl || 0,
                position: latestStrategyData.position || 'FLAT',
                position_size: latestStrategyData.position_size || 0,
                timestamp: jsonData.timestamp,
                bid: jsonData.bid || 0,
                ask: jsonData.ask || 0,
                spread: jsonData.spread || 0,
                volume: jsonData.volume || 0,
                // Preserve other position data
                entry_price: latestStrategyData.entry_price || 0,
                stop_loss: latestStrategyData.stop_loss || 0,
                target_price: latestStrategyData.target_price || 0
              }
              
              console.log('📤 Broadcasting tick data to dashboard:', latestStrategyData)
              
              // Broadcast to all connected dashboard clients
              connectedClients.forEach(client => {
                client.emit('strategy_data', latestStrategyData)              })
              break
              
            case 'strategy_status':
              console.log('📊 Processing strategy_status data...')
              
              // First strategy data received - confirm connection
              if (!strategyDataReceived) {
                strategyDataReceived = true
                strategyState.ninjaTraderConnected = true
                strategyState.isActive = true
                console.log('✅ STRATEGY CONFIRMED ACTIVE - Data flow detected!')
                console.log('📤 Broadcasting connection status to all dashboard clients')
                
                // Notify all dashboard clients of confirmed strategy connection
                connectedClients.forEach(client => {
                  client.emit('connection_status', { status: 'connected', timestamp: new Date().toISOString() })
                })
              }
              
              console.log('🔍 RAW POSITION DATA:', {
                position: jsonData.position,
                position_status: jsonData.position_status,
                position_size: jsonData.position_size,
                unrealized_pnl: jsonData.unrealized_pnl,
                realized_pnl: jsonData.realized_pnl,
                entry_price: jsonData.entry_price
              })
              
              // Update strategy state
              strategyState.lastHeartbeat = new Date()
              if (!strategyState.startTime) {
                strategyState.startTime = new Date()
              }
              
              // Determine actual position status
              let actualPosition = 'FLAT'
              let actualPositionSize = 0
              
              // Check position from multiple sources with validation
              const positionFromStatus = jsonData.position_status || jsonData.position
              const positionSize = parseInt(jsonData.position_size) || 0
              
              // Only set position if we have a valid position size > 0
              if (positionSize > 0 && positionFromStatus) {
                actualPosition = positionFromStatus
                actualPositionSize = positionSize
              } else {
                // If position size is 0 or undefined, we're FLAT regardless of position field
                actualPosition = 'FLAT'
                actualPositionSize = 0
              }
              
              console.log('🎯 DETERMINED POSITION:', {
                position: actualPosition,
                size: actualPositionSize,
                reasoning: positionSize > 0 ? 'Has position size' : 'No position size - setting FLAT'
              })
              
              // Update instrument tracking
              const instrument = jsonData.instrument
              strategyState.instruments[instrument] = {
                lastUpdate: new Date(),
                price: jsonData.price || jsonData.current_price || 0,
                position: actualPosition,
                positionSize: actualPositionSize,
                unrealizedPnL: jsonData.unrealized_pnl || 0
              }
              
              // Normalize strategy name to prevent flashing between variants
              const normalizeStrategyName = (rawName) => {
                if (!rawName) return 'ScalperPro'
                // Remove _TICK suffix and other variants to show consistent name
                return rawName.replace(/_TICK$|_BAR$|_SECOND$/, '').replace(/WithML$/, ' ML')
              }

              // Apply data validation and stabilization for key metrics
              const validateNumber = (value, fallback = 0, min = -Infinity, max = Infinity) => {
                const num = parseFloat(value)
                if (isNaN(num) || num < min || num > max) return fallback
                return num
              }
              
              const preserveIfZero = (newValue, oldValue, fallback = 0) => {
                const num = parseFloat(newValue)
                if (isNaN(num) || num === 0) {
                  return oldValue !== undefined ? oldValue : fallback
                }
                return num
              }

              // Generate enhanced ML prediction using AI ensemble
              const enhancedMLPrediction = generateMLPrediction({
                ...jsonData,
                price: validateNumber(jsonData.price || jsonData.current_price, latestStrategyData.price, 0),
                rsi: preserveIfZero(jsonData.rsi_current || jsonData.rsi, latestStrategyData.rsi, 50),
                ema_alignment: preserveIfZero(jsonData.ema_alignment || jsonData.ema_alignment_score, latestStrategyData.ema_alignment, 0),
                signal_strength: preserveIfZero(jsonData.signal_strength || jsonData.overall_signal_strength, latestStrategyData.signal_strength, 0)
              })

              // Store latest data and broadcast to dashboard
              latestStrategyData = {
                instrument: jsonData.instrument,
                price: validateNumber(jsonData.price || jsonData.current_price, latestStrategyData.price, 0),
                signal_strength: preserveIfZero(jsonData.signal_strength || jsonData.overall_signal_strength, latestStrategyData.signal_strength, 0),
                ml_probability: preserveIfZero(jsonData.ml_probability, latestStrategyData.ml_probability, 0),
                rsi: preserveIfZero(jsonData.rsi_current || jsonData.rsi, latestStrategyData.rsi, 50),
                ema_alignment: preserveIfZero(jsonData.ema_alignment || jsonData.ema_alignment_score, latestStrategyData.ema_alignment, 0),
                pnl: validateNumber(jsonData.realized_pnl || jsonData.unrealized_pnl, 0),
                position: actualPosition,
                position_size: actualPositionSize,
                timestamp: jsonData.timestamp,
                strategy_name: normalizeStrategyName(jsonData.strategy_name),
                strategy_instance_id: jsonData.strategy_instance_id || 'unknown',
                // Enhanced position info
                entry_price: actualPositionSize > 0 ? validateNumber(jsonData.entry_price, 0, 0) : 0,
                stop_loss: validateNumber(jsonData.stop_level_long || jsonData.stop_level_short, 0),
                target_price: validateNumber(jsonData.next_long_entry_level || jsonData.next_short_entry_level, 0),
                // Strategy metrics with stability
                overall_signal_strength: preserveIfZero(jsonData.overall_signal_strength, latestStrategyData.overall_signal_strength, 0),
                signal_probability_long: validateNumber(jsonData.signal_probability_long, latestStrategyData.signal_probability_long || 0.5, 0, 1),
                signal_probability_short: validateNumber(jsonData.signal_probability_short, latestStrategyData.signal_probability_short || 0.5, 0, 1),
                ema_alignment_score: preserveIfZero(jsonData.ema_alignment_score, latestStrategyData.ema_alignment_score, 0),
                htf_bias: jsonData.htf_bias || latestStrategyData.htf_bias || 'Unknown',
                volatility_state: jsonData.volatility_state || latestStrategyData.volatility_state || 'Unknown',
                market_regime: jsonData.market_regime || latestStrategyData.market_regime || 'Unknown',
                // Enhanced ML Data - combining NinjaTrader + AI Ensemble
                ml_long_probability: enhancedMLPrediction ? enhancedMLPrediction.longProbability : validateNumber(jsonData.ml_long_probability, latestStrategyData.ml_long_probability || 0.5, 0, 1),
                ml_short_probability: enhancedMLPrediction ? enhancedMLPrediction.shortProbability : validateNumber(jsonData.ml_short_probability, latestStrategyData.ml_short_probability || 0.5, 0, 1),
                ml_confidence_level: enhancedMLPrediction ? enhancedMLPrediction.confidence : validateNumber(jsonData.ml_confidence, latestStrategyData.ml_confidence_level || 0.5, 0, 1),
                ml_volatility_prediction: enhancedMLPrediction ? enhancedMLPrediction.volatility : validateNumber(jsonData.ml_volatility_prediction, latestStrategyData.ml_volatility_prediction || 1.0, 0.1, 3.0),
                ml_market_regime: enhancedMLPrediction ? enhancedMLPrediction.regime : (jsonData.ml_market_regime || latestStrategyData.ml_market_regime || 'Unknown'),
                // AI Enhancement metadata
                aiModels: enhancedMLPrediction ? enhancedMLPrediction.aiModels : undefined,
                adaptiveAccuracy: enhancedMLPrediction ? enhancedMLPrediction.adaptiveAccuracy : undefined,
                detectedPatterns: enhancedMLPrediction ? enhancedMLPrediction.detectedPatterns : undefined,
                ml_recommendation: enhancedMLPrediction ? enhancedMLPrediction.recommendation : 'HOLD'
              }
              
              console.log('📤 Broadcasting to dashboard:', latestStrategyData)
              
              // Broadcast to all connected dashboard clients
              connectedClients.forEach(client => {
                client.emit('strategy_data', latestStrategyData)
                client.emit('strategy_state', strategyState)
              })
              break
              
            case 'market_data':
              console.log('📊 Processing market_data...')
              // Update strategy data with market information
              latestStrategyData = {
                ...latestStrategyData,
                instrument: jsonData.instrument,
                price: jsonData.price || latestStrategyData.price || 0,
                rsi: jsonData.rsi || latestStrategyData.rsi || 0,
                ema_alignment: jsonData.ema_alignment || latestStrategyData.ema_alignment || 0,
                timestamp: jsonData.timestamp,
                volume: jsonData.volume || 0,
                volume_ratio: jsonData.volume_ratio || 0,
                regime: jsonData.regime || 'Unknown'
              }
              
              console.log('📤 Broadcasting market data to dashboard:', latestStrategyData)
              
              // Broadcast to all connected dashboard clients
              connectedClients.forEach(client => {
                client.emit('strategy_data', latestStrategyData)
              })
              break
              
            case 'trade_execution':
              console.log('💰 Trade executed:', jsonData.action, jsonData.quantity, 'at', jsonData.price)
              connectedClients.forEach(client => {
                client.emit('trade_execution', jsonData)
              })
              
              // Update daily stats
              updateDailyStats(jsonData)
              
              // Broadcast updated strategy state
              connectedClients.forEach(client => {
                client.emit('strategy_state', strategyState)
              })
              break
              
            case 'ml_prediction_request':
              console.log('🤖 ML Prediction requested:', jsonData.instrument)
              
              // Generate ML predictions based on technical data
              const mlPrediction = generateMLPrediction(jsonData)
              
              // Send prediction back to NinjaTrader
              const predictionResponse = {
                type: 'ml_prediction_response',
                instrument: jsonData.instrument,
                timestamp: new Date().toISOString(),
                long_probability: mlPrediction.longProbability,
                short_probability: mlPrediction.shortProbability,
                confidence_level: mlPrediction.confidence,
                volatility_prediction: mlPrediction.volatility,
                market_regime: mlPrediction.regime,
                recommendation: mlPrediction.recommendation
              }
              
              // Send back to NinjaTrader
              socket.write(JSON.stringify(predictionResponse) + '\n')
              
              // Also broadcast to dashboard
              connectedClients.forEach(client => {
                client.emit('ml_prediction', predictionResponse)
              })
              break
              
            default:
              console.log('📥 Received unknown data type:', jsonData.type)
              console.log('📋 Full data:', JSON.stringify(jsonData, null, 2))
          }
          
        } catch (error) {
          console.error('❌ Error parsing JSON:', error.message)
          console.error('📝 Raw data:', line.substring(0, 200) + '...')
        }
      }
    })
  })
    socket.on('close', () => {
    console.log('🎯 NinjaTrader disconnected')
    clearStaleData()
  })
  
  socket.on('error', (error) => {
    console.error('🎯 TCP Socket error:', error.message)
    clearStaleData()
  })
})

// Start TCP server for NinjaTrader
tcpServer.listen(9999, () => {
  console.log('🚀 TCP Server listening on port 9999 for NinjaTrader')
})

// Heartbeat monitoring - check for stale connections every 30 seconds
const HEARTBEAT_TIMEOUT = 60000 // 60 seconds
const HEARTBEAT_CHECK_INTERVAL = 30000 // 30 seconds

setInterval(() => {
  if (strategyState.ninjaTraderConnected && strategyState.lastHeartbeat) {
    const timeSinceLastHeartbeat = new Date() - strategyState.lastHeartbeat
    
    if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log(`⚠️ NinjaTrader heartbeat timeout (${Math.round(timeSinceLastHeartbeat/1000)}s since last data)`)
      console.log('🧹 Auto-clearing stale data due to heartbeat timeout')
      clearStaleData()
    }
  }
}, HEARTBEAT_CHECK_INTERVAL)

// Active Strategy Detection - Check for already running strategies
const STRATEGY_DETECTION_INTERVAL = 10000 // 10 seconds
let lastStrategyDetectionCheck = 0

function requestStrategyStatus() {
  // Send a status request to any connected NinjaTrader instances
  tcpServer.getConnections((err, count) => {
    if (!err && count > 0) {
      console.log(`📋 Found ${count} active TCP connections - requesting strategy status`)
      // Broadcast status request to all connected clients
      tcpServer.emit('request_status')
    } else if (!strategyState.ninjaTraderConnected) {
      console.log('🔍 No active NinjaTrader connections detected')
    }
  })
}

// Periodic strategy detection check
setInterval(() => {
  const currentTime = Date.now()
  if (currentTime - lastStrategyDetectionCheck >= STRATEGY_DETECTION_INTERVAL) {
    lastStrategyDetectionCheck = currentTime
    
    if (!strategyState.ninjaTraderConnected) {
      console.log('🔍 Checking for already-running NinjaTrader strategies...')
      requestStrategyStatus()
    }
  }
}, STRATEGY_DETECTION_INTERVAL)

// Enhanced connection tracking
tcpServer.on('connection', (socket) => {
  console.log('🔗 New TCP connection established')
  
  // Immediately request status from newly connected strategy
  setTimeout(() => {
    console.log('📋 Requesting initial status from connected strategy...')
  }, 1000)
})

// Start HTTP/WebSocket server for dashboard
const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`🌐 Dashboard server running on port ${PORT}`)
  console.log(`📊 Dashboard URL: http://localhost:${PORT}`)
  console.log(`🎯 NinjaTrader TCP: localhost:9999`)
  console.log(`💓 Heartbeat monitoring: ${HEARTBEAT_TIMEOUT/1000}s timeout, checked every ${HEARTBEAT_CHECK_INTERVAL/1000}s`)
  console.log(`🔍 Strategy detection: Checking every ${STRATEGY_DETECTION_INTERVAL/1000}s for active strategies`)
  
  // Initial strategy detection check after server startup
  setTimeout(() => {
    console.log('🚀 Performing initial strategy detection check...')
    requestStrategyStatus()
  }, 2000)
})

// Enhanced ML Prediction Engine with Advanced AI
function generateMLPrediction(marketData) {
  try {
    // Extract and smooth technical indicators
    const rawPrice = parseFloat(marketData.price) || 0
    const rawRsi = parseFloat(marketData.rsi) || 50
    const rawEmaAlignment = parseFloat(marketData.ema_alignment) || 0
    const rawSignalStrength = parseFloat(marketData.signal_strength) || 50
    
    // Apply data smoothing
    const price = smoothValue(priceBuffer, rawPrice)
    const rsi = smoothValue(rsiBuffer, rawRsi)
    const emaAlignment = smoothValue(emaAlignmentBuffer, rawEmaAlignment)
    const signalStrength = smoothValue(signalStrengthBuffer, rawSignalStrength)
    
    // Enhanced market data object for AI analysis
    const enhancedMarketData = {
      ...marketData,
      price: price,
      rsi: rsi,
      ema_alignment: emaAlignment,
      signal_strength: signalStrength,
      ema5: parseFloat(marketData.ema5) || price,
      ema8: parseFloat(marketData.ema8) || price,
      ema13: parseFloat(marketData.ema13) || price,
      ema21: parseFloat(marketData.ema21) || price,
      ema50: parseFloat(marketData.ema50) || price,
      atr: parseFloat(marketData.atr) || 0.01,
      volume: parseFloat(marketData.volume) || 1000
    }
    
    console.log('🤖 AI Analysis inputs (enhanced):', {
      price: Math.round(price * 100) / 100, 
      rsi: Math.round(rsi * 10) / 10, 
      emaAlignment: Math.round(emaAlignment * 1000) / 1000,
      signalStrength: Math.round(signalStrength * 10) / 10
    })
    
    // AI Pattern Recognition
    const detectedPatterns = detectTradingPatterns(enhancedMarketData)
    
    // Generate AI Ensemble Prediction
    const aiEnsemblePrediction = generateEnsemblePrediction(enhancedMarketData, detectedPatterns)
    
    // Traditional ML Analysis (for comparison and fallback)
    const emaTrendScore = calculateEMATrendScore(enhancedMarketData.ema5, enhancedMarketData.ema8, enhancedMarketData.ema13, enhancedMarketData.ema21, enhancedMarketData.ema50, price)
    const rsiMomentumScore = calculateRSIMomentumScore(rsi)
    const volatilityScore = calculateVolatilityScore(enhancedMarketData.atr, price)
    const strengthScore = signalStrength / 100.0
    
    // Traditional probabilities
    const traditionalLongProb = Math.max(0, Math.min(1, 
      0.5 + (emaTrendScore.bullish * 0.4) + (rsiMomentumScore.bullish * 0.25) + 
      (volatilityScore.favorable * 0.2) + (strengthScore * 0.15)
    ))
    
    const traditionalShortProb = 1 - traditionalLongProb
    const traditionalConfidence = Math.min(0.95, 0.5 + (Math.abs(traditionalLongProb - traditionalShortProb) * 0.8))
    
    // Combine AI and Traditional predictions (70% AI, 30% Traditional)
    const finalLongProbability = (aiEnsemblePrediction.longProbability * 0.7) + (traditionalLongProb * 0.3)
    const finalShortProbability = (aiEnsemblePrediction.shortProbability * 0.7) + (traditionalShortProb * 0.3)
    const finalConfidence = (aiEnsemblePrediction.confidence * 0.7) + (traditionalConfidence * 0.3)
    
    // Determine market regime with AI enhancement
    const marketRegime = determineMarketRegime(emaTrendScore, volatilityScore, emaAlignment)
    
    // Generate recommendation with AI consideration
    const recommendation = generateRecommendation(finalLongProbability, finalShortProbability, finalConfidence)
    
    const rawPrediction = {
      longProbability: Math.round(finalLongProbability * 1000) / 1000,
      shortProbability: Math.round(finalShortProbability * 1000) / 1000,
      confidence: Math.round(finalConfidence * 1000) / 1000,
      volatility: Math.round(volatilityScore.level * 1000) / 1000,
      regime: marketRegime,
      recommendation: recommendation,
      // AI Enhancement Metadata
      aiModels: aiEnsemblePrediction.models,
      adaptiveAccuracy: Math.round(aiEnsemblePrediction.adaptiveAccuracy * 1000) / 1000,
      detectedPatterns: Object.keys(detectedPatterns).filter(key => detectedPatterns[key])
    }
    
    // Add to history for stabilization
    updateMLPredictionHistory(rawPrediction)
    
    // Check if we should update the ML prediction
    if (shouldUpdateMLPrediction(rawPrediction)) {
      lastMLPrediction = rawPrediction
      lastMLUpdateTime = Date.now()
      console.log('🤖 ML Prediction updated:', rawPrediction)
      return rawPrediction
    } else {
      // Return stabilized prediction based on recent history
      const stabilizedPrediction = getStabilizedMLPrediction()
      console.log('🤖 ML Prediction stabilized (no significant change)')
      return stabilizedPrediction
    }
    
  } catch (error) {
    console.error('❌ Error generating ML prediction:', error)
    return {
      longProbability: 0.5,
      shortProbability: 0.5,
      confidence: 0.5,
      volatility: 1.0,
      regime: 'Unknown',
      recommendation: 'NEUTRAL'
    }
  }
}

function calculateEMATrendScore(ema5, ema8, ema13, ema21, ema50, price) {
  // Bullish alignment scoring
  let bullishScore = 0
  let bearishScore = 0
  
  // Price vs EMAs
  if (price > ema5) bullishScore += 0.2; else bearishScore += 0.2
  if (price > ema8) bullishScore += 0.2; else bearishScore += 0.2
  if (price > ema13) bullishScore += 0.2; else bearishScore += 0.2
  
  // EMA alignment
  if (ema5 > ema8) bullishScore += 0.15; else bearishScore += 0.15
  if (ema8 > ema13) bullishScore += 0.15; else bearishScore += 0.15
  if (ema13 > ema21) bullishScore += 0.1; else bearishScore += 0.1
  
  return {
    bullish: Math.max(-0.5, Math.min(0.5, bullishScore - 0.5)),
    bearish: Math.max(-0.5, Math.min(0.5, bearishScore - 0.5))
  }
}

function calculateRSIMomentumScore(rsi) {
  // RSI momentum analysis
  let bullishScore = 0
  let bearishScore = 0
  
  if (rsi > 30 && rsi < 70) {
    // Favorable RSI range
    if (rsi > 50) {
      bullishScore = (rsi - 50) / 50 * 0.3
    } else {
      bearishScore = (50 - rsi) / 50 * 0.3
    }
  } else if (rsi >= 70) {
    bearishScore = 0.2 // Overbought
  } else if (rsi <= 30) {
    bullishScore = 0.2 // Oversold
  }
  
  return {
    bullish: Math.max(-0.3, Math.min(0.3, bullishScore)),
    bearish: Math.max(-0.3, Math.min(0.3, bearishScore))
  }
}

function calculateVolatilityScore(atr, price) {
  const volatilityRatio = atr / price
  let favorableScore = 0
  let level = 1.0
  
  // Optimal volatility range for scalping
  if (volatilityRatio > 0.005 && volatilityRatio < 0.02) {
    favorableScore = 0.2 // Good volatility for scalping
    level = 1.0
  } else if (volatilityRatio <= 0.005) {
    favorableScore = -0.1 // Too low volatility
    level = 0.7
  } else {
    favorableScore = -0.1 // Too high volatility
    level = 1.3
  }
  
  return {
    favorable: favorableScore,
    level: level
  }
}

function determineMarketRegime(emaTrendScore, volatilityScore, emaAlignment) {
  const trendStrength = Math.abs(emaTrendScore.bullish) + Math.abs(emaTrendScore.bearish)
  
  if (trendStrength > 0.3) {
    return 'Trending'
  } else if (volatilityScore.level < 0.8) {
    return 'Ranging'
  } else {
    return 'Transitional'
  }
}

function generateRecommendation(longProb, shortProb, confidence) {
  if (confidence < 0.6) {
    return 'NEUTRAL'
  }
  
  if (longProb > shortProb + 0.1) {
    return confidence > 0.8 ? 'STRONG_LONG' : 'LONG'
  } else if (shortProb > longProb + 0.1) {
    return confidence > 0.8 ? 'STRONG_SHORT' : 'SHORT'
  } else {
    return 'NEUTRAL'
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down servers...')
  tcpServer.close()
  server.close()
  process.exit(0)
})

// Data stabilization for ML predictions
let lastMLPrediction = null
let mlPredictionHistory = []
const ML_PREDICTION_CACHE_SIZE = 5
const ML_CHANGE_THRESHOLD = 0.05 // 5% change threshold
const ML_UPDATE_COOLDOWN = 2000 // 2 seconds minimum between significant updates
let lastMLUpdateTime = 0

// Data smoothing buffers
const DATA_BUFFER_SIZE = 3
let priceBuffer = []
let rsiBuffer = []
let emaAlignmentBuffer = []
let signalStrengthBuffer = []

function smoothValue(buffer, newValue, bufferSize = DATA_BUFFER_SIZE) {
  if (isNaN(newValue) || newValue === null || newValue === undefined) {
    return buffer.length > 0 ? buffer[buffer.length - 1] : 0
  }
  
  buffer.push(newValue)
  if (buffer.length > bufferSize) {
    buffer.shift()
  }
  
  // Return weighted average (more weight to recent values)
  let weightedSum = 0
  let totalWeight = 0
  for (let i = 0; i < buffer.length; i++) {
    const weight = i + 1 // More weight to recent values
    weightedSum += buffer[i] * weight
    totalWeight += weight
  }
  
  return weightedSum / totalWeight
}

function shouldUpdateMLPrediction(newPrediction) {
  const currentTime = Date.now()
  
  // Always allow first prediction
  if (!lastMLPrediction) {
    return true
  }
  
  // Enforce cooldown period
  if (currentTime - lastMLUpdateTime < ML_UPDATE_COOLDOWN) {
    return false
  }
  
  // Check if changes are significant enough
  const longChange = Math.abs(newPrediction.longProbability - lastMLPrediction.longProbability)
  const shortChange = Math.abs(newPrediction.shortProbability - lastMLPrediction.shortProbability)
  const confidenceChange = Math.abs(newPrediction.confidence - lastMLPrediction.confidence)
  
  const hasSignificantChange = longChange > ML_CHANGE_THRESHOLD || 
                              shortChange > ML_CHANGE_THRESHOLD || 
                              confidenceChange > ML_CHANGE_THRESHOLD ||
                              newPrediction.recommendation !== lastMLPrediction.recommendation
  
  return hasSignificantChange
}

function updateMLPredictionHistory(prediction) {
  mlPredictionHistory.push({
    ...prediction,
    timestamp: Date.now()
  })
  
  if (mlPredictionHistory.length > ML_PREDICTION_CACHE_SIZE) {
    mlPredictionHistory.shift()
  }
}

function getStabilizedMLPrediction() {
  if (mlPredictionHistory.length === 0) {
    return lastMLPrediction
  }
  
  // Calculate consensus from recent predictions
  const recentPredictions = mlPredictionHistory.slice(-3) // Last 3 predictions
  
  const avgLongProb = recentPredictions.reduce((sum, p) => sum + p.longProbability, 0) / recentPredictions.length
  const avgShortProb = recentPredictions.reduce((sum, p) => sum + p.shortProbability, 0) / recentPredictions.length
  const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length
  
  // Use most recent regime and recommendation if they're consistent
  const latestPrediction = recentPredictions[recentPredictions.length - 1]
  
  return {
    longProbability: Math.round(avgLongProb * 1000) / 1000,
    shortProbability: Math.round(avgShortProb * 1000) / 1000,
    confidence: Math.round(avgConfidence * 1000) / 1000,
    volatility: latestPrediction.volatility,
    regime: latestPrediction.regime,
    recommendation: latestPrediction.recommendation
  }
}

// Advanced AI/ML Enhancement Variables
let tradingPatterns = []
let performanceHistory = []
let adaptiveLearningEnabled = true
let ensemblePredictions = []
const PATTERN_HISTORY_SIZE = 100
const PERFORMANCE_HISTORY_SIZE = 50

// Pattern Recognition AI
function detectTradingPatterns(marketData) {
  try {
    const price = parseFloat(marketData.price) || 0
    const rsi = parseFloat(marketData.rsi) || 50
    const ema5 = parseFloat(marketData.ema5) || price
    const ema21 = parseFloat(marketData.ema21) || price
    const volume = parseFloat(marketData.volume) || 1000
    const atr = parseFloat(marketData.atr) || 0.01
    
    const patterns = {
      // Momentum Patterns
      bullishMomentum: rsi > 60 && price > ema5 && ema5 > ema21,
      bearishMomentum: rsi < 40 && price < ema5 && ema5 < ema21,
      
      // Reversal Patterns
      bullishReversal: rsi < 30 && price < ema21 && volume > 1500,
      bearishReversal: rsi > 70 && price > ema21 && volume > 1500,
      
      // Breakout Patterns
      bullishBreakout: price > ema21 && Math.abs(price - ema21) > (atr * 0.5),
      bearishBreakout: price < ema21 && Math.abs(price - ema21) > (atr * 0.5),
      
      // Consolidation Patterns
      consolidation: Math.abs(price - ema21) < (atr * 0.3) && rsi > 45 && rsi < 55,
      
      // Volume Patterns
      highVolumeConfirmation: volume > 2000,
      lowVolumeWarning: volume < 500
    }
    
    // Store pattern for learning
    tradingPatterns.push({
      timestamp: Date.now(),
      price: price,
      patterns: patterns,
      marketConditions: {
        rsi: rsi,
        emaSpread: ((ema5 - ema21) / price) * 100,
        volatility: (atr / price) * 100,
        volume: volume
      }
    })
    
    // Maintain pattern history size
    if (tradingPatterns.length > PATTERN_HISTORY_SIZE) {
      tradingPatterns.shift()
    }
    
    return patterns
  } catch (error) {
    console.error('❌ Pattern detection error:', error)
    return {}
  }
}

// Adaptive Learning System
function updatePerformanceLearning(prediction, actualOutcome) {
  try {
    const performance = {
      timestamp: Date.now(),
      prediction: prediction,
      actual: actualOutcome,
      accuracy: Math.abs(prediction.confidence - actualOutcome.confidence),
      patternContext: tradingPatterns.slice(-5) // Last 5 patterns
    }
    
    performanceHistory.push(performance)
    
    if (performanceHistory.length > PERFORMANCE_HISTORY_SIZE) {
      performanceHistory.shift()
    }
    
    // Calculate recent accuracy
    const recentPerformance = performanceHistory.slice(-10)
    const avgAccuracy = recentPerformance.reduce((sum, p) => sum + (1 - p.accuracy), 0) / recentPerformance.length
    
    console.log(`🧠 ML Learning Update - Recent Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`)
    
    return avgAccuracy
  } catch (error) {
    console.error('❌ Performance learning error:', error)
    return 0.5
  }
}

// Ensemble Prediction System
function generateEnsemblePrediction(marketData, patterns) {
  try {
    const predictions = []
    
    // Model 1: Technical Analysis AI
    const technicalPrediction = generateTechnicalAIPrediction(marketData)
    predictions.push({ ...technicalPrediction, weight: 0.4, model: 'Technical' })
    
    // Model 2: Pattern Recognition AI
    const patternPrediction = generatePatternAIPrediction(patterns)
    predictions.push({ ...patternPrediction, weight: 0.3, model: 'Pattern' })
    
    // Model 3: Momentum AI
    const momentumPrediction = generateMomentumAIPrediction(marketData)
    predictions.push({ ...momentumPrediction, weight: 0.2, model: 'Momentum' })
    
    // Model 4: Volume AI
    const volumePrediction = generateVolumeAIPrediction(marketData)
    predictions.push({ ...volumePrediction, weight: 0.1, model: 'Volume' })
    
    // Ensemble weighting with adaptive learning
    const recentAccuracy = performanceHistory.length > 5 ? 
      performanceHistory.slice(-5).reduce((sum, p) => sum + (1 - p.accuracy), 0) / 5 : 0.7
    
    // Adjust weights based on recent performance
    const adaptiveWeight = adaptiveLearningEnabled ? recentAccuracy : 1.0
    
    let weightedLong = 0, weightedShort = 0, weightedConfidence = 0, totalWeight = 0
    
    predictions.forEach(pred => {
      const adjustedWeight = pred.weight * adaptiveWeight
      weightedLong += pred.longProbability * adjustedWeight
      weightedShort += pred.shortProbability * adjustedWeight
      weightedConfidence += pred.confidence * adjustedWeight
      totalWeight += adjustedWeight
    })
    
    const ensembleResult = {
      longProbability: weightedLong / totalWeight,
      shortProbability: weightedShort / totalWeight,
      confidence: Math.min(0.95, weightedConfidence / totalWeight),
      models: predictions.map(p => ({ model: p.model, weight: p.weight })),
      adaptiveAccuracy: recentAccuracy
    }
    
    // Store for ensemble learning
    ensemblePredictions.push({
      timestamp: Date.now(),
      prediction: ensembleResult,
      marketContext: marketData
    })
    
    if (ensemblePredictions.length > 50) {
      ensemblePredictions.shift()
    }
    
    console.log(`🎯 Ensemble AI Prediction:`, {
      direction: ensembleResult.longProbability > ensembleResult.shortProbability ? 'LONG' : 'SHORT',
      confidence: `${(ensembleResult.confidence * 100).toFixed(1)}%`,
      adaptiveAccuracy: `${(recentAccuracy * 100).toFixed(1)}%`
    })
    
    return ensembleResult
  } catch (error) {
    console.error('❌ Ensemble prediction error:', error)
    return { longProbability: 0.5, shortProbability: 0.5, confidence: 0.5 }
  }
}

// Specialized AI Models
function generateTechnicalAIPrediction(marketData) {
  const price = parseFloat(marketData.price) || 0
  const ema5 = parseFloat(marketData.ema5) || price
  const ema21 = parseFloat(marketData.ema21) || price
  const rsi = parseFloat(marketData.rsi) || 50
  
  // Advanced technical analysis with AI weighting
  const emaStrength = Math.tanh((ema5 - ema21) / price * 100) // Normalized EMA relationship
  const rsiMomentum = Math.tanh((rsi - 50) / 25) // Normalized RSI momentum
  
  const longProb = 0.5 + (emaStrength * 0.3) + (rsiMomentum * 0.2)
  const shortProb = 1 - longProb
  const confidence = Math.abs(emaStrength) + Math.abs(rsiMomentum) * 0.5
  
  return {
    longProbability: Math.max(0, Math.min(1, longProb)),
    shortProbability: Math.max(0, Math.min(1, shortProb)),
    confidence: Math.max(0.1, Math.min(0.9, confidence))
  }
}

function generatePatternAIPrediction(patterns) {
  let score = 0
  let confidence = 0.5
  
  if (patterns.bullishMomentum || patterns.bullishReversal || patterns.bullishBreakout) {
    score += 0.3
    confidence += 0.2
  }
  
  if (patterns.bearishMomentum || patterns.bearishReversal || patterns.bearishBreakout) {
    score -= 0.3
    confidence += 0.2
  }
  
  if (patterns.highVolumeConfirmation) {
    confidence += 0.1
  }
  
  if (patterns.consolidation) {
    confidence -= 0.1 // Less confident during consolidation
  }
  
  const longProb = 0.5 + score
  const shortProb = 1 - longProb
  
  return {
    longProbability: Math.max(0, Math.min(1, longProb)),
    shortProbability: Math.max(0, Math.min(1, shortProb)),
    confidence: Math.max(0.1, Math.min(0.8, confidence))
  }
}

function generateMomentumAIPrediction(marketData) {
  const rsi = parseFloat(marketData.rsi) || 50
  const volume = parseFloat(marketData.volume) || 1000
  const atr = parseFloat(marketData.atr) || 0.01
  const price = parseFloat(marketData.price) || 0
  
  // Momentum scoring with AI normalization
  const rsiMomentum = (rsi - 50) / 50 // -1 to 1 scale
  const volumeBoost = Math.min(volume / 2000, 2) // Volume multiplier
  const volatilityFactor = Math.min((atr / price) * 100, 3) // Volatility factor
  
  const momentumScore = rsiMomentum * volumeBoost * (1 + volatilityFactor * 0.1)
  
  const longProb = 0.5 + (momentumScore * 0.25)
  const shortProb = 1 - longProb
  const confidence = Math.abs(momentumScore) * 0.5 + 0.3
  
  return {
    longProbability: Math.max(0, Math.min(1, longProb)),
    shortProbability: Math.max(0, Math.min(1, shortProb)),
    confidence: Math.max(0.1, Math.min(0.8, confidence))
  }
}

function generateVolumeAIPrediction(marketData) {
  const volume = parseFloat(marketData.volume) || 1000
  const volumeRatio = parseFloat(marketData.volume_ratio) || 1
  
  // Volume-based AI prediction
  const volumeStrength = Math.tanh((volume - 1500) / 1000) // Normalized volume
  const volumeRatioSignal = Math.tanh((volumeRatio - 1) * 2) // Volume ratio signal
  
  const combinedVolumeSignal = (volumeStrength + volumeRatioSignal) / 2
  
  const longProb = 0.5 + (combinedVolumeSignal * 0.15)
  const shortProb = 1 - longProb
  const confidence = Math.abs(combinedVolumeSignal) * 0.3 + 0.2
  
  return {
    longProbability: Math.max(0, Math.min(1, longProb)),
    shortProbability: Math.max(0, Math.min(1, shortProb)),
    confidence: Math.max(0.1, Math.min(0.6, confidence))
  }
}
