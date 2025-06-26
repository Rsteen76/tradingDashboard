const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const net = require('net')
const winston = require('winston')

// Initialize logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

// Initialize components
const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Store server start time
const serverStartTime = new Date()

// NinjaTrader TCP server
let ninjaServer = null
const ninjaConnections = new Map()

// System metrics
let systemMetrics = {
  requestsProcessed: 0,
  predictionsGenerated: 0,
  modelsActive: 0,
  uptime: 0,
  memoryUsage: 0,
  connectionStatus: 'Initializing'
}

// Middleware
app.use(express.json())

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    memory: process.memoryUsage(),
    connections: ninjaConnections.size,
    metrics: systemMetrics
  })
})

app.get('/metrics', (req, res) => {
  res.json({
    predictions_generated: systemMetrics.predictionsGenerated,
    requests_processed: systemMetrics.requestsProcessed,
    active_models: systemMetrics.modelsActive,
    ninja_connections: ninjaConnections.size,
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
    memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  })
})

app.post('/predict', async (req, res) => {
  try {
    systemMetrics.requestsProcessed++
    
    // Simple fallback prediction
    const prediction = {
      direction: Math.random() > 0.5 ? 'LONG' : 'SHORT',
      confidence: 0.65 + Math.random() * 0.3,
      strength: Math.random() * 0.5 + 0.5,
      recommendation: 'WAIT',
      reasoning: 'Simple test prediction'
    }
    
    systemMetrics.predictionsGenerated++
    
    res.json({
      success: true,
      prediction,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Prediction API error', { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Socket.IO connections
io.on('connection', (socket) => {
  logger.info('Dashboard client connected', { clientId: socket.id })
  
  socket.emit('system_status', {
    status: 'connected',
    metrics: systemMetrics
  })
  
  socket.on('disconnect', () => {
    logger.info('Dashboard client disconnected', { clientId: socket.id })
  })
})

// NinjaTrader TCP Server Setup
function createNinjaTraderServer() {
  ninjaServer = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`
    ninjaConnections.set(clientId, socket)
    
    logger.info('🎯 NinjaTrader connected', { clientId })
    systemMetrics.connectionStatus = 'Connected'
    
    socket.setEncoding('utf8')
    socket.setTimeout(300000) // 5 minute timeout
    
    // Handle incoming data from NinjaTrader
    socket.on('data', async (data) => {
      try {
        const lines = data.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const jsonData = JSON.parse(line)
            await processNinjaTraderData(jsonData, socket)
          } catch (parseError) {
            logger.warn('Failed to parse JSON from NinjaTrader', { 
              data: line.substring(0, 100),
              error: parseError.message 
            })
          }
        }
      } catch (error) {
        logger.error('Error processing NinjaTrader data', { 
          error: error.message,
          clientId 
        })
      }
    })
    
    socket.on('close', () => {
      ninjaConnections.delete(clientId)
      logger.info('🎯 NinjaTrader disconnected', { clientId })
      if (ninjaConnections.size === 0) {
        systemMetrics.connectionStatus = 'Waiting for connections'
      }
    })
    
    socket.on('error', (error) => {
      logger.error('NinjaTrader socket error', { error: error.message, clientId })
      ninjaConnections.delete(clientId)
    })
  })
  
  return ninjaServer
}

// Process data from NinjaTrader
async function processNinjaTraderData(jsonData, socket) {
  try {
    logger.info('📨 Received from NinjaTrader', { type: jsonData.type })
    
    // Simple echo response for testing
    const response = {
      type: 'response',
      timestamp: new Date().toISOString(),
      received: jsonData.type || 'unknown',
      status: 'processed'
    }
    
    socket.write(JSON.stringify(response) + '\n')
    
  } catch (error) {
    logger.error('Error processing NinjaTrader data', { error: error.message })
  }
}

// Start server
async function startServer() {
  try {
    logger.info('🚀 Starting Simple ML Trading Server...')
    
    // Start NinjaTrader TCP server on port 9999
    const ninjaServer = createNinjaTraderServer()
    ninjaServer.listen(9999, '0.0.0.0', () => {
      logger.info('🎯 NinjaTrader TCP server listening on port 9999')
    })
    
    // Start HTTP server on port 8080
    const PORT = process.env.PORT || 8080
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🌐 HTTP/WebSocket server listening on port ${PORT}`)
      logger.info(`📊 Dashboard: http://localhost:${PORT}`)
      logger.info(`🔍 Health check: http://localhost:${PORT}/health`)
      logger.info(`📈 Metrics: http://localhost:${PORT}/metrics`)
    })
    
    systemMetrics.connectionStatus = 'Waiting for connections'
    systemMetrics.modelsActive = 1 // Fake model count
    
    logger.info('✅ Simple ML Trading Server ready!')
    logger.info('🎯 Ready for NinjaTrader connections on port 9999')
    logger.info('🌐 Web dashboard available on port 8080')
    
  } catch (error) {
    logger.error('❌ Failed to start server', { error: error.message })
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down server...')
  
  try {
    ninjaConnections.forEach((socket) => {
      socket.end()
    })
    ninjaConnections.clear()
    
    if (ninjaServer) ninjaServer.close()
    server.close()
    
    logger.info('✅ Server shut down gracefully')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error during shutdown', { error: error.message })
    process.exit(1)
  }
})

// Start the server
startServer().catch((error) => {
  logger.error('💥 Failed to start server', { error: error.message })
  process.exit(1)
}) 