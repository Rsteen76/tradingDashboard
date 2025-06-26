import React, { useState } from 'react'

interface AIIntelligencePanelProps {
  data?: {
    // ML Model Predictions
    ml_long_probability?: number
    ml_short_probability?: number
    ml_confidence_level?: number
    ml_market_regime?: string
    ml_volatility_prediction?: number
    
    // Smart Trailing Status
    smart_trailing_enabled?: boolean
    smart_trailing_active?: boolean
    current_smart_stop?: number
    active_trailing_algorithm?: string
    trailing_confidence_threshold?: number
    
    // Technical Context
    price?: number
    rsi?: number
    ema_alignment_score?: number
    overall_signal_strength?: number
    htf_bias?: string
    position?: string
    position_size?: number
    
    // Risk Management
    trading_disabled?: boolean
    consecutive_losses?: number
    daily_loss?: number
    
    timestamp?: string
  }
  isLoading?: boolean
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
)

const AIIntelligencePanel: React.FC<AIIntelligencePanelProps> = ({ data = {}, isLoading = false }) => {
  const [activeView, setActiveView] = useState<'recommendation' | 'analysis' | 'risk'>('recommendation')
  
  // Extract and process AI data
  const mlLongProb = (data.ml_long_probability || 0) * 100
  const mlShortProb = (data.ml_short_probability || 0) * 100
  const mlConfidence = (data.ml_confidence_level || 0) * 100
  const signalStrength = data.overall_signal_strength || 0
  const currentPrice = data.price || 0
  const position = data.position || 'Flat'
  const positionSize = data.position_size || 0
  
  // Generate AI-powered trading recommendation
  const generateTradingRecommendation = () => {
    const isFlat = position === 'Flat' || positionSize === 0
    const hasStrongSignal = Math.max(mlLongProb, mlShortProb) > 70 && mlConfidence > 65
    const hasPosition = !isFlat
    
    // Circuit breaker check
    if (data.trading_disabled) {
      return {
        action: 'TRADING HALTED',
        reason: 'Circuit breaker active - risk limits exceeded',
        confidence: 0,
        priority: 'critical',
        icon: '🚨',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30'
      }
    }
    
    // Position management recommendations
    if (hasPosition) {
      const smartTrailingActive = data.smart_trailing_active
      const currentStop = data.current_smart_stop || 0
      const algorithm = data.active_trailing_algorithm || 'none'
      
      if (smartTrailingActive && algorithm !== 'none') {
        return {
          action: 'SMART TRAILING ACTIVE',
          reason: `AI managing ${position} position with ${algorithm} algorithm`,
          confidence: mlConfidence,
          priority: 'good',
          icon: '🤖',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          details: `Stop: ${currentStop.toFixed(2)}`
        }
      } else {
        return {
          action: 'MONITOR POSITION',
          reason: `Hold ${position} position - AI monitoring for exit signals`,
          confidence: mlConfidence,
          priority: 'info',
          icon: '👁️',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30'
        }
      }
    }
    
    // Entry signal recommendations
    if (hasStrongSignal) {
      const direction = mlLongProb > mlShortProb ? 'LONG' : 'SHORT'
      const probability = Math.max(mlLongProb, mlShortProb)
      
      return {
        action: `CONSIDER ${direction} ENTRY`,
        reason: `AI models show ${probability.toFixed(1)}% probability for ${direction}`,
        confidence: mlConfidence,
        priority: 'opportunity',
        icon: direction === 'LONG' ? '🟢' : '🔴',
        color: direction === 'LONG' ? 'text-green-400' : 'text-red-400',
        bgColor: direction === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10',
        borderColor: direction === 'LONG' ? 'border-green-500/30' : 'border-red-500/30'
      }
    }
    
    // Default - wait for better setup
    return {
      action: 'WAIT FOR SETUP',
      reason: 'AI models show mixed signals - waiting for clearer opportunity',
      confidence: mlConfidence,
      priority: 'neutral',
      icon: '⏳',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30'
    }
  }
  
  // Generate market intelligence summary
  const generateMarketIntelligence = () => {
    const intelligence = []
    
    // Market regime analysis
    const regime = data.ml_market_regime || 'Unknown'
    if (regime !== 'Unknown') {
      intelligence.push({
        category: 'Market Regime',
        insight: `AI detects ${regime.toLowerCase()} market conditions`,
        impact: regime === 'Trending' ? 'Follow momentum signals' : 'Look for reversal setups',
        confidence: mlConfidence,
        icon: regime === 'Trending' ? '📈' : '🔄'
      })
    }
    
    // Volatility analysis
    const volatility = data.ml_volatility_prediction || 1
    if (volatility > 1.3) {
      intelligence.push({
        category: 'Volatility Alert',
        insight: 'AI predicts increased volatility ahead',
        impact: 'Widen stops, reduce position size',
        confidence: mlConfidence,
        icon: '⚡'
      })
    } else if (volatility < 0.7) {
      intelligence.push({
        category: 'Low Volatility',
        insight: 'AI predicts compressed volatility',
        impact: 'Prepare for potential breakout',
        confidence: mlConfidence,
        icon: '😴'
      })
    }
    
    // Signal strength analysis
    if (signalStrength > 80) {
      intelligence.push({
        category: 'Strong Setup',
        insight: 'Multiple indicators align for high-probability trade',
        impact: 'Consider larger position size',
        confidence: signalStrength,
        icon: '💪'
      })
    } else if (signalStrength < 40) {
      intelligence.push({
        category: 'Weak Setup',
        insight: 'Mixed signals across technical indicators',
        impact: 'Wait for clearer confirmation',
        confidence: signalStrength,
        icon: '⚠️'
      })
    }
    
    // HTF bias analysis
    const htfBias = data.htf_bias
    const mlDirection = mlLongProb > mlShortProb ? 'Bullish' : 'Bearish'
    if (htfBias && htfBias !== 'Unknown') {
      const alignment = htfBias === mlDirection
      intelligence.push({
        category: 'Timeframe Alignment',
        insight: alignment ? 'ML signals align with higher timeframe' : 'ML conflicts with higher timeframe',
        impact: alignment ? 'Increased success probability' : 'Trade with caution',
        confidence: alignment ? mlConfidence + 10 : mlConfidence - 10,
        icon: alignment ? '✅' : '❌'
      })
    }
    
    return intelligence
  }
  
  // Generate risk assessment
  const generateRiskAssessment = () => {
    const risks = []
    
    // Circuit breaker status
    if (data.consecutive_losses && data.consecutive_losses > 0) {
      risks.push({
        type: 'warning',
        factor: 'Consecutive Losses',
        value: data.consecutive_losses,
        description: 'Recent losing streak detected',
        recommendation: 'Consider reducing position size'
      })
    }
    
    // Daily loss tracking
    if (data.daily_loss && data.daily_loss > 0) {
      risks.push({
        type: 'info',
        factor: 'Daily Loss',
        value: `$${data.daily_loss.toFixed(2)}`,
        description: 'Current session drawdown',
        recommendation: 'Monitor risk limits closely'
      })
    }
    
    // Confidence level risk
    if (mlConfidence < 50) {
      risks.push({
        type: 'warning',
        factor: 'Low AI Confidence',
        value: `${mlConfidence.toFixed(1)}%`,
        description: 'AI models show uncertainty',
        recommendation: 'Avoid new positions until clarity improves'
      })
    }
    
    // Smart trailing risk
    if (data.smart_trailing_enabled === false && position !== 'Flat') {
      risks.push({
        type: 'critical',
        factor: 'Smart Trailing Disabled',
        value: 'OFF',
        description: 'Position not protected by AI trailing',
        recommendation: 'Enable smart trailing or set manual stops'
      })
    }
    
    return risks
  }
  
  const recommendation = generateTradingRecommendation()
  const marketIntelligence = generateMarketIntelligence()
  const riskAssessment = generateRiskAssessment()

  if (isLoading) {
    return (
      <div className="trading-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-purple-400 text-lg">🤖</span>
          </div>
          <LoadingSkeleton className="h-6 w-48" />
        </div>
        
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-20 w-full" />
          <LoadingSkeleton className="h-16 w-full" />
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
            <span className="text-purple-400 text-lg">🤖</span>
          </div>
          <h3 className="text-lg font-semibold text-white">AI Intelligence</h3>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          {(['recommendation', 'analysis', 'risk'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                activeView === view
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* AI Recommendation */}
      {activeView === 'recommendation' && (
        <div className="space-y-4">
          {/* Primary Recommendation */}
          <div className={`p-4 rounded-lg border ${recommendation.bgColor} ${recommendation.borderColor}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{recommendation.icon}</span>
              <div>
                <h4 className={`font-bold ${recommendation.color}`}>
                  {recommendation.action}
                </h4>
                <p className="text-sm text-gray-400">{recommendation.reason}</p>
              </div>
            </div>
            
            {recommendation.details && (
              <div className="text-xs text-gray-500 mt-2">
                {recommendation.details}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500">AI Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-purple-400 transition-all duration-500"
                    style={{ width: `${recommendation.confidence}%` }}
                  ></div>
                </div>
                <span className="text-xs text-purple-400">{recommendation.confidence.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Long Probability</div>
              <div className="text-lg font-bold text-green-400">{mlLongProb.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Short Probability</div>
              <div className="text-lg font-bold text-red-400">{mlShortProb.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">Signal Strength</div>
              <div className="text-lg font-bold text-blue-400">{signalStrength.toFixed(0)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Market Analysis */}
      {activeView === 'analysis' && (
        <div className="space-y-3">
          {marketIntelligence.length > 0 ? (
            marketIntelligence.map((intel, index) => (
              <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{intel.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium text-white">{intel.category}</h5>
                      <span className="text-xs text-purple-400">{intel.confidence.toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{intel.insight}</p>
                    <p className="text-xs text-blue-400">{intel.impact}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <span className="text-2xl mb-2 block">🔍</span>
              <p>Gathering market intelligence...</p>
            </div>
          )}
        </div>
      )}

      {/* Risk Assessment */}
      {activeView === 'risk' && (
        <div className="space-y-3">
          {riskAssessment.length > 0 ? (
            riskAssessment.map((risk, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                risk.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                risk.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h5 className={`text-sm font-medium ${
                    risk.type === 'critical' ? 'text-red-400' :
                    risk.type === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {risk.factor}
                  </h5>
                  <span className="text-xs font-bold text-white">{risk.value}</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{risk.description}</p>
                <p className="text-xs text-purple-400">{risk.recommendation}</p>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <span className="text-2xl mb-2 block">✅</span>
              <p>All risk checks passed</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AIIntelligencePanel 