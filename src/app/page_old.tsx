'use client'

import { useState, useEffect } from 'react'
import io from 'socket.io-client'
import TradingChart from '../components/TradingChart'
import MetricsPanel from '../components/MetricsPanel'
import SignalPanel from '../components/SignalPanel'
import PositionPanel from '../components/PositionPanel'
import MLPanel from '../components/MLPanel'
import ConnectionStatus from '../components/ConnectionStatus'

interface StrategyData {
  instrument: string
  price: number
  signal_strength: number
  ml_probability: number
  rsi: number
  ema_alignment: number
  pnl: number
  position: string
  position_size: number
  timestamp: string
  strategy_name?: string
  strategy_instance_id?: string
  entry_price?: number
  stop_loss?: number
  target_price?: number
  overall_signal_strength?: number
  signal_probability_long?: number
  signal_probability_short?: number
  ema_alignment_score?: number
  htf_bias?: string
  volatility_state?: string
  market_regime?: string
  bid?: number
  ask?: number
  spread?: number
  volume?: number
}

interface StrategyState {
  isActive: boolean
  startTime: string | null
  lastHeartbeat: string | null
  instruments: Record<string, any>
  positions: Record<string, any>
  dailyStats: {
    totalTrades: number
    winRate: number
    totalPnL: number
    largestWin: number
    largestLoss: number
  }
}

export default function Dashboard() {
  const [connected, setConnected] = useState(false)
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null)
  const [strategyState, setStrategyState] = useState<StrategyState | null>(null)
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [socket, setSocket] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    // Connect to our real-time server    const newSocket = io('http://localhost:8080')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('🚀 Connected to ScalperPro ML Dashboard')
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('strategy_data', (data: StrategyData) => {
      setStrategyData(data)
      setLastUpdate(new Date())
      setHistoricalData(prev => [...prev.slice(-100), data]) // Keep last 100 points
    })

    newSocket.on('strategy_state', (state: StrategyState) => {
      setStrategyState(state)
    })

    newSocket.on('trade_execution', (trade: any) => {
      console.log('🔔 Trade executed:', trade)
      // You could add toast notifications here
    })

    newSocket.on('trade_completed', (trade: any) => {
      console.log('✅ Trade completed:', trade)
      // You could add toast notifications here
    })

    return () => {
      newSocket.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-trading-dark text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-trading-green to-trading-blue bg-clip-text text-transparent">
              ScalperPro ML Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Professional Trading Strategy Monitor</p>
          </div>
          <ConnectionStatus connected={connected} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart */}
          <div className="lg:col-span-2">
            <TradingChart data={historicalData} />
          </div>

          {/* Right Column - Panels */}
          <div className="space-y-6">
            <MetricsPanel data={strategyData} />
            <SignalPanel data={strategyData} />
            <PositionPanel data={strategyData} />
            <MLPanel data={strategyData} />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="trading-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold profit-text">
              {strategyData?.pnl?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-400">Total P&L</div>
          </div>
          
          <div className="trading-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-trading-blue">
              {strategyData?.signal_strength?.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-400">Signal Strength</div>
          </div>
          
          <div className="trading-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">
              {strategyData?.ml_probability?.toFixed(1) || '0.0'}%
            </div>
            <div className="text-sm text-gray-400">ML Probability</div>
          </div>
          
          <div className="trading-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {historicalData.length}
            </div>
            <div className="text-sm text-gray-400">Data Points</div>
          </div>
        </div>
      </div>
    </div>
  )
}
