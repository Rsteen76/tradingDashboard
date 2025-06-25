const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const net = require('net')

// Initialize components
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

// State management
let connectedClients = []
let strategyState = {
  ninjaTraderConnected: false,
  isActive: false,
  startTime: null,
  lastHeartbeat: null,
  mlMetrics: {
    totalPredictions: 0,
    avgConfidence: 0.0,
    modelPerformance: {}
  }
}

let latestStrategyData = {}

console.log('🤖 Starting Simplified ML Server (without TensorFlow)...')

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running', 
    timestamp: new Date().toISOString(),
    ninjaTraderConnected: strategyState.ninjaTraderConnected,
    activeClients: connectedClients.length
  })
})

// WebSocket connection for dashboard
io.on('connection', (socket) => {
  console.log('🌐 Dashboard client connected:', socket.id)
  connectedClients.push(socket)
  
  // Send current state to new client
  socket.emit('strategy_state', strategyState)
  socket.emit('ml_metrics', strategyState.mlMetrics)
  
  if (strategyState.ninjaTraderConnected && Object.keys(latestStrategyData).length > 0) {
    socket.emit('strategy_data', latestStrategyData)
    socket.emit('connection_status', { status: 'connected', timestamp: new Date().toISOString() })
  } else {
    socket.emit('connection_status', { status: 'disconnected', timestamp: new Date().toISOString() })
  }
  
  socket.on('disconnect', () => {
    console.log('❌ Dashboard client disconnected:', socket.id)
    connectedClients = connectedClients.filter(client => client.id !== socket.id)
  })
})

// TCP Server for NinjaTrader connection
const tcpServer = net.createServer((socket) => {
  console.log('🎯 NinjaTrader TCP connection established from:', socket.remoteAddress)
  
  let buffer = ''
  socket.on('data', async (data) => {
    buffer += data.toString()
    let lines = buffer.split('\n')
    buffer = lines.pop() // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const jsonData = JSON.parse(line.trim())
          await processNinjaTraderData(jsonData, socket)
        } catch (error) {
          console.error('❌ Error parsing JSON:', error.message)
          console.error('Raw data:', line.trim())
        }
      }
    }
  })
  
  socket.on('close', () => {
    console.log('🎯 NinjaTrader disconnected')
    strategyState.ninjaTraderConnected = false
    broadcastConnectionStatus('disconnected')
  })
  
  socket.on('error', (error) => {
    console.error('🎯 TCP Socket error:', error.message)
  })
})

async function processNinjaTraderData(jsonData, socket) {
  const { type } = jsonData
  
  console.log('📥 Received from NinjaTrader:', type, jsonData.instrument || '')
  
  switch (type) {
    case 'strategy_status':
      await handleStrategyStatus(jsonData)
      break
      
    case 'ml_prediction_request':
      await handleMLPredictionRequest(jsonData, socket)
      break
      
    case 'trade_execution':
      await handleTradeExecution(jsonData)
      break
      
    case 'market_data':
      await handleMarketData(jsonData)
      break
      
    case 'ping':
    case 'heartbeat':
      await handleHeartbeat(jsonData, socket)
      break
      
    default:
      console.log('📥 Unknown data type:', type)
  }
}

async function handleStrategyStatus(data) {
  // Update connection state
  if (!strategyState.ninjaTraderConnected) {
    strategyState.ninjaTraderConnected = true
    strategyState.isActive = true
    strategyState.startTime = new Date()
    broadcastConnectionStatus('connected')
    console.log('✅ Strategy connected and active!')
  }
  
  strategyState.lastHeartbeat = new Date()
  
  // Update strategy data
  latestStrategyData = {
    ...latestStrategyData,
    ...data,
    timestamp: new Date().toISOString()
  }
  
  // Broadcast to all clients
  connectedClients.forEach(client => {
    client.emit('strategy_data', latestStrategyData)
    client.emit('strategy_state', strategyState)
  })
  
  console.log('📊 Strategy Status:', data.instrument, 'Position:', data.position || 'Flat', 'P&L:', data.unrealizedPnL || 0)
}

async function handleMLPredictionRequest(data, socket) {
  console.log('🤖 ML Prediction requested:', data.instrument)
  
  // Generate simple prediction (without TensorFlow)
  const prediction = generateSimplePrediction(data)
  
  // Send response to NinjaTrader
  const response = {
    type: 'ml_prediction_response',
    instrument: data.instrument,
    timestamp: prediction.timestamp,
    direction: prediction.direction,
    long_probability: prediction.longProbability,
    short_probability: prediction.shortProbability,
    confidence: prediction.confidence,
    strength: prediction.strength,
    recommendation: prediction.recommendation
  }
  
  socket.write(JSON.stringify(response) + '\n')
  
  // Update metrics
  strategyState.mlMetrics.totalPredictions++
  
  console.log('🎯 Sent prediction:', prediction.direction, 'Confidence:', prediction.confidence)
}

function generateSimplePrediction(data) {
  // Simple rule-based prediction without ML
  const price = data.price || 0
  const rsi = data.rsi || 50
  const emaAlignment = data.emaAlignment || 0
  
  let direction = 'HOLD'
  let longProb = 0.5
  let shortProb = 0.5
  let confidence = 0.5
  
  // Simple RSI + EMA logic
  if (rsi < 30 && emaAlignment > 0.6) {
    direction = 'LONG'
    longProb = 0.7
    shortProb = 0.3
    confidence = 0.65
  } else if (rsi > 70 && emaAlignment < -0.6) {
    direction = 'SHORT'
    longProb = 0.3
    shortProb = 0.7
    confidence = 0.65
  } else if (emaAlignment > 0.8) {
    direction = 'LONG'
    longProb = 0.6
    shortProb = 0.4
    confidence = 0.55
  } else if (emaAlignment < -0.8) {
    direction = 'SHORT'
    longProb = 0.4
    shortProb = 0.6
    confidence = 0.55
  }
  
  return {
    timestamp: new Date().toISOString(),
    direction: direction,
    longProbability: Math.round(longProb * 100) / 100,
    shortProbability: Math.round(shortProb * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    strength: Math.round((Math.abs(longProb - shortProb) * 100) * 100) / 100,
    recommendation: confidence > 0.6 ? 'TRADE' : 'WAIT'
  }
}

async function handleTradeExecution(data) {
  console.log('💰 Trade executed:', data.action, data.quantity, 'at', data.price)
  
  // Broadcast to dashboard
  connectedClients.forEach(client => {
    client.emit('trade_execution', data)
  })
}

async function handleMarketData(data) {
  // Update latest data
  latestStrategyData = {
    ...latestStrategyData,
    ...data
  }
  
  // Broadcast to dashboard
  connectedClients.forEach(client => {
    client.emit('market_data', data)
  })
}

async function handleHeartbeat(data, socket) {
  console.log('💓 Heartbeat from NinjaTrader')
  
  // Send heartbeat response
  const response = {
    type: 'heartbeat_response',
    timestamp: new Date().toISOString(),
    server_status: 'running'
  }
  
  socket.write(JSON.stringify(response) + '\n')
  
  strategyState.lastHeartbeat = new Date()
}

function broadcastConnectionStatus(status) {
  connectedClients.forEach(client => {
    client.emit('connection_status', { 
      status: status, 
      timestamp: new Date().toISOString() 
    })
  })
}

// Start servers
tcpServer.listen(9999, () => {
  console.log('🚀 TCP Server listening on port 9999 for NinjaTrader')
})

const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`🌐 ML Server running on port ${PORT}`)
  console.log(`📊 Dashboard connection: http://localhost:${PORT}`)
  console.log(`🎯 NinjaTrader TCP: localhost:9999`)
  console.log('✅ Simplified ML Server ready!')
  console.log('📝 Note: Using simple rule-based predictions (TensorFlow disabled)')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down servers...')
  tcpServer.close()
  server.close()
  process.exit(0)
}) 