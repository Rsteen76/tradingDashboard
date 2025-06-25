import React from 'react'

interface UpcomingTradesPanelProps {
  data?: {
    price?: number
    next_long_entry_level?: number
    next_short_entry_level?: number
    long_entry_quality?: number
    short_entry_quality?: number
    ml_trade_recommendation?: string
    recommended_position_size?: number
    ml_long_probability?: number
    ml_short_probability?: number
    ml_confidence_level?: number
    ml_mode?: string
    data_source?: string
    
    // AI Intelligence Data
    ai_reasoning?: {
      long_entry_reasoning?: string
      short_entry_reasoning?: string
      market_pattern?: string
      pattern_strength?: number
      liquidity_analysis?: string
      volatility_profile?: string
    }
    
    // Enhanced ML data
    rsi?: number
    emaAlignment?: number
    atr?: number
  }
  isLoading?: boolean
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
)

const UpcomingTradesPanel: React.FC<UpcomingTradesPanelProps> = ({ data = {}, isLoading = false }) => {
  const currentPrice = data.price || 0
  const longEntryLevel = data.next_long_entry_level || 0
  const shortEntryLevel = data.next_short_entry_level || 0
  const longQuality = data.long_entry_quality || 0
  const shortQuality = data.short_entry_quality || 0
  const recommendation = data.ml_trade_recommendation || 'HOLD'
  const recommendedSize = data.recommended_position_size || 1
  const mlMode = data.ml_mode || 'unknown'
  const dataSource = data.data_source || 'unknown'
  const aiReasoning = data.ai_reasoning || {}
  
  // Calculate distances from current price
  const longDistance = longEntryLevel > 0 ? Math.abs(currentPrice - longEntryLevel) : 0
  const shortDistance = shortEntryLevel > 0 ? Math.abs(currentPrice - shortEntryLevel) : 0
  
  // Get contract specifications for dollar calculations (default to ES if not provided)
  const contractSpecs = {
    tickSize: 0.25,
    tickValue: 12.5,
    pointValue: 50,
    displayName: 'ES'
  }
  
  // Market intelligence data
  const marketPattern = aiReasoning.market_pattern || 'ANALYZING'
  const patternStrength = aiReasoning.pattern_strength || 0
  const rsi = data.rsi || 50
  const emaAlignment = data.emaAlignment || 0
  
  // Quality assessment
  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-trading-green'
    if (quality >= 65) return 'text-trading-blue'
    if (quality >= 50) return 'text-yellow-400'
    if (quality >= 35) return 'text-orange-400'
    return 'text-trading-red'
  }
  
  const getQualityLabel = (quality: number) => {
    if (quality >= 80) return 'EXCELLENT'
    if (quality >= 65) return 'GOOD'
    if (quality >= 50) return 'FAIR'
    if (quality >= 35) return 'POOR'
    return 'VERY POOR'
  }
  
  const getRecommendationColor = (rec: string) => {
    if (rec.includes('STRONG_LONG')) return 'text-trading-green'
    if (rec.includes('STRONG_SHORT')) return 'text-trading-red'
    if (rec === 'LONG') return 'text-trading-green'
    if (rec === 'SHORT') return 'text-trading-red'
    return 'text-gray-400'
  }

  if (isLoading) {
    return (
      <div className="trading-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-purple-400 text-lg">🎯</span>
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
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-purple-400 text-lg">🎯</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Upcoming Trades</h3>
            <p className="text-xs text-gray-400">ML-powered entry predictions</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs px-2 py-1 rounded ${
            mlMode === 'enhanced' ? 'bg-green-500/20 text-green-400' :
            mlMode === 'autonomous' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {mlMode === 'enhanced' ? 'NT + ML' : 
             mlMode === 'autonomous' ? 'ML Only' : 'Unknown'}
          </div>
        </div>
      </div>

      {/* AI Recommendation & Market Intelligence */}
      <div className="mb-6 space-y-4">
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">ML Recommendation</span>
            <span className="text-xs text-gray-500">Size: {recommendedSize}</span>
          </div>
          <div className={`text-lg font-bold ${getRecommendationColor(recommendation)}`}>
            {recommendation.replace('_', ' ')}
          </div>
        </div>
        
        {/* Market Pattern Analysis */}
        <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">AI Market Pattern</span>
            <span className="text-xs text-purple-400">{(patternStrength * 100).toFixed(0)}% confidence</span>
          </div>
          <div className="text-sm font-medium text-white">
            {marketPattern.replace(/_/g, ' ')}
          </div>
          
          {/* Market metrics */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">RSI</span>
              <span className={rsi < 30 ? 'text-trading-green' : rsi > 70 ? 'text-trading-red' : 'text-gray-300'}>
                {rsi.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">EMA</span>
              <span className={emaAlignment > 20 ? 'text-trading-green' : emaAlignment < -20 ? 'text-trading-red' : 'text-gray-300'}>
                {emaAlignment > 0 ? '+' : ''}{emaAlignment.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Levels */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Smart Entry Levels</h4>
        
        {/* Long Entry */}
        <div className={`p-4 rounded-lg border transition-colors ${
          longQuality > shortQuality ? 'bg-trading-green/5 border-trading-green/30' : 'bg-gray-800/50 border-gray-700/50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-trading-green">LONG ENTRY</span>
              {longQuality > shortQuality && (
                <span className="text-xs bg-trading-green/20 text-trading-green px-1.5 py-0.5 rounded">Best</span>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {longEntryLevel > 0 ? longEntryLevel.toFixed(2) : 'No Level'}
              </div>
              {longEntryLevel > 0 && (
                <div className="text-xs text-gray-400">
                  {longDistance.toFixed(2)} pts (${(longDistance * contractSpecs.pointValue).toFixed(0)})
                </div>
              )}
            </div>
          </div>
          
          {longEntryLevel > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entry Quality</span>
                <span className={`font-medium ${getQualityColor(longQuality)}`}>
                  {longQuality}% ({getQualityLabel(longQuality)})
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-trading-green/50 to-trading-green transition-all duration-500"
                  style={{ width: `${Math.min(longQuality, 100)}%` }}
                ></div>
              </div>
              
              {/* AI Reasoning for Long Entry */}
              {aiReasoning.long_entry_reasoning && (
                <div className="mt-2 p-2 bg-trading-green/5 border border-trading-green/20 rounded text-xs">
                  <span className="text-gray-400">AI Reasoning: </span>
                  <span className="text-trading-green">{aiReasoning.long_entry_reasoning}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Short Entry */}
        <div className={`p-4 rounded-lg border transition-colors ${
          shortQuality > longQuality ? 'bg-trading-red/5 border-trading-red/30' : 'bg-gray-800/50 border-gray-700/50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-trading-red">SHORT ENTRY</span>
              {shortQuality > longQuality && (
                <span className="text-xs bg-trading-red/20 text-trading-red px-1.5 py-0.5 rounded">Best</span>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {shortEntryLevel > 0 ? shortEntryLevel.toFixed(2) : 'No Level'}
              </div>
              {shortEntryLevel > 0 && (
                <div className="text-xs text-gray-400">
                  {shortDistance.toFixed(2)} pts (${(shortDistance * contractSpecs.pointValue).toFixed(0)})
                </div>
              )}
            </div>
          </div>
          
          {shortEntryLevel > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entry Quality</span>
                <span className={`font-medium ${getQualityColor(shortQuality)}`}>
                  {shortQuality}% ({getQualityLabel(shortQuality)})
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-trading-red/50 to-trading-red transition-all duration-500"
                  style={{ width: `${Math.min(shortQuality, 100)}%` }}
                ></div>
              </div>
              
              {/* AI Reasoning for Short Entry */}
              {aiReasoning.short_entry_reasoning && (
                <div className="mt-2 p-2 bg-trading-red/5 border border-trading-red/20 rounded text-xs">
                  <span className="text-gray-400">AI Reasoning: </span>
                  <span className="text-trading-red">{aiReasoning.short_entry_reasoning}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Source: {dataSource === 'ml_intelligence_engine' ? 'ML Engine' : 
                    dataSource === 'ninjatrader_strategy' ? 'NinjaTrader + ML' : 'Unknown'}
          </span>
          <span>
            {longEntryLevel === 0 && shortEntryLevel === 0 ? 'No Entry Levels Set' : 'Levels Active'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default UpcomingTradesPanel 