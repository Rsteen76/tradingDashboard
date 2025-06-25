import React from 'react'

interface SignalPanelProps {
  data?: {
    overall_signal_strength?: number
    signal_probability_long?: number
    signal_probability_short?: number
    rsi?: number
    ema_alignment_score?: number
    htf_bias?: string
    volatility_state?: string
    market_regime?: string
    price?: number
    target_price?: number
    stop_loss?: number
    entry_price?: number
    position?: string
  }
  isLoading?: boolean
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
)

const SignalPanel: React.FC<SignalPanelProps> = ({ data = {}, isLoading = false }) => {
  const signalStrength = data.overall_signal_strength || 0
  const longProb = data.signal_probability_long || 0
  const shortProb = data.signal_probability_short || 0
  const rsi = data.rsi || 50
  const emaAlignment = data.ema_alignment_score || 0
  const htfBias = data.htf_bias || 'Unknown'
  const volatility = data.volatility_state || 'Unknown'
  const marketRegime = data.market_regime || 'Unknown'
  
  // Signal quality assessment
  const getSignalQuality = (strength: number) => {
    if (strength >= 80) return { label: 'EXCELLENT', color: 'text-trading-green', bgColor: 'bg-trading-green/10', borderColor: 'border-trading-green/30' }
    if (strength >= 65) return { label: 'GOOD', color: 'text-trading-blue', bgColor: 'bg-trading-blue/10', borderColor: 'border-trading-blue/30' }
    if (strength >= 50) return { label: 'FAIR', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/30' }
    if (strength >= 35) return { label: 'WEAK', color: 'text-orange-400', bgColor: 'bg-orange-400/10', borderColor: 'border-orange-400/30' }
    return { label: 'POOR', color: 'text-trading-red', bgColor: 'bg-trading-red/10', borderColor: 'border-trading-red/30' }
  }
  
  const signalQuality = getSignalQuality(signalStrength)
  
  // Primary direction
  const primaryDirection = longProb > shortProb ? 'LONG' : shortProb > longProb ? 'SHORT' : 'NEUTRAL'
  const primaryProbability = Math.max(longProb, shortProb)
  
  // RSI analysis
  const getRSIAnalysis = (rsiValue: number) => {
    if (rsiValue >= 70) return { zone: 'Overbought', color: 'text-trading-red', signal: 'Bearish' }
    if (rsiValue <= 30) return { zone: 'Oversold', color: 'text-trading-green', signal: 'Bullish' }
    if (rsiValue > 50) return { zone: 'Bullish', color: 'text-trading-green', signal: 'Bullish' }
    return { zone: 'Bearish', color: 'text-trading-red', signal: 'Bearish' }
  }
  
  const rsiAnalysis = getRSIAnalysis(rsi)
  
  // EMA trend analysis
  const getEMATrend = (score: number) => {
    if (score >= 75) return { trend: 'Strong Bullish', color: 'text-trading-green' }
    if (score >= 25) return { trend: 'Bullish', color: 'text-trading-green' }
    if (score >= -25) return { trend: 'Sideways', color: 'text-yellow-400' }
    if (score >= -75) return { trend: 'Bearish', color: 'text-trading-red' }
    return { trend: 'Strong Bearish', color: 'text-trading-red' }
  }
  
  const emaTrend = getEMATrend(emaAlignment)

  if (isLoading) {
    return (
      <div className="trading-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <span className="text-blue-400 text-lg">📊</span>
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
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <span className="text-blue-400 text-lg">📊</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Signal Analysis</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${signalQuality.color} ${signalQuality.bgColor} ${signalQuality.borderColor}`}>
          {signalQuality.label}
        </div>
      </div>

      {/* Overall Signal Strength */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Overall Signal Strength</span>
          <span className="text-xs text-gray-500">{signalStrength.toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              signalStrength >= 80 ? 'bg-gradient-to-r from-trading-green/50 to-trading-green' :
              signalStrength >= 65 ? 'bg-gradient-to-r from-trading-blue/50 to-trading-blue' :
              signalStrength >= 50 ? 'bg-gradient-to-r from-yellow-400/50 to-yellow-400' :
              signalStrength >= 35 ? 'bg-gradient-to-r from-orange-400/50 to-orange-400' :
              'bg-gradient-to-r from-trading-red/50 to-trading-red'
            }`}
            style={{ width: `${signalStrength}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Weak</span>
          <span className="text-gray-500">Strong</span>
        </div>
      </div>

      {/* Directional Signals */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Directional Signals</h4>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Long Signal */}
          <div className={`p-3 rounded-lg border transition-all duration-200 ${
            primaryDirection === 'LONG' 
              ? 'bg-trading-green/10 border-trading-green/30' 
              : 'bg-gray-800/50 border-gray-700/50'
          }`}>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">LONG</div>
              <div className={`text-lg font-bold ${
                primaryDirection === 'LONG' ? 'text-trading-green' : 'text-gray-400'
              }`}>
                {longProb.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                <div 
                  className="h-1.5 rounded-full bg-trading-green transition-all duration-500"
                  style={{ width: `${longProb}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Short Signal */}
          <div className={`p-3 rounded-lg border transition-all duration-200 ${
            primaryDirection === 'SHORT' 
              ? 'bg-trading-red/10 border-trading-red/30' 
              : 'bg-gray-800/50 border-gray-700/50'
          }`}>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">SHORT</div>
              <div className={`text-lg font-bold ${
                primaryDirection === 'SHORT' ? 'text-trading-red' : 'text-gray-400'
              }`}>
                {shortProb.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                <div 
                  className="h-1.5 rounded-full bg-trading-red transition-all duration-500"
                  style={{ width: `${shortProb}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Technical Indicators</h4>
        
        <div className="space-y-3">
          {/* RSI */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">RSI</span>
              <span className={`text-sm font-medium ${rsiAnalysis.color}`}>
                {rsiAnalysis.zone}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{rsi.toFixed(1)}</div>
              <div className="text-xs text-gray-500">{rsiAnalysis.signal}</div>
            </div>
          </div>

          {/* EMA Alignment */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">EMA Trend</span>
              <span className={`text-sm font-medium ${emaTrend.color}`}>
                {emaTrend.trend}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{emaAlignment.toFixed(1)}</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Context Summary */}
      <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Market Context</h4>
        
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <div className="text-gray-500 mb-1">HTF Bias</div>
            <div className={`font-medium ${
              htfBias === 'Bullish' ? 'text-trading-green' : 
              htfBias === 'Bearish' ? 'text-trading-red' : 'text-gray-400'
            }`}>
              {htfBias}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-500 mb-1">Volatility</div>
            <div className="font-medium text-purple-400">{volatility}</div>
          </div>
          
          <div className="text-center">
            <div className="text-gray-500 mb-1">Regime</div>
            <div className="font-medium text-trading-blue">{marketRegime}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignalPanel
