'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'
import ConnectionStatus from '@/components/ConnectionStatus'
import Toast from '@/components/Toast'
import MLPanel from '@/components/MLPanel'
import SignalPanel from '@/components/SignalPanel'
import LearningPanel from '@/components/LearningPanel'
import UpcomingTradesPanel from '@/components/UpcomingTradesPanel'
import { TradingErrorBoundary } from '@/components/ErrorBoundary'
import { validateStrategyData, PerformanceMonitor } from '@/utils/dataValidation'

interface StrategyData {
  instrument?: string
  price?: number
  signal_strength?: number
  ml_probability?: number
  rsi?: number
  ema_alignment?: number
  pnl?: number
  position?: string
  position_size?: number
  timestamp?: string
  strategy_name?: string
  strategy_instance_id?: string
  entry_price?: number
  stop_loss?: number
  target_price?: number
  target1?: number
  target2?: number
  overall_signal_strength?: number
  signal_probability_long?: number
  signal_probability_short?: number
  ema_alignment_score?: number
  htf_bias?: string
  volatility_state?: string
  market_regime?: string
  ml_long_probability?: number
  ml_short_probability?: number
  ml_confidence_level?: number
  ml_volatility_prediction?: number
  ml_market_regime?: string
  bid?: number
  ask?: number
  spread?: number
  volume?: number
  // New ML-powered trade level fields
  next_long_entry_level?: number
  next_short_entry_level?: number
  long_entry_quality?: number
  short_entry_quality?: number
  ml_trade_recommendation?: string
  recommended_position_size?: number
  ml_mode?: string
  last_ml_update?: string
  data_source?: string
}

interface ConnectionState {
  status: 'connected' | 'disconnected'
  ninjaTraderConnected: boolean
  isActive: boolean
  startTime?: string
  lastHeartbeat?: string
}

interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ContractSpecs {
  tickSize: number
  tickValue: number
  pointValue: number
  displayName: string
}

function getContractSpecs(instrument?: string): ContractSpecs {
  if (!instrument) return { tickSize: 0.25, tickValue: 12.5, pointValue: 50, displayName: 'ES' }
  
  const upperInstrument = instrument.toUpperCase()
  
  // E-mini S&P 500 (ES)
  if (upperInstrument.includes('ES') || upperInstrument.includes('S&P') || upperInstrument.includes('SPX')) {
    return { tickSize: 0.25, tickValue: 12.5, pointValue: 50, displayName: 'ES' }
  }
  
  // E-mini Nasdaq (NQ)
  if (upperInstrument.includes('NQ') || upperInstrument.includes('NASDAQ')) {
    return { tickSize: 0.25, tickValue: 5, pointValue: 20, displayName: 'NQ' }
  }
  
  // E-mini Russell 2000 (RTY)
  if (upperInstrument.includes('RTY') || upperInstrument.includes('RUSSELL')) {
    return { tickSize: 0.1, tickValue: 5, pointValue: 50, displayName: 'RTY' }
  }
  
  // E-mini Dow (YM)
  if (upperInstrument.includes('YM') || upperInstrument.includes('DOW')) {
    return { tickSize: 1, tickValue: 5, pointValue: 5, displayName: 'YM' }
  }
  
  // Crude Oil (CL)
  if (upperInstrument.includes('CL') || upperInstrument.includes('CRUDE')) {
    return { tickSize: 0.01, tickValue: 10, pointValue: 1000, displayName: 'CL' }
  }
  
  // Gold (GC)
  if (upperInstrument.includes('GC') || upperInstrument.includes('GOLD')) {
    return { tickSize: 0.1, tickValue: 10, pointValue: 100, displayName: 'GC' }
  }
  
  // Euro (6E)
  if (upperInstrument.includes('6E') || upperInstrument.includes('EUR')) {
    return { tickSize: 0.0001, tickValue: 12.5, pointValue: 125000, displayName: '6E' }
  }
  
  // Default to ES specs if unknown
  return { tickSize: 0.25, tickValue: 12.5, pointValue: 50, displayName: 'ES' }
}

// Custom hook for smooth data transitions
function useSmoothedData<T>(data: T, delay: number = 75): T {
  const [smoothedData, setSmoothedData] = useState<T>(data)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSmoothedData(data)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [data, delay])
  
  return smoothedData
}

// Custom hook for debounced updates
function useDebouncedValue<T>(value: T, delay: number = 25): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}

// Enhanced data comparison with floating-point tolerance and ML stability
function dataHasChanged(newData: StrategyData, oldData: StrategyData): boolean {
  const tolerance = 0.001
  const mlTolerance = 0.02 // Higher tolerance for ML data to reduce flashing
  
  // Critical data that should always update
  const criticalKeys: (keyof StrategyData)[] = ['position', 'position_size', 'pnl']
  // Regular data with normal tolerance
  const regularKeys: (keyof StrategyData)[] = ['price', 'signal_strength', 'rsi']
  // ML data with higher tolerance to reduce flashing
  const mlKeys: (keyof StrategyData)[] = ['ml_long_probability', 'ml_short_probability', 'ml_confidence_level']
  
  // Check critical data first (always update if changed)
  const criticalChanged = criticalKeys.some(key => {
    const newVal = newData[key]
    const oldVal = oldData[key]
    return newVal !== oldVal
  })
  
  if (criticalChanged) return true
  
  // Check regular data with normal tolerance
  const regularChanged = regularKeys.some(key => {
    const newVal = newData[key]
    const oldVal = oldData[key]
    
    if (typeof newVal === 'number' && typeof oldVal === 'number') {
      return Math.abs(newVal - oldVal) > tolerance
    }
    return newVal !== oldVal
  })
  
  // Check ML data with higher tolerance
  const mlChanged = mlKeys.some(key => {
    const newVal = newData[key]
    const oldVal = oldData[key]
    
    if (typeof newVal === 'number' && typeof oldVal === 'number') {
      return Math.abs(newVal - oldVal) > mlTolerance
    }
    return newVal !== oldVal
  })
  
  return regularChanged || mlChanged
}

export default function Dashboard() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [strategyData, setStrategyData] = useState<StrategyData>({})
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    ninjaTraderConnected: false,
    isActive: false
  })
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStable, setConnectionStable] = useState(false)
  const [lastDataTimestamp, setLastDataTimestamp] = useState<string>('')
  
  // Performance monitoring
  useEffect(() => {
    PerformanceMonitor.trackRender('Dashboard')
  })
  
  // Toast management with maximum limit
  const MAX_TOASTS = 5

  // Smooth data transitions
  const smoothedStrategyData = useSmoothedData(strategyData, 75)
  const debouncedData = useDebouncedValue(smoothedStrategyData, 25)

  // Simplified connection stability detection
  useEffect(() => {
    // Check if we have recent data
    const hasRecentData = debouncedData.timestamp && 
      (Date.now() - new Date(debouncedData.timestamp).getTime()) < 60000 // 60 seconds (more tolerant)

    // Check for any data that indicates connection
    const hasAnyData = debouncedData.price > 0 || 
                      debouncedData.rsi > 0 || 
                      debouncedData.instrument ||
                      debouncedData.data_source === 'ml_intelligence_engine'

    // Simple connection detection - if we have any data, we're stable
    const shouldBeStable = hasAnyData

    if (shouldBeStable && !connectionStable) {
      setConnectionStable(true)
      setIsLoading(false)
    } else if (!hasAnyData && connectionStable) {
      // Only go to loading if we truly have no data for a while
      const timer = setTimeout(() => {
        setConnectionStable(false)
        setIsLoading(true)
      }, 30000) // 30 seconds - very generous
      return () => clearTimeout(timer)
    }
  }, [connectionState.isActive, debouncedData.timestamp, debouncedData.price, debouncedData.data_source, connectionStable])

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => {
      const newToasts = [...prev, { id, message, type }]
      // Limit maximum number of toasts to prevent UI overflow
      return newToasts.slice(-MAX_TOASTS)
    })
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }, [MAX_TOASTS])

  // Monitor data freshness (less aggressive)
  useEffect(() => {
    if (debouncedData.timestamp) {
      setLastDataTimestamp(debouncedData.timestamp)
      
      // Check for stale data every 60 seconds (less frequent)
      const staleCheckInterval = setInterval(() => {
        const dataAge = Date.now() - new Date(debouncedData.timestamp).getTime()
        if (dataAge > 120000) { // 2 minutes (more tolerant)
          setConnectionState(prev => ({
            ...prev,
            ninjaTraderConnected: false,
            isActive: false
          }))
          addToast('Data connection appears stale', 'error')
        }
      }, 60000) // Check every 60 seconds instead of 30

      return () => clearInterval(staleCheckInterval)
    }
  }, [debouncedData.timestamp, addToast])

  useEffect(() => {
    const newSocket = io('http://localhost:8080')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to ML Dashboard')
      addToast('Connected to ML Dashboard', 'success')
    })

    newSocket.on('strategy_data', (rawData: any) => {
      // Validate incoming data to prevent crashes
      const data = validateStrategyData(rawData)
      
      // Reduce console logging to prevent spam
      if (Math.random() < 0.05) { // 5% chance to log
        console.log('Strategy data received:', data.instrument, data.price)
      }
      
      setStrategyData(prevData => {
        if (dataHasChanged(data, prevData)) {
          // Auto-detect connection status from data content (less aggressive)
          const hasValidData = data.price > 0 || 
                              data.rsi > 0 || 
                              data.instrument ||
                              data.data_source === 'ml_intelligence_engine'
          
          // Only update connection state if we're currently disconnected
          if (hasValidData && !connectionState.isActive) {
            setConnectionState(prev => ({
              ...prev,
              ninjaTraderConnected: true,
              isActive: true,
              status: 'connected'
            }))
          }
          
          return data
        }
        return prevData
      })
    })

    newSocket.on('connection_status', (status: any) => {
      console.log('Connection status event:', status)
      setConnectionState(prev => ({
        ...prev,
        status: status.status,
        ninjaTraderConnected: status.status === 'connected'
      }))
      
      if (status.status === 'connected') {
        addToast('NinjaTrader strategy connected', 'success')
      } else {
        addToast('NinjaTrader strategy disconnected', 'error')
      }
    })

    newSocket.on('strategy_connected', () => {
      console.log('Strategy connected event')
      setConnectionState(prev => ({
        ...prev,
        ninjaTraderConnected: true,
        isActive: true,
        status: 'connected'
      }))
      addToast('Strategy connected successfully', 'success')
    })

    newSocket.on('strategy_disconnected', () => {
      console.log('Strategy disconnected event')
      setConnectionState(prev => ({
        ...prev,
        ninjaTraderConnected: false,
        isActive: false,
        status: 'disconnected'
      }))
      addToast('Strategy disconnected', 'error')
    })

    // Handle heartbeat to prevent stale connections
    newSocket.on('heartbeat', (heartbeatData: any) => {
      // Only log heartbeat occasionally to reduce console spam
      if (Math.random() < 0.1) { // 10% chance to log
        console.log('Heartbeat received - ML server active')
      }
      
      // Only update connection state if there's a significant change
      setConnectionState(prevState => {
        const newNinjaConnected = heartbeatData.ninja_connected || false
        const newIsActive = heartbeatData.ml_server_status === 'active'
        
        // Only update if something actually changed
        if (prevState.ninjaTraderConnected !== newNinjaConnected || prevState.isActive !== newIsActive) {
          return {
            ...prevState,
            ninjaTraderConnected: newNinjaConnected,
            isActive: newIsActive
          }
        }
        return prevState
      })
      
      // Keep connection alive by updating timestamp
      setLastDataTimestamp(heartbeatData.timestamp)
    })

    // Handle disconnect from server
    newSocket.on('disconnect', () => {
      console.log('Disconnected from ML Dashboard')
      setConnectionState(prev => ({
        ...prev,
        ninjaTraderConnected: false,
        isActive: false,
        status: 'disconnected'
      }))
      addToast('Lost connection to ML Dashboard', 'error')
    })

    return () => {
      newSocket.close()
    }
  }, [addToast])

  // Enhanced computed values with better P&L and next trade level logic
  const computedValues = useMemo(() => {
    const price = debouncedData.price || 0
    const position = debouncedData.position || 'FLAT'
    const positionSize = debouncedData.position_size || 0
    const entryPrice = debouncedData.entry_price || 0
    const unrealizedPnl = debouncedData.pnl || 0
    const instrument = debouncedData.instrument || ''
    
    // Get contract specifications for accurate calculations
    const contractSpecs = getContractSpecs(instrument)
    
    // Calculate real-time P&L - should be 0 when flat
    let realTimePnl = 0 // Default to 0 for flat positions
    
    // Only calculate P&L if we actually have a position
    if (positionSize > 0 && entryPrice > 0 && price > 0 && !position.toLowerCase().includes('flat')) {
      const isLong = position.toUpperCase().includes('LONG')
      const pointDifference = isLong 
        ? (price - entryPrice) 
        : (entryPrice - price)
      
      // Use correct contract multiplier for accurate P&L
      realTimePnl = pointDifference * positionSize * contractSpecs.pointValue
    }
    
    // Enhanced next trade level calculation
    const stopLoss = debouncedData.stop_loss || 0
    const targetPrice = debouncedData.target_price || 0
    const target1 = debouncedData.target1 || 0
    const target2 = debouncedData.target2 || 0
    
    // Calculate meaningful distances and levels
    let nextTradeInfo = {
      level: 0,
      distance: 0,
      type: 'None',
      description: 'No levels set'
    }
    
    // Enhanced logic to show the most relevant level
    if (stopLoss > 0 || target1 > 0 || target2 > 0) {
      const levels = []
      
      if (stopLoss > 0) {
        levels.push({
          level: stopLoss,
          distance: Math.abs(price - stopLoss),
          type: 'Stop Loss',
          priority: 1 // Highest priority for risk management
        })
      }
      
      if (target1 > 0) {
        levels.push({
          level: target1,
          distance: Math.abs(price - target1),
          type: 'Target 1',
          priority: 2
        })
      }
      
      if (target2 > 0) {
        levels.push({
          level: target2,
          distance: Math.abs(price - target2),
          type: 'Target 2',
          priority: 3
        })
      }
      
      // Find the closest level
      if (levels.length > 0) {
        const closestLevel = levels.reduce((closest, current) => 
          current.distance < closest.distance ? current : closest
        )
        
        // Calculate dollar value of the distance
        const dollarDistance = closestLevel.distance * contractSpecs.pointValue
        
        nextTradeInfo = {
          level: closestLevel.level,
          distance: closestLevel.distance,
          type: closestLevel.type,
          description: `${closestLevel.distance.toFixed(2)} pts ($${dollarDistance.toFixed(0)}) to ${closestLevel.type}`
        }
      }
    }
    
    // Position status with better detection
    const isFlat = positionSize === 0 || position.toLowerCase().includes('flat') || position.toLowerCase().includes('disconnected')
    const hasPosition = !isFlat && positionSize > 0
    const positionType = isFlat ? 'FLAT' : 
      (position.toUpperCase().includes('LONG') ? 'LONG' : 
       position.toUpperCase().includes('SHORT') ? 'SHORT' : 'FLAT')
    
    return {
      price,
      position: positionType,
      positionSize,
      entryPrice,
      pnl: realTimePnl,
      unrealizedPnl,
      hasPosition,
      nextTradeInfo,
      stopLoss,
      targetPrice,
      target1,
      target2,
      // Contract specifications
      contractSpecs,
      instrument,
      // Connection indicators
      dataAge: debouncedData.timestamp ? Date.now() - new Date(debouncedData.timestamp).getTime() : 0,
      isDataFresh: debouncedData.timestamp ? (Date.now() - new Date(debouncedData.timestamp).getTime()) < 30000 : false
    }
  }, [debouncedData])

  const LoadingSkeleton = () => (
    <div className="animate-pulse bg-gray-700/50 rounded h-5 w-20"></div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-trading-dark text-white transition-opacity duration-500 opacity-90">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-trading-green via-trading-blue to-purple-400 bg-clip-text text-transparent animate-gradient">
                ScalperPro ML Dashboard
              </h1>
              <p className="text-gray-400">Professional Trading Strategy Monitor</p>
            </div>
                      <ConnectionStatus 
            isConnected={connectionState.ninjaTraderConnected}
            isActive={connectionState.isActive}
            dataAge={computedValues.dataAge}
            lastUpdate={lastDataTimestamp}
          />
          </div>

          {/* Loading State */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="trading-card p-8 rounded-xl">
                <div className="animate-pulse bg-gray-700/50 rounded h-8 w-48 mb-6"></div>
                <div className="animate-pulse bg-gray-700/50 rounded h-32 w-full"></div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="trading-card p-6 rounded-xl">
                <div className="animate-pulse bg-gray-700/50 rounded h-6 w-32 mb-4"></div>
                <div className="space-y-3">
                  <div className="animate-pulse bg-gray-700/50 rounded h-4 w-full"></div>
                  <div className="animate-pulse bg-gray-700/50 rounded h-4 w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-trading-dark text-white transition-opacity duration-500 opacity-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-trading-green via-trading-blue to-purple-400 bg-clip-text text-transparent animate-gradient">
              ScalperPro ML Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-400">Professional Trading Strategy Monitor</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{debouncedData.instrument || 'No Instrument'}</span>
                <span>•</span>
                <span>ScalperPro ML</span>
              </div>
            </div>
          </div>
          <ConnectionStatus 
            isConnected={connectionState.ninjaTraderConnected}
            isActive={connectionState.isActive}
            dataAge={computedValues.dataAge}
            lastUpdate={lastDataTimestamp}
          />
        </div>

        {/* Main Trading Overview */}
        <div className="mb-8 p-6 bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Current Price */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-white">
                {connectionStable ? `$${computedValues.price.toLocaleString()}` : <LoadingSkeleton />}
              </div>
            </div>

            {/* Position Status */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Position</div>
              <div className="flex items-center justify-center gap-2">
                {connectionStable ? (
                  <>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      computedValues.hasPosition 
                        ? computedValues.position === 'LONG' 
                          ? 'bg-trading-green/20 text-trading-green border border-trading-green/30'
                          : 'bg-trading-red/20 text-trading-red border border-trading-red/30'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                    }`}>
                      {computedValues.position}
                    </div>
                    {computedValues.hasPosition && (
                      <span className="text-sm text-gray-400">
                        {computedValues.positionSize} contracts
                      </span>
                    )}
                  </>
                ) : <LoadingSkeleton />}
              </div>
            </div>

            {/* P&L */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Unrealized P&L</div>
              <div className={`text-xl font-bold ${
                computedValues.pnl > 0 ? 'text-trading-green' : 
                computedValues.pnl < 0 ? 'text-trading-red' : 'text-gray-400'
              }`}>
                {connectionStable ? `$${computedValues.pnl.toFixed(2)}` : <LoadingSkeleton />}
              </div>
            </div>

            {/* Next Trade Distance */}
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Next Trade Level</div>
              <div className="text-lg font-medium text-trading-blue">
                {connectionStable ? (
                  computedValues.nextTradeInfo.description
                ) : <LoadingSkeleton />}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - ML Analysis & Signals */}
          <div className="lg:col-span-2 space-y-6">
            {/* ML Intelligence Panel */}
            <TradingErrorBoundary componentName="MLPanel">
              <MLPanel 
                data={debouncedData} 
                isLoading={!connectionStable}
              />
            </TradingErrorBoundary>

            {/* Signal Analysis Panel */}
            <TradingErrorBoundary componentName="SignalPanel">
              <SignalPanel 
                data={debouncedData} 
                isLoading={!connectionStable}
              />
            </TradingErrorBoundary>
          </div>

          {/* Right Column - Trade Opportunities */}
          <div className="space-y-6">
            {/* ML-Powered Upcoming Trades Panel */}
            <TradingErrorBoundary componentName="UpcomingTradesPanel">
              <UpcomingTradesPanel 
                data={debouncedData} 
                isLoading={!connectionStable}
              />
            </TradingErrorBoundary>

            {/* Current Position Details (if in position) */}
            {computedValues.hasPosition && connectionStable && (
              <div className="trading-card p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${
                    computedValues.position === 'LONG' ? 'bg-trading-green' : 'bg-trading-red'
                  }`}></span>
                  Active Position
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Direction:</span>
                    <span className={`font-medium ${
                      computedValues.position === 'LONG' ? 'text-trading-green' : 'text-trading-red'
                    }`}>
                      {computedValues.position}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="font-medium">{computedValues.positionSize} contracts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Entry:</span>
                    <span className="font-medium">${computedValues.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current:</span>
                    <span className="font-medium">${computedValues.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract:</span>
                    <span className="font-medium text-blue-400">
                      {computedValues.contractSpecs.displayName} (${computedValues.contractSpecs.pointValue}/pt)
                    </span>
                  </div>
                  
                  {/* Trade Levels Section */}
                  {(computedValues.stopLoss > 0 || computedValues.target1 > 0 || computedValues.target2 > 0) && (
                    <>
                      <div className="border-t border-gray-700 pt-3 mt-3">
                        <div className="text-sm text-gray-400 mb-2">Trade Levels</div>
                        
                        {computedValues.stopLoss > 0 && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-red-400 text-sm">Stop Loss:</span>
                            <div className="text-right">
                              <span className="font-medium text-red-400">${computedValues.stopLoss.toFixed(2)}</span>
                              <div className="text-xs text-gray-500">
                                {Math.abs(computedValues.price - computedValues.stopLoss).toFixed(2)} pts 
                                (${(Math.abs(computedValues.price - computedValues.stopLoss) * computedValues.contractSpecs.pointValue).toFixed(0)})
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {computedValues.target1 > 0 && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-yellow-400 text-sm">Target 1:</span>
                            <div className="text-right">
                              <span className="font-medium text-yellow-400">${computedValues.target1.toFixed(2)}</span>
                              <div className="text-xs text-gray-500">
                                {Math.abs(computedValues.price - computedValues.target1).toFixed(2)} pts 
                                (${(Math.abs(computedValues.price - computedValues.target1) * computedValues.contractSpecs.pointValue).toFixed(0)})
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {computedValues.target2 > 0 && (
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-green-400 text-sm">Target 2:</span>
                            <div className="text-right">
                              <span className="font-medium text-green-400">${computedValues.target2.toFixed(2)}</span>
                              <div className="text-xs text-gray-500">
                                {Math.abs(computedValues.price - computedValues.target2).toFixed(2)} pts 
                                (${(Math.abs(computedValues.price - computedValues.target2) * computedValues.contractSpecs.pointValue).toFixed(0)})
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between border-t border-gray-700 pt-2">
                    <span className="text-gray-400">P&L:</span>
                    <span className={`font-bold ${
                      computedValues.pnl > 0 ? 'text-trading-green' : 
                      computedValues.pnl < 0 ? 'text-trading-red' : 'text-gray-400'
                    }`}>
                      ${computedValues.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Trade Levels Panel (when not in position but levels are set) */}
            {!computedValues.hasPosition && connectionStable && 
             (computedValues.stopLoss > 0 || computedValues.target1 > 0 || computedValues.target2 > 0) && (
              <div className="trading-card p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                  Pending Trade Levels
                </h3>
                
                <div className="space-y-3">
                  {computedValues.stopLoss > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-red-400 text-sm">Stop Level:</span>
                      <div className="text-right">
                        <span className="font-medium text-red-400">${computedValues.stopLoss.toFixed(2)}</span>
                        <div className="text-xs text-gray-500">
                          {Math.abs(computedValues.price - computedValues.stopLoss).toFixed(2)} pts 
                          (${(Math.abs(computedValues.price - computedValues.stopLoss) * computedValues.contractSpecs.pointValue).toFixed(0)})
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {computedValues.target1 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-400 text-sm">Target 1:</span>
                      <div className="text-right">
                        <span className="font-medium text-yellow-400">${computedValues.target1.toFixed(2)}</span>
                        <div className="text-xs text-gray-500">
                          {Math.abs(computedValues.price - computedValues.target1).toFixed(2)} pts 
                          (${(Math.abs(computedValues.price - computedValues.target1) * computedValues.contractSpecs.pointValue).toFixed(0)})
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {computedValues.target2 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 text-sm">Target 2:</span>
                      <div className="text-right">
                        <span className="font-medium text-green-400">${computedValues.target2.toFixed(2)}</span>
                        <div className="text-xs text-gray-500">
                          {Math.abs(computedValues.price - computedValues.target2).toFixed(2)} pts 
                          (${(Math.abs(computedValues.price - computedValues.target2) * computedValues.contractSpecs.pointValue).toFixed(0)})
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 border-t border-gray-700 pt-2 mt-2">
                    Next level: {computedValues.nextTradeInfo.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Learning Analytics Section */}
        <div className="mt-8">
          <TradingErrorBoundary componentName="LearningPanel">
            <LearningPanel />
          </TradingErrorBoundary>
        </div>

        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
