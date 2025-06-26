import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface SignalPanelProps {
  data?: {
    // Signal Data
    signal_type?: 'entry' | 'exit' | 'none'
    signal_direction?: 'long' | 'short' | 'flat'
    signal_strength?: number
    signal_quality?: number
    signal_timeframe?: string
    
    // Entry/Exit Points
    entry_price?: number
    stop_loss?: number
    take_profit?: number
    risk_reward_ratio?: number
    position_size?: number
    
    // Market Context
    current_price?: number
    recent_high?: number
    recent_low?: number
    atr?: number
    volatility?: number
    
    // Signal Components
    trend_alignment?: number
    momentum_score?: number
    reversal_probability?: number
    breakout_strength?: number
    support_resistance_proximity?: number

    // Diagnostics
    no_trade_reasons?: string[]
  }
}

export default function SignalPanel({ data = {} }: SignalPanelProps) {
  // Determine if we have an actionable signal
  const hasActiveSignal = data.signal_direction === 'long' || data.signal_direction === 'short'
  const signalStrength = data.signal_strength || 0
  const signalQuality = data.signal_quality || 0
  
  // Calculate risk metrics
  const getRiskMetrics = () => {
    if (!data.entry_price || !data.stop_loss || !data.take_profit) return null
    
    const riskAmount = Math.abs(data.entry_price - data.stop_loss)
    const rewardAmount = Math.abs(data.take_profit - data.entry_price)
    const riskRewardRatio = data.risk_reward_ratio || (rewardAmount / riskAmount)
    
    return {
      riskAmount,
      rewardAmount,
      riskRewardRatio,
      positionSize: data.position_size || 0
    }
  }
  
  // Process signal components
  const getSignalComponents = () => {
    const components = []
    
    if (data.trend_alignment !== undefined) {
      components.push({
        name: 'Trend Alignment',
        value: data.trend_alignment,
        score: data.trend_alignment * 100,
        interpretation: data.trend_alignment > 0.7 ? 'Strong' : data.trend_alignment > 0.4 ? 'Moderate' : 'Weak',
        color: data.trend_alignment > 0.7 ? 'text-green-600' : data.trend_alignment > 0.4 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    if (data.momentum_score !== undefined) {
      components.push({
        name: 'Momentum',
        value: data.momentum_score,
        score: data.momentum_score * 100,
        interpretation: data.momentum_score > 0.7 ? 'Strong' : data.momentum_score > 0.4 ? 'Moderate' : 'Weak',
        color: data.momentum_score > 0.7 ? 'text-green-600' : data.momentum_score > 0.4 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    if (data.reversal_probability !== undefined) {
      components.push({
        name: 'Reversal Probability',
        value: data.reversal_probability,
        score: data.reversal_probability * 100,
        interpretation: data.reversal_probability > 0.7 ? 'High' : data.reversal_probability > 0.4 ? 'Medium' : 'Low',
        color: data.reversal_probability > 0.7 ? 'text-purple-600' : data.reversal_probability > 0.4 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    if (data.breakout_strength !== undefined) {
      components.push({
        name: 'Breakout Strength',
        value: data.breakout_strength,
        score: data.breakout_strength * 100,
        interpretation: data.breakout_strength > 0.7 ? 'Strong' : data.breakout_strength > 0.4 ? 'Moderate' : 'Weak',
        color: data.breakout_strength > 0.7 ? 'text-green-600' : data.breakout_strength > 0.4 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    if (data.support_resistance_proximity !== undefined) {
      components.push({
        name: 'S/R Proximity',
        value: data.support_resistance_proximity,
        score: (1 - data.support_resistance_proximity) * 100, // Closer to S/R = higher score
        interpretation: data.support_resistance_proximity < 0.3 ? 'Very Close' : data.support_resistance_proximity < 0.6 ? 'Near' : 'Far',
        color: data.support_resistance_proximity < 0.3 ? 'text-purple-600' : data.support_resistance_proximity < 0.6 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    return components
  }

  const riskMetrics = getRiskMetrics()
  const signalComponents = getSignalComponents()

  return (
    <Card className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Trade Signals</h2>
          <Badge 
            variant="outline" 
            className={hasActiveSignal ? 'bg-green-500/10 text-green-50' : 'bg-gray-500/10 text-gray-50'}
          >
            {hasActiveSignal ? 'Active Signal' : 'No Active Signal'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-6">
        {/* Signal Overview */}
        {hasActiveSignal && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {data.signal_direction === 'long' ? '🟢' : data.signal_direction === 'short' ? '🔴' : '⚪'}
                </span>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {data.signal_type === 'entry' ? 'Entry Signal' : 'Exit Signal'} - {data.signal_direction?.toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {data.signal_timeframe || 'All Timeframes'} Analysis
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">Signal Quality</div>
                <div className="flex items-center gap-2">
                  <Progress value={signalQuality} className="w-24" />
                  <span className="text-sm font-medium text-amber-600">
                    {signalQuality.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            
            {/* Price Levels */}
            {riskMetrics && (
              <div className="grid grid-cols-4 gap-4 p-3 bg-white rounded-lg mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Entry</div>
                  <div className="font-medium text-gray-900">${data.entry_price?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Stop Loss</div>
                  <div className="font-medium text-red-600">${data.stop_loss?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Take Profit</div>
                  <div className="font-medium text-green-600">${data.take_profit?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">R:R Ratio</div>
                  <div className="font-medium text-blue-600">{riskMetrics.riskRewardRatio.toFixed(2)}</div>
                </div>
              </div>
            )}
            
            {/* Signal Strength */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Signal Strength</span>
                <span className="font-medium text-gray-900">{signalStrength.toFixed(0)}%</span>
              </div>
              <Progress value={signalStrength} className="h-2" />
            </div>
          </div>
        )}
        
        {/* Diagnostic / Blocker Reasons */}
        {data.no_trade_reasons && data.no_trade_reasons.length > 0 && (
          <div className="p-4 rounded-lg border border-yellow-600/50 bg-yellow-900/20 space-y-3">
            <h3 className="font-medium text-yellow-100">Trade Blockers</h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-yellow-200">
              {data.no_trade_reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Signal Components */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Signal Components</h3>
          <div className="grid grid-cols-1 gap-3">
            {signalComponents.map((component, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{component.name}</span>
                  <Badge variant="outline" className={component.color}>
                    {component.interpretation}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Contribution Score</span>
                    <span className={`font-medium ${component.color}`}>
                      {component.score.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={component.score} className="h-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Market Context */}
        {data.current_price && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Market Context</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Price:</span>
                <span className="float-right font-medium text-gray-900">
                  ${data.current_price.toFixed(2)}
                </span>
              </div>
              {data.recent_high && (
                <div>
                  <span className="text-gray-500">Recent High:</span>
                  <span className="float-right font-medium text-gray-900">
                    ${data.recent_high.toFixed(2)}
                  </span>
                </div>
              )}
              {data.recent_low && (
                <div>
                  <span className="text-gray-500">Recent Low:</span>
                  <span className="float-right font-medium text-gray-900">
                    ${data.recent_low.toFixed(2)}
                  </span>
                </div>
              )}
              {data.volatility && (
                <div>
                  <span className="text-gray-500">Volatility:</span>
                  <span className="float-right font-medium text-gray-900">
                    {(data.volatility * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
