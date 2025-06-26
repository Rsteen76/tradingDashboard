import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

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
  }
}

export default function AIIntelligencePanel({ data = {} }: AIIntelligencePanelProps) {
  const [activeView, setActiveView] = useState<'recommendation' | 'reasoning'>('recommendation')
  
  // Extract and process AI data
  const mlLongProb = (data.ml_long_probability || 0) * 100
  const mlShortProb = (data.ml_short_probability || 0) * 100
  const mlConfidence = (data.ml_confidence_level || 0) * 100
  const signalStrength = data.overall_signal_strength || 0
  const position = data.position || 'Flat'
  const positionSize = data.position_size || 0
  
  // Generate AI-powered trading recommendation
  const generateTradingRecommendation = () => {
    const isFlat = position === 'Flat' || positionSize === 0
    const hasStrongSignal = Math.max(mlLongProb, mlShortProb) > 70 && mlConfidence > 65
    
    // Circuit breaker check
    if (data.trading_disabled) {
      return {
        action: 'TRADING HALTED',
        reason: 'Circuit breaker active - risk limits exceeded',
        confidence: 0,
        priority: 'critical',
        icon: '🚨',
        color: 'text-red-600',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30'
      }
    }
    
    // Position management recommendations
    if (!isFlat) {
      const smartTrailingActive = data.smart_trailing_active
      const currentStop = data.current_smart_stop || 0
      const algorithm = data.active_trailing_algorithm || 'none'
      
      if (smartTrailingActive && algorithm !== 'none') {
        return {
          action: 'SMART TRAILING ACTIVE',
          reason: `AI managing ${position} position with ${algorithm}`,
          confidence: mlConfidence,
          priority: 'good',
          icon: '🤖',
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          details: `Stop: ${currentStop.toFixed(2)}`
        }
      } else {
        return {
          action: 'MONITOR POSITION',
          reason: `Hold ${position} position - monitoring for exit`,
          confidence: mlConfidence,
          priority: 'info',
          icon: '👁️',
          color: 'text-yellow-600',
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
        reason: `Strong ${direction.toLowerCase()} setup with ${probability.toFixed(1)}% probability`,
        confidence: mlConfidence,
        priority: 'opportunity',
        icon: direction === 'LONG' ? '🟢' : '🔴',
        color: direction === 'LONG' ? 'text-green-600' : 'text-red-600',
        bgColor: direction === 'LONG' ? 'bg-green-500/10' : 'bg-red-500/10',
        borderColor: direction === 'LONG' ? 'border-green-500/30' : 'border-red-500/30'
      }
    }
    
    // Default - wait for better setup
    return {
      action: 'WAIT FOR SETUP',
      reason: 'Waiting for high-probability setup',
      confidence: mlConfidence,
      priority: 'neutral',
      icon: '⏳',
      color: 'text-gray-600',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30'
    }
  }

  // Generate decision reasoning
  const generateDecisionReasoning = () => {
    const reasons = []
    
    // Market regime reasoning
    if (data.ml_market_regime) {
      reasons.push({
        factor: 'Market Regime',
        analysis: `AI detects ${data.ml_market_regime.toLowerCase()} conditions`,
        impact: data.ml_market_regime === 'Trending' ? 'Follow trend momentum' : 'Look for reversals',
        confidence: mlConfidence,
        icon: data.ml_market_regime === 'Trending' ? '📈' : '🔄'
      })
    }
    
    // Signal strength reasoning
    if (signalStrength > 0) {
      const strength = signalStrength > 80 ? 'Very Strong' :
                      signalStrength > 65 ? 'Strong' :
                      signalStrength > 50 ? 'Moderate' :
                      'Weak'
      reasons.push({
        factor: 'Signal Quality',
        analysis: `${strength} signal detected`,
        impact: signalStrength > 65 ? 'High-probability setup' : 'Wait for stronger confirmation',
        confidence: signalStrength,
        icon: signalStrength > 65 ? '💪' : '⚠️'
      })
    }
    
    // Directional bias reasoning
    if (mlLongProb > 0 || mlShortProb > 0) {
      const bias = mlLongProb > mlShortProb + 10 ? 'Strong Bullish' :
                  mlShortProb > mlLongProb + 10 ? 'Strong Bearish' :
                  mlLongProb > mlShortProb ? 'Slight Bullish' :
                  mlShortProb > mlLongProb ? 'Slight Bearish' :
                  'Neutral'
      reasons.push({
        factor: 'Directional Bias',
        analysis: bias,
        impact: `Long: ${mlLongProb.toFixed(1)}% / Short: ${mlShortProb.toFixed(1)}%`,
        confidence: Math.max(mlLongProb, mlShortProb),
        icon: mlLongProb > mlShortProb ? '📈' : mlShortProb > mlLongProb ? '📉' : '↔️'
      })
    }
    
    // Technical alignment
    if (data.ema_alignment_score !== undefined) {
      const alignment = data.ema_alignment_score > 3 ? 'Strong' :
                       data.ema_alignment_score > 1 ? 'Moderate' :
                       data.ema_alignment_score < -1 ? 'Negative' : 'Weak'
      reasons.push({
        factor: 'Technical Alignment',
        analysis: `${alignment} EMA alignment`,
        impact: data.ema_alignment_score > 1 ? 'Supports trend continuation' : 'Possible trend weakness',
        confidence: Math.abs(data.ema_alignment_score) * 20,
        icon: data.ema_alignment_score > 1 ? '📊' : '⚠️'
      })
    }
    
    return reasons
  }

  const recommendation = generateTradingRecommendation()
  const decisionReasoning = generateDecisionReasoning()

  return (
    <Card className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">AI Trade Intelligence</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('recommendation')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeView === 'recommendation'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Recommendation
            </button>
            <button
              onClick={() => setActiveView('reasoning')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeView === 'reasoning'
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Reasoning
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {activeView === 'recommendation' ? (
          <>
            {/* Primary Recommendation */}
            <div className={`p-4 rounded-lg border ${recommendation.bgColor} ${recommendation.borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{recommendation.icon}</span>
                  <span className={`text-lg font-bold ${recommendation.color}`}>
                    {recommendation.action}
                  </span>
                </div>
                <Badge variant="outline" className={recommendation.color}>
                  {mlConfidence.toFixed(0)}% Confidence
                </Badge>
              </div>
              <p className="text-gray-600">{recommendation.reason}</p>
              {recommendation.details && (
                <p className="mt-2 text-sm text-gray-500">{recommendation.details}</p>
              )}
            </div>

            {/* Probabilities */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Long Probability</div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-bold">{mlLongProb.toFixed(1)}%</span>
                  <Progress value={mlLongProb} className="w-24 h-2" />
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Short Probability</div>
                <div className="flex items-center justify-between">
                  <span className="text-red-600 font-bold">{mlShortProb.toFixed(1)}%</span>
                  <Progress value={mlShortProb} className="w-24 h-2" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {decisionReasoning.map((reason, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{reason.icon}</span>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium text-gray-900">{reason.factor}</h5>
                      <Badge variant="outline" className="text-purple-600">
                        {reason.confidence.toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{reason.analysis}</p>
                    <p className="text-xs text-purple-600">{reason.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 