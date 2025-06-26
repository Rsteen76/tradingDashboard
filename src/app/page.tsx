'use client'

import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Zap, Brain, Target, Shield, Activity, DollarSign, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus, Settings } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'

// Inline TradeReadinessPanel component for now to ensure it works
const TradeReadinessPanel = ({ position, currentPrice, mlConfidence, signalStrength, longProb, shortProb, riskManagement, strategyStatus }) => {
  // TEMPORARILY ALWAYS SHOW - Remove this line to restore normal behavior
  // if (position !== 'Flat') {
  //   return null
  // }

  const calculateReadinessScore = () => {
    let score = 0
    if (mlConfidence >= 70) score += 30
    else if (mlConfidence >= 50) score += 15
    
    if (signalStrength >= 65) score += 30
    else if (signalStrength >= 45) score += 15
    
    if (Math.max(longProb, shortProb) >= 60) score += 20
    else if (Math.max(longProb, shortProb) >= 45) score += 10
    
    if (!riskManagement.trading_disabled) score += 20
    
    return score
  }

  const getReadinessStatus = (score) => {
    if (score >= 80) return { text: 'READY TO TRADE', color: 'text-emerald-400' }
    if (score >= 60) return { text: 'ALMOST READY', color: 'text-blue-400' }
    if (score >= 40) return { text: 'BUILDING SETUP', color: 'text-amber-400' }
    return { text: 'WAITING FOR SETUP', color: 'text-red-400' }
  }

  const readinessScore = calculateReadinessScore()
  const readinessStatus = getReadinessStatus(readinessScore)

  return (
    <div className="p-6 rounded-2xl border border-amber-500/30 backdrop-blur-xl bg-amber-500/5 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-amber-400">Trade Readiness Analysis</h3>
            <p className="text-sm text-amber-300/80">Real-time entry condition monitoring</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-400">
            {Math.max(longProb, shortProb).toFixed(0)}%
          </div>
          <div className="text-xs text-amber-300">Best Signal</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Entry Conditions */}
        <div className="space-y-4">
          <h4 className="font-semibold text-amber-300 mb-3">Entry Conditions</h4>
          
          {/* ML Confidence Check */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                mlConfidence >= 70 ? 'bg-emerald-500' : 
                mlConfidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-slate-300">ML Confidence</span>
            </div>
            <div className="text-right">
              <div className={`font-bold ${
                mlConfidence >= 70 ? 'text-emerald-400' : 
                mlConfidence >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {mlConfidence.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400">Need: 70%+</div>
            </div>
          </div>

          {/* Signal Strength Check */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                signalStrength >= 65 ? 'bg-emerald-500' : 
                signalStrength >= 45 ? 'bg-amber-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-slate-300">Signal Strength</span>
            </div>
            <div className="text-right">
              <div className={`font-bold ${
                signalStrength >= 65 ? 'text-emerald-400' : 
                signalStrength >= 45 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {signalStrength.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400">Need: 65%+</div>
            </div>
          </div>

          {/* Risk Management Check */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                !riskManagement.trading_disabled ? 'bg-emerald-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-slate-300">Risk Management</span>
            </div>
            <div className="text-right">
              <div className={`font-bold ${
                !riskManagement.trading_disabled ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {!riskManagement.trading_disabled ? 'CLEAR' : 'BLOCKED'}
              </div>
              <div className="text-xs text-slate-400">Status</div>
            </div>
          </div>
        </div>

        {/* Right Side - Entry Levels & Overall Score */}
        <div className="space-y-4">
          <h4 className="font-semibold text-amber-300 mb-3">Entry Proximity</h4>
          
          {/* Overall Readiness Score */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
            <div className="text-center">
              <div className="text-sm text-blue-300 mb-1">Overall Readiness</div>
              <div className={`text-3xl font-bold mb-2 ${readinessStatus.color}`}>
                {readinessScore}%
              </div>
              <div className={`text-xs ${readinessStatus.color}`}>
                {readinessStatus.text}
              </div>
            </div>
          </div>

          {/* Entry Levels */}
          {strategyStatus.next_long_entry_level && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-sm text-emerald-400 font-medium">Long Entry</div>
              <div className="text-lg font-bold text-emerald-400">{strategyStatus.next_long_entry_level.toFixed(2)}</div>
              <div className="text-xs text-slate-400">
                {Math.abs(currentPrice - strategyStatus.next_long_entry_level).toFixed(2)} pts away
              </div>
            </div>
          )}

          {strategyStatus.next_short_entry_level && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-sm text-red-400 font-medium">Short Entry</div>
              <div className="text-lg font-bold text-red-400">{strategyStatus.next_short_entry_level.toFixed(2)}</div>
              <div className="text-xs text-slate-400">
                {Math.abs(currentPrice - strategyStatus.next_short_entry_level).toFixed(2)} pts away
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocking Factors */}
      <div className="mt-6">
        <h4 className="font-semibold text-amber-300 mb-3">Current Blockers</h4>
        <div className="space-y-2">
          {mlConfidence < 70 && (
            <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              ML confidence too low ({mlConfidence.toFixed(0)}% &lt; 70%)
            </div>
          )}
          {signalStrength < 65 && (
            <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Signal strength insufficient ({signalStrength.toFixed(0)}% &lt; 65%)
            </div>
          )}
          {Math.max(longProb, shortProb) < 60 && (
            <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              No clear directional bias ({Math.max(longProb, shortProb).toFixed(0)}% &lt; 60%)
            </div>
          )}
          {riskManagement.trading_disabled && (
            <div className="flex items-center gap-3 p-2 rounded bg-red-500/10 text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Risk management has disabled trading
            </div>
          )}
          
          {/* Show success message if ready */}
          {readinessScore >= 80 && (
            <div className="flex items-center gap-3 p-2 rounded bg-emerald-500/10 text-emerald-300 text-sm">
              <Target className="w-4 h-4" />
              All entry conditions satisfied - ready for trade signal
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TradingDashboard = () => {
  const { strategyData, marketDataHistory, tradeHistory, mlPrediction, connectionState, updateServerSettings, sendManualTrade } = useSocket()
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m')
  const [showSettings, setShowSettings] = useState(false)

  // Extract data with fallbacks
  const marketData = strategyData.marketData || {}
  const strategyStatus = strategyData.strategyStatus || {}
  const riskManagement = strategyData.riskManagement || {}
  const lastTrade = strategyData.lastTrade || {}

  // Derived values with better fallbacks
  const position = strategyStatus.position || 'Flat'
  const positionSize = strategyStatus.position_size || 0
  const pnl = strategyStatus.unrealized_pnl || 0
  const currentPrice = marketData.price || strategyStatus.current_price || 0
  const signalStrength = strategyStatus.overall_signal_strength || strategyStatus.signal_strength || 0
  const longProb = strategyStatus.signal_probability_long || 0
  const shortProb = strategyStatus.signal_probability_short || 0
  
  // ML Confidence with multiple fallbacks and proper normalization
  let mlConfidence = strategyStatus.ml_confidence_level || strategyStatus.ml_confidence || mlPrediction?.confidence || 0.5
  // If it's already a percentage (>1), keep as is, otherwise convert to percentage
  if (mlConfidence <= 1) {
    mlConfidence = mlConfidence * 100
  }
  
  const instrument = marketData.instrument || strategyStatus.instrument || 'ES'

  // Dynamic colors and status
  const getPositionColor = () => {
    if (position.toLowerCase().includes('long')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (position.toLowerCase().includes('short')) return 'text-red-400 bg-red-500/10 border-red-500/30'
    return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  }

  const getPnLColor = () => pnl >= 0 ? 'text-emerald-400' : 'text-red-400'

  const getSignalDirection = () => {
    if (longProb > shortProb && longProb > 60) return 'LONG'
    if (shortProb > longProb && shortProb > 60) return 'SHORT'
    return 'NEUTRAL'
  }

  const formatCurrency = (val) => {
    const formatted = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return val >= 0 ? `+$${formatted}` : `-$${formatted}`
  }

  // Show loading state if no data yet
  if (!currentPrice && !marketData.price) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connecting to Trading Server</h2>
          <p className="text-slate-400">
            {connectionState.isConnected ? 'Loading market data...' : 'Establishing connection...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 animate-pulse"></div>
      
      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 backdrop-blur-xl bg-slate-950/80">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                  AI Trading Command Center
                </h1>
                <p className="text-slate-400 text-sm">Powered by Neural Networks & Deep Learning</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              connectionState.isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionState.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className={`text-sm font-medium ${
                connectionState.isConnected ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {connectionState.isConnected ? 'LIVE' : 'DISCONNECTED'}
              </span>
              {connectionState.latency > 0 && (
                <span className="text-xs text-slate-400">
                  {connectionState.latency}ms
                </span>
              )}
            </div>
            
            {/* Controls */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-5 gap-6">
          {/* Current Position */}
          <div className={`p-6 rounded-2xl border backdrop-blur-xl ${getPositionColor()}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {position.toLowerCase().includes('long') && <ArrowUpRight className="w-5 h-5" />}
                {position.toLowerCase().includes('short') && <ArrowDownRight className="w-5 h-5" />}
                {position === 'Flat' && <Minus className="w-5 h-5" />}
                <span className="text-sm font-medium opacity-80">POSITION</span>
              </div>
              <div className="text-xs opacity-60">{positionSize} contracts</div>
            </div>
            <div className="text-2xl font-bold">{position.toUpperCase()}</div>
            <div className="text-sm opacity-60 mt-1">Entry: {strategyStatus.entry_price?.toFixed(2) || '--'}</div>
          </div>

          {/* Current P&L */}
          <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-400">UNREALIZED P&L</span>
            </div>
            <div className={`text-3xl font-bold ${getPnLColor()}`}>
              {formatCurrency(pnl)}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {pnl >= 0 ? '+' : ''}{((pnl / 100000) * 100).toFixed(2)}%
            </div>
          </div>

          {/* Current Price */}
          <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-slate-400">{instrument.toUpperCase()} PRICE</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {currentPrice.toFixed(2)}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Vol: {marketData.volume ? (marketData.volume / 1000000).toFixed(1) + 'M' : '--'}
            </div>
          </div>

          {/* ML Confidence */}
          <div className="p-6 rounded-2xl border border-purple-500/30 backdrop-blur-xl bg-purple-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">ML CONFIDENCE</span>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {mlConfidence.toFixed(0)}%
            </div>
            <div className="text-sm text-purple-300 mt-1">Neural Network</div>
          </div>

          {/* Signal Strength */}
          <div className="p-6 rounded-2xl border border-orange-500/30 backdrop-blur-xl bg-orange-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-300">SIGNAL POWER</span>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {signalStrength.toFixed(0)}%
            </div>
            <div className="text-sm text-orange-300 mt-1">Multi-Factor</div>
          </div>
        </div>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-3 gap-6">
          {/* AI Signal Analysis */}
          <div className="col-span-2 space-y-6 relative z-10">
            {/* Trade Readiness Panel */}
            <TradeReadinessPanel
              position={position}
              currentPrice={currentPrice}
              mlConfidence={mlConfidence}
              signalStrength={signalStrength}
              longProb={longProb}
              shortProb={shortProb}
              riskManagement={riskManagement}
              strategyStatus={strategyStatus}
            />

            {/* Signal Direction */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">AI Signal Analysis</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-emerald-400">Live Analysis</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Long Signal */}
                <div className={`p-4 rounded-xl border transition-all duration-500 ${
                  longProb > shortProb ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700/50 bg-slate-800/30'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-400">LONG SIGNAL</div>
                      <div className="text-xs text-slate-400">Buy Pressure</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Probability</span>
                      <span className="text-emerald-400 font-bold">{longProb.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${longProb}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400">Entry: {strategyStatus.next_long_entry_level?.toFixed(2) || '--'}</div>
                  </div>
                </div>

                {/* Short Signal */}
                <div className={`p-4 rounded-xl border transition-all duration-500 ${
                  shortProb > longProb ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700/50 bg-slate-800/30'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="font-bold text-red-400">SHORT SIGNAL</div>
                      <div className="text-xs text-slate-400">Sell Pressure</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Probability</span>
                      <span className="text-red-400 font-bold">{shortProb.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000"
                        style={{ width: `${shortProb}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400">Entry: {strategyStatus.next_short_entry_level?.toFixed(2) || '--'}</div>
                  </div>
                </div>
              </div>

              {/* Current Recommendation */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-blue-400" />
                  <div>
                    <div className="font-bold text-blue-400">AI RECOMMENDATION</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {getSignalDirection()}
                      {getSignalDirection() !== 'NEUTRAL' && (
                        <span className="text-sm ml-2 text-slate-400">
                          @ {getSignalDirection() === 'LONG' ? 
                            (strategyStatus.next_long_entry_level?.toFixed(2) || '--') : 
                            (strategyStatus.next_short_entry_level?.toFixed(2) || '--')
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Indicators */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
              <h3 className="text-xl font-bold mb-6">Technical Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-2">RSI (14)</div>
                  <div className="text-2xl font-bold text-white">{(marketData.rsi || strategyStatus.rsi_current || 50).toFixed(1)}</div>
                  <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                    <div 
                      className={`h-1 rounded-full transition-all duration-1000 ${
                        (marketData.rsi || strategyStatus.rsi_current || 50) > 70 ? 'bg-red-500' : 
                        (marketData.rsi || strategyStatus.rsi_current || 50) < 30 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${marketData.rsi || strategyStatus.rsi_current || 50}%` }}
                    ></div>
                  </div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-2">ATR</div>
                  <div className="text-2xl font-bold text-white">{(marketData.atr || 15).toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-1">Volatility</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-2">Volume</div>
                  <div className="text-2xl font-bold text-white">
                    {marketData.volume ? (marketData.volume / 1000000).toFixed(1) + 'M' : '--'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Contracts</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Risk Management */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30 h-[280px] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Risk Management</h3>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Daily P&L</span>
                    <span className={(riskManagement.daily_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatCurrency(riskManagement.daily_loss || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${(riskManagement.daily_loss || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(Math.abs(riskManagement.daily_loss || 0) / (riskManagement.max_daily_loss || 5000) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Max Loss: ${(riskManagement.max_daily_loss || 5000).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Consecutive Losses</span>
                    <span className="text-orange-400">
                      {riskManagement.consecutive_losses || 0} / {riskManagement.max_consecutive_losses || 5}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-orange-500 rounded-full"
                      style={{ 
                        width: `${((riskManagement.consecutive_losses || 0) / (riskManagement.max_consecutive_losses || 5)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                riskManagement.trading_disabled 
                  ? 'bg-red-500/10 border border-red-500/30' 
                  : 'bg-emerald-500/10 border border-emerald-500/30'
              }`}>
                {riskManagement.trading_disabled ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-medium">Trading Halted</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Trading Active</span>
                  </>
                )}
              </div>
            </div>

            {/* Smart Trailing */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30 h-[200px] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold">Smart Trailing</h3>
              </div>
              
              <div className={`p-3 rounded-lg flex items-center gap-2 mb-4 ${
                strategyStatus.smart_trailing_active 
                  ? 'bg-purple-500/10 border border-purple-500/30' 
                  : 'bg-slate-800/50 border border-slate-700/50'
              }`}>
                {strategyStatus.smart_trailing_active ? (
                  <>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-purple-400 font-medium">AI Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <span className="text-slate-400 font-medium">Inactive</span>
                  </>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current Stop</span>
                  <span className="text-white font-mono">
                    {strategyStatus.smart_trailing_active ? (strategyStatus.current_smart_stop?.toFixed(2) || '--') : '--'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Algorithm</span>
                  <span className="text-purple-400">
                    {strategyStatus.smart_trailing_active ? (strategyStatus.active_trailing_algorithm || 'Neural') : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Protection</span>
                  <span className="text-emerald-400">
                    {strategyStatus.smart_trailing_active && strategyStatus.entry_price && strategyStatus.current_smart_stop ? 
                      formatCurrency(Math.abs(strategyStatus.current_smart_stop - strategyStatus.entry_price) * (positionSize || 1) * 50) : 
                      '$0.00'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30 h-[200px] flex flex-col">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="flex-1 flex flex-col space-y-3">
                <button 
                  onClick={() => sendManualTrade({ command: 'go_long', quantity: 1 })}
                  className="flex-1 p-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors"
                >
                  Execute Long
                </button>
                <button 
                  onClick={() => sendManualTrade({ command: 'go_short', quantity: 1 })}
                  className="flex-1 p-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                >
                  Execute Short
                </button>
                <button 
                  onClick={() => sendManualTrade({ command: 'close_position' })}
                  className="flex-1 p-3 bg-slate-600 hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Close Position
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">
                Last Update: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">System Online</span>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            Neural Network v4.2.1 | Latency: {connectionState.latency || 0}ms
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradingDashboard