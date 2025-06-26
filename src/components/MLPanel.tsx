import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface MLPanelProps {
  data?: {
    // Market Data
    price?: number
    bid?: number
    ask?: number
    spread?: number
    volume?: number
    
    // Technical Indicators
    rsi?: number
    atr?: number
    adx?: number
    ema_5?: number
    ema_8?: number
    ema_13?: number
    ema_21?: number
    ema_50?: number
    ema_alignment_score?: number
    
    // ML Analysis
    ml_market_regime?: string
    ml_volatility_prediction?: number
    detectedPatterns?: string[]
    adaptiveAccuracy?: number
    aiModels?: Array<{ model: string, weight: number }>
    
    // Market Context
    htf_bias?: string
    market_regime?: string
    volatility_state?: string
    timestamp?: string
  }
  isLoading?: boolean
}

const LoadingSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-700/50 rounded ${className}`}></div>
)

const MLPanel: React.FC<MLPanelProps> = ({ data = {}, isLoading = false }) => {
  const [activeTab, setActiveTab] = useState<'technical' | 'patterns' | 'models'>('technical')
  
  // Process technical indicators
  const getTechnicalAnalysis = () => {
    const analysis = []
    
    // RSI Analysis
    if (data.rsi !== undefined) {
      const rsi = data.rsi
      analysis.push({
        indicator: 'RSI',
        value: rsi.toFixed(1),
        interpretation: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral',
        signal: rsi > 70 ? 'Potential reversal' : rsi < 30 ? 'Potential bounce' : 'No clear signal',
        strength: Math.abs(50 - rsi) * 2,
        color: rsi > 70 ? 'text-red-500 font-bold' : rsi < 30 ? 'text-green-500 font-bold' : 'text-gray-500'
      })
    } else {
      analysis.push({
        indicator: 'RSI',
        value: 'N/A',
        interpretation: 'Waiting for data...',
        signal: 'No signal',
        strength: 0,
        color: 'text-gray-400'
      })
    }
    
    // ADX Analysis
    if (data.adx !== undefined) {
      const adx = data.adx
      analysis.push({
        indicator: 'ADX',
        value: adx.toFixed(1),
        interpretation: adx > 25 ? 'Strong Trend' : 'Weak Trend',
        signal: adx > 25 ? 'Follow trend' : 'Range trading',
        strength: adx,
        color: adx > 25 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    // ATR Analysis
    if (data.atr !== undefined && data.price) {
      const atrPercent = (data.atr / data.price) * 100
      analysis.push({
        indicator: 'ATR',
        value: atrPercent.toFixed(2) + '%',
        interpretation: atrPercent > 1 ? 'High Volatility' : atrPercent < 0.5 ? 'Low Volatility' : 'Normal Volatility',
        signal: atrPercent > 1 ? 'Wider stops needed' : atrPercent < 0.5 ? 'Tight stops possible' : 'Standard stops',
        strength: atrPercent * 50,
        color: atrPercent > 1 ? 'text-purple-600' : atrPercent < 0.5 ? 'text-yellow-600' : 'text-blue-600'
      })
    }
    
    // EMA Alignment
    if (data.ema_alignment_score !== undefined) {
      const alignment = data.ema_alignment_score
      analysis.push({
        indicator: 'EMA Alignment',
        value: alignment.toFixed(1),
        interpretation: alignment > 3 ? 'Strong Trend' : alignment > 1 ? 'Moderate Trend' : 'Weak/No Trend',
        signal: alignment > 2 ? 'Strong trend following' : alignment > 1 ? 'Moderate trend following' : 'No clear trend',
        strength: Math.abs(alignment) * 25,
        color: alignment > 2 ? 'text-green-600' : alignment > 1 ? 'text-blue-600' : 'text-gray-600'
      })
    }
    
    return analysis
  }
  
  // Process market patterns
  const getMarketPatterns = () => {
    const patterns = []
    
    // Market Regime
    if (data.ml_market_regime || data.market_regime) {
      const regime = data.ml_market_regime || data.market_regime
      patterns.push({
        name: 'Market Regime',
        pattern: regime,
        description: regime === 'Trending' ? 'Strong directional movement' : 'Sideways or choppy',
        reliability: regime === 'Trending' ? 85 : 65,
        action: regime === 'Trending' ? 'Follow trend momentum' : 'Look for range trades'
      })
    }
    
    // Volatility State
    if (data.ml_volatility_prediction || data.volatility_state) {
      const volatility = data.ml_volatility_prediction || data.volatility_state
      patterns.push({
        name: 'Volatility',
        pattern: typeof volatility === 'number' ? 
          volatility > 1.3 ? 'High' : volatility < 0.7 ? 'Low' : 'Normal'
          : volatility,
        description: typeof volatility === 'number' ?
          volatility > 1.3 ? 'Increased price swings' : volatility < 0.7 ? 'Compressed movement' : 'Normal movement'
          : 'Current volatility state',
        reliability: 75,
        action: typeof volatility === 'number' ?
          volatility > 1.3 ? 'Widen targets/stops' : volatility < 0.7 ? 'Prepare for breakout' : 'Standard trading'
          : 'Adapt to volatility'
      })
    }
    
    // Higher Timeframe Bias
    if (data.htf_bias && data.htf_bias !== 'Unknown') {
      patterns.push({
        name: 'HTF Bias',
        pattern: data.htf_bias,
        description: `Higher timeframe shows ${data.htf_bias.toLowerCase()} bias`,
        reliability: 80,
        action: `Look for ${data.htf_bias === 'Bullish' ? 'long' : 'short'} setups`
      })
    }
    
    // Custom Detected Patterns
    if (data.detectedPatterns && data.detectedPatterns.length > 0) {
      data.detectedPatterns.forEach(pattern => {
        patterns.push({
          name: 'Chart Pattern',
          pattern: pattern,
          description: `Detected ${pattern.toLowerCase()} formation`,
          reliability: 70,
          action: 'Monitor for pattern completion'
        })
      })
    }
    
    return patterns
  }
  
  // Process AI models
  const getModelAnalysis = () => {
    const models = data.aiModels || []
    const accuracy = data.adaptiveAccuracy || 0
    
    return {
      models: models.map(model => ({
        name: model.model,
        weight: model.weight,
        contribution: (model.weight * 100).toFixed(1) + '%'
      })),
      accuracy: accuracy,
      totalModels: models.length
    }
  }

  const technicalAnalysis = getTechnicalAnalysis()
  const marketPatterns = getMarketPatterns()
  const modelAnalysis = getModelAnalysis()

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
    <Card className="bg-gray-900 text-white shadow-xl">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Technical Analysis</h2>
          {data.timestamp && (
            <span className="text-xs text-gray-400">
              Last update: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {technicalAnalysis.map((item, index) => (
            <div key={item.indicator} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{item.indicator}</span>
                <span className={`${item.color} font-mono`}>{item.value}</span>
              </div>
              <div className="text-sm text-gray-400">{item.interpretation}</div>
              <Progress value={item.strength} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default MLPanel
