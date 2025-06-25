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
    // Connect to our real-time server
    const newSocket = io('http://localhost:8080')
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

  // Helper function to format uptime
  const formatUptime = () => {
    if (!strategyState?.startTime) return '00:00:00'
    
    const start = new Date(strategyState.startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Helper function to get position color
  const getPositionColor = () => {
    if (!strategyData?.position) return 'text-gray-400'
    
    const pos = strategyData.position.toLowerCase()
    if (pos.includes('long')) return 'text-green-400'
    if (pos.includes('short')) return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <div className="min-h-screen bg-trading-dark text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-trading-green to-trading-blue bg-clip-text text-transparent">
              ScalperPro ML Dashboard
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-gray-400">Professional Trading Strategy Monitor</p>
              {strategyData?.instrument && (
                <span className="px-3 py-1 bg-blue-600/20 rounded-full text-blue-300 text-sm font-medium">
                  {strategyData.instrument}
                </span>
              )}
              {strategyState?.isActive && (
                <span className="px-3 py-1 bg-green-600/20 rounded-full text-green-300 text-sm font-medium">
                  Uptime: {formatUptime()}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <ConnectionStatus connected={connected} />
            {lastUpdate && (
              <div className="text-xs text-gray-400 mt-1">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Strategy Status Alert */}
        {strategyData && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Position:</span>
                  <span className={`font-bold ${getPositionColor()}`}>
                    {strategyData.position || 'FLAT'}
                    {strategyData.position_size && strategyData.position_size > 0 && (
                      <span className="ml-1 text-sm">({strategyData.position_size})</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Price:</span>
                  <span className="font-bold text-white">
                    ${strategyData.price?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">P&L:</span>
                  <span className={`font-bold ${strategyData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${strategyData.pnl?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {strategyData.bid && strategyData.ask && (
                  <div className="text-gray-400">
                    Bid/Ask: {strategyData.bid?.toFixed(2)}/{strategyData.ask?.toFixed(2)}
                    <span className="ml-2 text-xs">
                      Spread: {strategyData.spread?.toFixed(3)}
                    </span>
                  </div>
                )}
                {strategyData.htf_bias && (
                  <div className="text-gray-400">
                    Bias: <span className={strategyData.htf_bias === 'Bullish' ? 'text-green-400' : 'text-red-400'}>
                      {strategyData.htf_bias}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        {/* Enhanced Footer Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="trading-card p-4 rounded-lg text-center">
            <div className={`text-2xl font-bold ${strategyData?.pnl >= 0 ? 'profit-text' : 'text-red-400'}`}>
              {strategyData?.pnl?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-gray-400">Current P&L</div>
          </div>
          
          <div className="trading-card p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-trading-blue">
              {strategyData?.overall_signal_strength?.toFixed(1) || strategyData?.signal_strength?.toFixed(1) || '0.0'}%
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

          {/* Additional stats from strategy state */}
          {strategyState && (
            <>
              <div className="trading-card p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {strategyState.dailyStats.totalTrades}
                </div>
                <div className="text-sm text-gray-400">Total Trades</div>
              </div>
              
              <div className="trading-card p-4 rounded-lg text-center">
                <div className={`text-2xl font-bold ${strategyState.dailyStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {strategyState.dailyStats.totalPnL?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-gray-400">Daily P&L</div>
              </div>
            </>
          )}
        </div>

        {/* Strategy Details */}
        {strategyData && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="trading-card p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-trading-green">📊 Market Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">RSI:</span>
                  <span className={`font-medium ${strategyData.rsi > 70 ? 'text-red-400' : strategyData.rsi < 30 ? 'text-green-400' : 'text-white'}`}>
                    {strategyData.rsi?.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">EMA Alignment:</span>
                  <span className={`font-medium ${strategyData.ema_alignment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {strategyData.ema_alignment?.toFixed(1)}°
                  </span>
                </div>
                {strategyData.volatility_state && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volatility:</span>
                    <span className="font-medium text-white">{strategyData.volatility_state}</span>
                  </div>
                )}
                {strategyData.market_regime && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Regime:</span>
                    <span className="font-medium text-white">{strategyData.market_regime}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="trading-card p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-trading-blue">🎯 Signal Probabilities</h3>
              <div className="space-y-3">
                {strategyData.signal_probability_long !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Long Probability:</span>
                    <span className="font-medium text-green-400">
                      {strategyData.signal_probability_long?.toFixed(1)}%
                    </span>
                  </div>
                )}
                {strategyData.signal_probability_short !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Short Probability:</span>
                    <span className="font-medium text-red-400">
                      {strategyData.signal_probability_short?.toFixed(1)}%
                    </span>
                  </div>
                )}
                {strategyData.ema_alignment_score !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">EMA Score:</span>
                    <span className="font-medium text-white">
                      {strategyData.ema_alignment_score?.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="trading-card p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-purple-400">🤖 Strategy Info</h3>
              <div className="space-y-3">
                {strategyData.strategy_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Strategy:</span>
                    <span className="font-medium text-white text-sm">{strategyData.strategy_name}</span>
                  </div>
                )}
                {strategyData.strategy_instance_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Instance:</span>
                    <span className="font-medium text-white text-xs">{strategyData.strategy_instance_id.slice(-8)}</span>
                  </div>
                )}
                {strategyData.timestamp && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Update:</span>
                    <span className="font-medium text-white text-xs">
                      {new Date(strategyData.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
