import React, { useState } from 'react'

interface SmartTrailingPanelProps {
  data?: {
    // Smart Trailing Status
    smart_trailing_enabled?: boolean
    smart_trailing_active?: boolean
    current_smart_stop?: number
    active_trailing_algorithm?: string
    trailing_confidence_threshold?: number
    trailing_update_interval?: number
    max_stop_movement_atr?: number
    last_trailing_update?: number
    
    // Position Context
    position?: string
    position_size?: number
    entry_price?: number
    current_price?: number
    unrealized_pnl?: number
    
    // Technical Data
    atr?: number
    ml_confidence_level?: number
    ml_volatility_prediction?: number
    
    timestamp?: string
    
    // Take-profit data
    target_price?: number
    target1?: number
    target2?: number
  }
  isLoading?: boolean
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
)

const SmartTrailingPanel: React.FC<SmartTrailingPanelProps> = ({ data = {}, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'performance'>('status')
  
  // Extract smart trailing data
  const isEnabled = data.smart_trailing_enabled ?? true
  const isActive = data.smart_trailing_active ?? false
  const currentStop = data.current_smart_stop || 0
  const algorithm = data.active_trailing_algorithm || 'none'
  const confidenceThreshold = data.trailing_confidence_threshold || 0.6
  const updateInterval = data.trailing_update_interval || 15
  const maxMovement = data.max_stop_movement_atr || 0.5
  const lastUpdate = data.last_trailing_update || 0
  
  // Add take-profit data
  const targetPrice = data.target_price || 0
  const target1 = data.target1 || 0
  const target2 = data.target2 || 0
  
  // Determine the display target price (prefer target_price, fallback to target2 or target1)
  const displayTarget = targetPrice > 0 ? targetPrice : (target2 > 0 ? target2 : target1)
  
  // Position data
  const position = data.position || 'Flat'
  const positionSize = data.position_size || 0
  const entryPrice = data.entry_price || 0
  const currentPrice = data.current_price || 0
  const unrealizedPnL = data.unrealized_pnl || 0
  
  // Technical data
  const atr = data.atr || 0
  const mlConfidence = (data.ml_confidence_level || 0) * 100
  const volatility = data.ml_volatility_prediction || 1
  
  // Calculate smart trailing metrics
  const hasPosition = position !== 'Flat' && positionSize !== 0
  const stopDistance = hasPosition && currentStop > 0 ? Math.abs(currentPrice - currentStop) : 0
  const stopDistanceATR = atr > 0 ? stopDistance / atr : 0
  const timeSinceUpdate = lastUpdate > 0 ? lastUpdate : 0
  
  // Calculate profit protection
  const profitProtected = hasPosition && entryPrice > 0 && currentStop > 0 ? 
    (position === 'Long' ? 
      Math.max(0, currentStop - entryPrice) : 
      Math.max(0, entryPrice - currentStop)) : 0
  
  // Algorithm performance data (simulated - would come from ML server in real implementation)
  const algorithmPerformance = {
    'adaptive_atr': { winRate: 78, avgProfit: 1.2, description: 'Dynamic ATR-based trailing' },
    'ml_confidence': { winRate: 82, avgProfit: 1.4, description: 'ML confidence-driven stops' },
    'volatility_adjusted': { winRate: 75, avgProfit: 1.1, description: 'Volatility-aware trailing' },
    'support_resistance': { winRate: 85, avgProfit: 1.6, description: 'Key level-based stops' },
    'momentum_based': { winRate: 73, avgProfit: 1.3, description: 'Momentum-driven trailing' }
  }
  
  const currentAlgorithmPerf = algorithmPerformance[algorithm as keyof typeof algorithmPerformance] || 
    { winRate: 0, avgProfit: 0, description: 'No algorithm active' }

  // Get status indicator
  const getTrailingStatus = () => {
    if (!isEnabled) {
      return {
        status: 'DISABLED',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        icon: '⏸️',
        description: 'Smart trailing is disabled'
      }
    }
    
    if (!hasPosition) {
      return {
        status: 'STANDBY',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: '⏳',
        description: 'Waiting for position entry'
      }
    }
    
    if (isActive && algorithm !== 'none') {
      return {
        status: 'ACTIVE',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '🤖',
        description: `AI managing with ${algorithm.replace('_', ' ')} algorithm`
      }
    }
    
    return {
      status: 'INACTIVE',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: '⚠️',
      description: 'Position exists but smart trailing not active'
    }
  }
  
  const trailingStatus = getTrailingStatus()

  if (isLoading) {
    return (
      <div className="trading-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-green-400 text-lg">🎯</span>
          </div>
          <LoadingSkeleton className="h-6 w-40" />
        </div>
        
        <div className="space-y-4">
          <LoadingSkeleton className="h-20 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
          <LoadingSkeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="trading-card p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-green-400 text-lg">🎯</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Smart Trailing</h3>
        </div>
        
        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${trailingStatus.color} ${trailingStatus.bgColor} ${trailingStatus.borderColor}`}>
          {trailingStatus.icon} {trailingStatus.status}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
        {(['status', 'settings', 'performance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-all ${
              activeTab === tab
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Current Status */}
          <div className={`p-4 rounded-lg border ${trailingStatus.bgColor} ${trailingStatus.borderColor}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{trailingStatus.icon}</span>
              <div>
                <h4 className={`font-bold ${trailingStatus.color}`}>{trailingStatus.status}</h4>
                <p className="text-sm text-gray-400">{trailingStatus.description}</p>
              </div>
            </div>
            
            {isActive && algorithm !== 'none' && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-gray-400">Algorithm</span>
                    <div className="font-medium text-white">{algorithm.replace('_', ' ')}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-gray-400">Stop Price</span>
                    <div className="font-medium text-red-400">${currentStop.toFixed(2)}</div>
                  </div>
                  {displayTarget > 0 && (
                    <>
                      <div className="space-y-1">
                        <span className="text-gray-400">Target Price</span>
                        <div className="font-medium text-green-400">${displayTarget.toFixed(2)}</div>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="text-gray-400">Distance to Target</span>
                        <div className="font-medium">{currentPrice > 0 ? Math.abs(currentPrice - displayTarget).toFixed(2) : 'N/A'} pts</div>
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <span className="text-gray-400">Stop Distance</span>
                    <div className="font-medium">{stopDistance.toFixed(2)} pts {atr > 0 ? `(${stopDistanceATR.toFixed(2)}x ATR)` : ''}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-gray-400">Profit Protected</span>
                    <div className="font-medium text-green-400">{profitProtected.toFixed(2)} pts</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Position & Stop Details */}
          {hasPosition && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Current Stop</div>
                <div className="text-lg font-bold text-white">
                  {currentStop > 0 ? currentStop.toFixed(2) : 'Not Set'}
                </div>
                {stopDistanceATR > 0 && (
                  <div className="text-xs text-gray-500">{stopDistanceATR.toFixed(1)} ATR away</div>
                )}
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Profit Protected</div>
                <div className={`text-lg font-bold ${profitProtected > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {profitProtected > 0 ? `$${profitProtected.toFixed(2)}` : '$0.00'}
                </div>
                <div className="text-xs text-gray-500">
                  {entryPrice > 0 ? `Entry: ${entryPrice.toFixed(2)}` : 'No entry price'}
                </div>
              </div>
            </div>
          )}

          {/* Real-time Metrics */}
          {isActive && (
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-white mb-3">Real-time Metrics</h5>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="text-gray-400">Update Interval</div>
                  <div className="text-white font-bold">{updateInterval}s</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Max Movement</div>
                  <div className="text-white font-bold">{maxMovement} ATR</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Last Update</div>
                  <div className="text-white font-bold">{timeSinceUpdate.toFixed(0)}s ago</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="text-center text-gray-500 py-8">
            <span className="text-2xl mb-2 block">⚙️</span>
            <p className="mb-4">Smart Trailing Settings</p>
            <div className="space-y-3 text-left max-w-sm mx-auto">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm">Enabled</span>
                <span className={`text-sm font-bold ${isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                  {isEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm">Confidence Threshold</span>
                <span className="text-sm font-bold text-blue-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm">Update Interval</span>
                <span className="text-sm font-bold text-purple-400">{updateInterval}s</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm">Max Movement</span>
                <span className="text-sm font-bold text-orange-400">{maxMovement} ATR</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Settings are controlled via NinjaTrader strategy parameters
            </p>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {/* Current Algorithm Performance */}
          {algorithm !== 'none' && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-white mb-3">Current Algorithm: {algorithm.replace('_', ' ').toUpperCase()}</h5>
              <p className="text-xs text-gray-400 mb-3">{currentAlgorithmPerf.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Win Rate</div>
                  <div className="text-lg font-bold text-green-400">{currentAlgorithmPerf.winRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Avg Profit Factor</div>
                  <div className="text-lg font-bold text-blue-400">{currentAlgorithmPerf.avgProfit.toFixed(1)}x</div>
                </div>
              </div>
            </div>
          )}

          {/* Algorithm Comparison */}
          <div>
            <h5 className="text-sm font-medium text-white mb-3">Algorithm Performance</h5>
            <div className="space-y-2">
              {Object.entries(algorithmPerformance).map(([alg, perf]) => (
                <div key={alg} className={`p-3 rounded-lg border transition-all ${
                  alg === algorithm 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {alg.replace('_', ' ').toUpperCase()}
                      {alg === algorithm && <span className="ml-2 text-xs text-green-400">(ACTIVE)</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-400">{perf.winRate}%</span>
                      <span className="text-xs text-blue-400">{perf.avgProfit.toFixed(1)}x</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{perf.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SmartTrailingPanel 