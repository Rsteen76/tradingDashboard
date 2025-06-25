import React, { useState } from 'react'

interface MLPanelProps {
  data?: {
    ml_long_probability?: number
    ml_short_probability?: number
    ml_confidence_level?: number
    ml_volatility_prediction?: number
    ml_market_regime?: string
    ml_recommendation?: string
    overall_signal_strength?: number
    signal_probability_long?: number
    signal_probability_short?: number
    htf_bias?: string
    market_regime?: string
    volatility_state?: string
    rsi?: number
    price?: number
    ema_alignment_score?: number
    aiModels?: Array<{ model: string, weight: number }>
    adaptiveAccuracy?: number
    detectedPatterns?: string[]
    // Additional data for transparency
    bid?: number
    ask?: number
    spread?: number
    volume?: number
    atr?: number
    adx?: number
    ema_5?: number
    ema_8?: number
    ema_13?: number
    ema_21?: number
    ema_50?: number
    timestamp?: string
  }
  isLoading?: boolean
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
)

const MLPanel: React.FC<MLPanelProps> = ({ data = {}, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'signal' | 'analysis' | 'reasoning'>('signal')
  
  // Enhanced ML signal analysis with comprehensive data usage
  const mlLongProb = (data.ml_long_probability || 0) * 100
  const mlShortProb = (data.ml_short_probability || 0) * 100
  const mlConfidence = (data.ml_confidence_level || 0) * 100
  const signalStrength = data.overall_signal_strength || 0
  const recommendation = data.ml_recommendation || 'HOLD'
  
  // Market data analysis
  const currentPrice = data.price || 0
  const rsi = data.rsi || 50
  const emaAlignment = data.ema_alignment_score || 0
  const marketRegime = data.ml_market_regime || data.market_regime || 'Unknown'
  const volatilityState = data.ml_volatility_prediction || data.volatility_state || 'Unknown'
  const htfBias = data.htf_bias || 'Unknown'
  const spread = data.spread || 0
  const volume = data.volume || 0
  const atr = data.atr || 0
  const adx = data.adx || 0

  // Primary direction logic
  const primaryDirection = mlLongProb > mlShortProb + 5 ? 'LONG' : 
                          mlShortProb > mlLongProb + 5 ? 'SHORT' : 'NEUTRAL'
  const primaryProbability = Math.max(mlLongProb, mlShortProb)
  const confidenceLevel = mlConfidence > 0 ? mlConfidence : primaryProbability

  // Advanced market analysis
  const getMarketConditions = () => {
    const conditions = []
    
    // RSI Analysis
    if (rsi > 70) conditions.push({ type: 'warning', factor: 'RSI', value: rsi.toFixed(1), analysis: 'Overbought - potential reversal risk' })
    else if (rsi < 30) conditions.push({ type: 'opportunity', factor: 'RSI', value: rsi.toFixed(1), analysis: 'Oversold - potential bounce' })
    else conditions.push({ type: 'neutral', factor: 'RSI', value: rsi.toFixed(1), analysis: 'Neutral momentum' })
    
    // EMA Alignment Analysis
    if (emaAlignment > 50) conditions.push({ type: 'bullish', factor: 'EMA Alignment', value: `${emaAlignment.toFixed(1)}%`, analysis: 'Strong trend alignment' })
    else if (emaAlignment < -50) conditions.push({ type: 'bearish', factor: 'EMA Alignment', value: `${emaAlignment.toFixed(1)}%`, analysis: 'Bearish misalignment' })
    else conditions.push({ type: 'neutral', factor: 'EMA Alignment', value: `${emaAlignment.toFixed(1)}%`, analysis: 'Mixed signals' })
    
    // Volatility Analysis
    if (atr > 0) {
      const volatilityPercent = (atr / currentPrice) * 100
      if (volatilityPercent > 1.5) conditions.push({ type: 'warning', factor: 'Volatility', value: `${volatilityPercent.toFixed(2)}%`, analysis: 'High volatility - increased risk' })
      else if (volatilityPercent < 0.5) conditions.push({ type: 'info', factor: 'Volatility', value: `${volatilityPercent.toFixed(2)}%`, analysis: 'Low volatility - limited movement' })
      else conditions.push({ type: 'good', factor: 'Volatility', value: `${volatilityPercent.toFixed(2)}%`, analysis: 'Normal volatility - good trading conditions' })
    }
    
    // Spread Analysis
    if (spread > 0) {
      const spreadPercent = (spread / currentPrice) * 100
      if (spreadPercent > 0.05) conditions.push({ type: 'warning', factor: 'Spread', value: `${spread.toFixed(2)}`, analysis: 'Wide spread - higher transaction costs' })
      else conditions.push({ type: 'good', factor: 'Spread', value: `${spread.toFixed(2)}`, analysis: 'Tight spread - good liquidity' })
    }
    
    // Trend Strength Analysis
    if (adx > 0) {
      if (adx > 25) conditions.push({ type: 'info', factor: 'Trend Strength', value: adx.toFixed(1), analysis: 'Strong trend present' })
      else conditions.push({ type: 'neutral', factor: 'Trend Strength', value: adx.toFixed(1), analysis: 'Weak or ranging market' })
    }
    
    return conditions
  }

  // AI Reasoning Explanation
  const getAIReasoning = () => {
    const reasoning = []
    
    // Confidence reasoning
    if (confidenceLevel > 80) {
      reasoning.push({
        category: 'Confidence',
        explanation: 'Multiple AI models strongly agree on direction',
        impact: 'High reliability signal',
        weight: 'Strong'
      })
    } else if (confidenceLevel > 60) {
      reasoning.push({
        category: 'Confidence', 
        explanation: 'Majority of AI models agree with some uncertainty',
        impact: 'Moderate reliability signal',
        weight: 'Medium'
      })
    } else {
      reasoning.push({
        category: 'Confidence',
        explanation: 'AI models show conflicting signals',
        impact: 'Low reliability - proceed with caution',
        weight: 'Weak'
      })
    }
    
    // Market regime reasoning
    if (marketRegime === 'Trending') {
      reasoning.push({
        category: 'Market Regime',
        explanation: 'AI detects strong directional momentum',
        impact: 'Follow trend direction signals',
        weight: 'Strong'
      })
    } else if (marketRegime === 'Ranging') {
      reasoning.push({
        category: 'Market Regime',
        explanation: 'AI detects sideways price action',
        impact: 'Look for reversal signals at extremes',
        weight: 'Medium'
      })
    }
    
    // HTF Bias reasoning
    if (htfBias !== 'Unknown') {
      const alignment = (htfBias === 'Bullish' && primaryDirection === 'LONG') || 
                       (htfBias === 'Bearish' && primaryDirection === 'SHORT')
      reasoning.push({
        category: 'Higher Timeframe',
        explanation: alignment ? 'ML signal aligns with higher timeframe bias' : 'ML signal conflicts with higher timeframe bias',
        impact: alignment ? 'Increased probability of success' : 'Reduced probability of success',
        weight: alignment ? 'Strong' : 'Weak'
      })
    }
    
    // Technical indicator reasoning
    if (rsi > 70 && primaryDirection === 'SHORT') {
      reasoning.push({
        category: 'Technical Analysis',
        explanation: 'RSI overbought supports SHORT bias',
        impact: 'Technical confirmation of ML signal',
        weight: 'Medium'
      })
    } else if (rsi < 30 && primaryDirection === 'LONG') {
      reasoning.push({
        category: 'Technical Analysis',
        explanation: 'RSI oversold supports LONG bias',
        impact: 'Technical confirmation of ML signal',
        weight: 'Medium'
      })
    }
    
    return reasoning
  }

  const marketConditions = getMarketConditions()
  const aiReasoning = getAIReasoning()

  // Confidence quality assessment
  const getConfidenceQuality = (confidence: number) => {
    if (confidence >= 85) return { label: 'EXCELLENT', color: 'text-trading-green', bgColor: 'bg-trading-green/10 border-trading-green/30' }
    if (confidence >= 70) return { label: 'GOOD', color: 'text-trading-blue', bgColor: 'bg-trading-blue/10 border-trading-blue/30' }
    if (confidence >= 55) return { label: 'MODERATE', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10 border-yellow-400/30' }
    if (confidence >= 40) return { label: 'WEAK', color: 'text-orange-400', bgColor: 'bg-orange-400/10 border-orange-400/30' }
    return { label: 'POOR', color: 'text-trading-red', bgColor: 'bg-trading-red/10 border-trading-red/30' }
  }

  const confidenceQuality = getConfidenceQuality(confidenceLevel)

  if (isLoading) {
    return (
      <div className="trading-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-purple-400 text-lg">🤖</span>
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
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-purple-400 text-lg">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Intelligence Hub</h3>
            <p className="text-xs text-gray-400">Real-time market analysis & reasoning</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${confidenceQuality.bgColor} ${confidenceQuality.color}`}>
          {confidenceQuality.label}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 bg-gray-800/30 rounded-lg p-1">
        {[
          { key: 'signal', label: '🎯 Signal', desc: 'AI Prediction' },
          { key: 'analysis', label: '📊 Analysis', desc: 'Market Data' },
          { key: 'reasoning', label: '🧠 Reasoning', desc: 'AI Logic' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="text-center">
              <div>{tab.label}</div>
              <div className="text-xs opacity-70">{tab.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'signal' && (
        <div className="space-y-6">
          {/* Primary AI Signal */}
          <div className="p-5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Primary AI Signal</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  recommendation === 'BUY' ? 'bg-trading-green/20 text-trading-green' :
                  recommendation === 'SELL' ? 'bg-trading-red/20 text-trading-red' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {recommendation}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Confidence: {confidenceLevel.toFixed(1)}%</div>
                <div className={`text-xs ${confidenceQuality.color}`}>{confidenceQuality.label}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-3">
              <div className={`px-4 py-2 rounded-lg font-bold text-lg min-w-[80px] text-center ${
                primaryDirection === 'LONG' ? 'bg-trading-green/20 text-trading-green border border-trading-green/30' :
                primaryDirection === 'SHORT' ? 'bg-trading-red/20 text-trading-red border border-trading-red/30' :
                'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}>
                {primaryDirection}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Probability</span>
                  <span className="text-white font-medium">{primaryProbability.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      primaryDirection === 'LONG' ? 'bg-gradient-to-r from-trading-green/50 to-trading-green' :
                      primaryDirection === 'SHORT' ? 'bg-gradient-to-r from-trading-red/50 to-trading-red' :
                      'bg-gray-600'
                    }`}
                    style={{ width: `${Math.min(primaryProbability, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Directional Probabilities */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border transition-colors ${
              mlLongProb > mlShortProb ? 'bg-trading-green/5 border-trading-green/30' : 'bg-gray-800/50 border-gray-700/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-trading-green font-medium">LONG</span>
                  {mlLongProb > mlShortProb && (
                    <span className="text-xs bg-trading-green/20 text-trading-green px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <span className="text-sm font-medium text-trading-green">{mlLongProb.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-trading-green/50 to-trading-green transition-all duration-500"
                  style={{ width: `${Math.min(mlLongProb, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border transition-colors ${
              mlShortProb > mlLongProb ? 'bg-trading-red/5 border-trading-red/30' : 'bg-gray-800/50 border-gray-700/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-trading-red font-medium">SHORT</span>
                  {mlShortProb > mlLongProb && (
                    <span className="text-xs bg-trading-red/20 text-trading-red px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <span className="text-sm font-medium text-trading-red">{mlShortProb.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-trading-red/50 to-trading-red transition-all duration-500"
                  style={{ width: `${Math.min(mlShortProb, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <h4 className="text-white font-medium mb-3">📊 Live Market Analysis</h4>
          <div className="space-y-3">
            {marketConditions.map((condition, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    condition.type === 'bullish' ? 'bg-trading-green' :
                    condition.type === 'bearish' ? 'bg-trading-red' :
                    condition.type === 'warning' ? 'bg-orange-400' :
                    condition.type === 'opportunity' ? 'bg-trading-blue' :
                    condition.type === 'good' ? 'bg-trading-green' :
                    'bg-gray-400'
                  }`}></div>
                  <div>
                    <div className="text-sm font-medium text-white">{condition.factor}</div>
                    <div className="text-xs text-gray-400">{condition.analysis}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-300">{condition.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Real-time Market Metrics */}
          <div className="mt-6 p-4 bg-gray-800/20 rounded-lg">
            <h5 className="text-sm font-medium text-gray-300 mb-3">Real-time Metrics</h5>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price:</span>
                <span className="text-white font-mono">${currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Market Regime:</span>
                <span className="text-gray-300">{marketRegime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">HTF Bias:</span>
                <span className={`${htfBias === 'Bullish' ? 'text-trading-green' : htfBias === 'Bearish' ? 'text-trading-red' : 'text-gray-400'}`}>{htfBias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume:</span>
                <span className="text-white font-mono">{volume.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reasoning' && (
        <div className="space-y-4">
          <h4 className="text-white font-medium mb-3">🧠 AI Decision Process</h4>
          <div className="space-y-3">
            {aiReasoning.map((reason, index) => (
              <div key={index} className="p-4 bg-gray-800/30 rounded-lg border-l-4 border-purple-500/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-purple-400">{reason.category}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    reason.weight === 'Strong' ? 'bg-trading-green/20 text-trading-green' :
                    reason.weight === 'Medium' ? 'bg-yellow-400/20 text-yellow-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {reason.weight}
                  </span>
                </div>
                <div className="text-sm text-gray-300 mb-1">{reason.explanation}</div>
                <div className="text-xs text-gray-400 italic">Impact: {reason.impact}</div>
              </div>
            ))}
          </div>

          {/* AI Model Ensemble Info */}
          <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <h5 className="text-sm font-medium text-purple-400 mb-2">🔬 AI Model Ensemble</h5>
            <div className="text-xs text-gray-300 space-y-1">
              <div>• LSTM Neural Network: Time series prediction</div>
              <div>• Random Forest: Pattern classification</div>
              <div>• Gradient Boosting: Feature importance weighting</div>
              <div>• Transformer: Multi-timeframe attention</div>
            </div>
            <div className="text-xs text-gray-400 mt-2 italic">
              All models contribute to final prediction through weighted ensemble voting
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MLPanel
