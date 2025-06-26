import { useState, useEffect, useRef } from 'react'
import io, { Socket } from 'socket.io-client'

export interface MarketData {
  type: "market_data"
  instrument: string
  timestamp: string
  price: number
  ema5: number
  ema8: number
  ema13: number
  ema21: number
  ema50: number
  ema200: number
  rsi: number
  atr: number
  adx: number
  volume: number
  volume_ratio: number
  regime: string
}

export interface StrategyStatus {
  type: "strategy_status"
  strategy_instance_id: string
  strategy_name: string
  instrument: string
  timestamp: string
  current_price: number
  position: "Long" | "Short" | "Flat"
  position_size: number
  unrealized_pnl: number
  entry_price: number
  last_entry_price: number
  last_trade_direction: "Long" | "Short"
  stop_loss: number
  target1: number
  target2: number
  position_synced: boolean
  debug_strategy_position: string
  debug_strategy_quantity: number
  tick_size: number
  point_value: number
  state: string
  tick_count_session: number
  bars_processed: number
  overall_signal_strength: number
  signal_probability_long: number
  signal_probability_short: number
  ema_alignment_score: number
  ema_alignment_strength: string
  ema_trend_direction: string
  rsi_current: number
  rsi_zone: string
  rsi_distance_to_signal: number
  htf_bias: string
  volatility_state: string
  market_regime: string
  next_long_entry_level: number
  next_short_entry_level: number
  stop_level_long: number
  stop_level_short: number
  time_since_last_signal: number
  strategy_uptime: number
  connection_status: string
  smart_trailing_enabled: boolean
  smart_trailing_active: boolean
  current_smart_stop: number
  active_trailing_algorithm: string
  trailing_confidence_threshold: number
  trailing_update_interval: number
  max_stop_movement_atr: number
  last_trailing_update: number
}

export interface TradeMessage {
  type: "trade"
  instrument: string
  timestamp: string
  direction: "Long" | "Short"
  entry_price: number
  exit_price: number
  pnl: number
  quantity: number
  entry_time: string
  exit_time: string
  stop_price: number
  target1_price: number
  target2_price: number
  exit_reason: string
  regime: string
  rsi: number
  atr: number
  adx: number
  volume_ratio: number
  mae: number
  mfe: number
  actual_rr: number
  trade_type: string
}

export interface RiskManagement {
  type: "risk_management"
  instrument: string
  timestamp: string
  consecutive_losses: number
  daily_loss: number
  max_daily_loss: number
  max_consecutive_losses: number
  trading_disabled: boolean
  session_starting_balance: number
}

export interface StrategyData {
  marketData?: MarketData
  strategyStatus?: StrategyStatus
  lastTrade?: TradeMessage
  riskManagement?: RiskManagement
}

interface ConnectionState {
  isConnected: boolean
  latency: number
}

// Use the correct port for the ML server
const SOCKET_URL = 'http://localhost:8080'

// Validate incoming data against interface
function validateData<T>(data: any, type: string): data is T {
  if (!data || typeof data !== 'object') return false
  if (data.type !== type) return false
  return true
}

export function useSocket() {
  const [strategyData, setStrategyData] = useState<StrategyData>({})
  const [marketDataHistory, setMarketDataHistory] = useState<MarketData[]>([])
  const [tradeHistory, setTradeHistory] = useState<TradeMessage[]>([])
  const [mlPrediction, setMlPrediction] = useState<any>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    latency: 0
  })
  
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const latencyIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    let isSubscribed = true

    const connectSocket = () => {
      console.log('Connecting to ML server at:', SOCKET_URL)
      
      // Clean up existing socket if any
      if (socketRef.current?.connected) {
        socketRef.current.disconnect()
      }

      const socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
      })

      socketRef.current = socket

      socket.on('connect', () => {
        if (!isSubscribed) return
        console.log('Connected to ML server')
        setConnectionState(prev => ({ ...prev, isConnected: true }))
        
        // Start measuring latency
        latencyIntervalRef.current = setInterval(() => {
          const start = Date.now()
          socket.emit('ping', () => {
            const latency = Date.now() - start
            setConnectionState(prev => ({ ...prev, latency }))
          })
        }, 5000)
      })

      socket.on('disconnect', () => {
        if (!isSubscribed) return
        console.log('Disconnected from ML server')
        setConnectionState(prev => ({ ...prev, isConnected: false }))
        
        // Clear latency interval
        if (latencyIntervalRef.current) {
          clearInterval(latencyIntervalRef.current)
        }
      })

      socket.on('error', (error: Error) => {
        console.error('Socket error:', error)
        if (!isSubscribed) return
        
        // Attempt reconnection
        socket.disconnect()
        reconnectTimeoutRef.current = setTimeout(connectSocket, 2000)
      })

      socket.on('market_data', (data: any) => {
        if (!isSubscribed) return
        if (!validateData<MarketData>(data, 'market_data')) {
          console.error('Invalid market data:', data)
          return
        }
        console.log('Received market data:', data)
        setStrategyData(prev => ({
          ...prev,
          marketData: data
        }))
        // Keep last 100 data points for the chart
        setMarketDataHistory(prev => {
          const newHistory = [...prev, data].slice(-100)
          return newHistory
        })
      })

      socket.on('strategy_status', (data: any) => {
        if (!isSubscribed) return
        if (!validateData<StrategyStatus>(data, 'strategy_status')) {
          console.error('Invalid strategy status:', data)
          return
        }
        console.log('Received strategy status:', data)
        setStrategyData(prev => ({
          ...prev,
          strategyStatus: data
        }))
      })

      socket.on('trade', (data: any) => {
        if (!isSubscribed) return
        if (!validateData<TradeMessage>(data, 'trade')) {
          console.error('Invalid trade data:', data)
          return
        }
        console.log('Received trade:', data)
        setStrategyData(prev => ({
          ...prev,
          lastTrade: data
        }))
        // push to trade history (keep last 50)
        setTradeHistory(prev => {
          const newHist = [...prev, data]
          return newHist.slice(-50)
        })
      })

      socket.on('risk_management', (data: any) => {
        if (!isSubscribed) return
        if (!validateData<RiskManagement>(data, 'risk_management')) {
          console.error('Invalid risk management data:', data)
          return
        }
        console.log('Received risk management:', data)
        setStrategyData(prev => ({
          ...prev,
          riskManagement: data
        }))
      })

      socket.on('ml_prediction', (data: any) => {
        if (!isSubscribed) return
        console.log('Received ml_prediction', data)
        setMlPrediction(data)
      })

      socket.on('current_settings', (data: any) => {
        if (!isSubscribed) return
        console.log('Received current_settings', data)
        // Broadcast settings to any components that need them
        window.dispatchEvent(new CustomEvent('server-settings-received', { detail: data }))
      })
    }

    // Initial connection
    connectSocket()

    // Cleanup function
    return () => {
      isSubscribed = false
      
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current)
      }
    }
  }, [])

  const updateServerSettings = (settings: Record<string, any>) => {
    return new Promise((resolve) => {
      socketRef.current?.emit('update_settings', settings, (response: any) => {
        resolve(response)
      })
    })
  }

  const sendManualTrade = (payload: { command: string; quantity?: number }) => {
    return new Promise((resolve) => {
      socketRef.current?.emit('manual_trade', payload, (resp: any) => resolve(resp))
    })
  }

  return { strategyData, marketDataHistory, tradeHistory, mlPrediction, connectionState, updateServerSettings, sendManualTrade }
} 