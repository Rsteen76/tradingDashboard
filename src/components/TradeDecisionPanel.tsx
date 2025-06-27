import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface TradeDecisionPanelProps {
  data?: {
    price?: number
    position?: string
    market_regime?: string
    volatility_state?: string
    ml_confidence_level?: number
    ml_confidence?: number
    confidence?: number
    minConfidence?: number
    autoTradingEnabled?: boolean
    ml_trade_recommendation?: string
    next_long_entry_level?: number
    next_short_entry_level?: number
    long_entry_quality?: number
    short_entry_quality?: number
    overall_signal_strength?: number
    rsi?: number
    ema_alignment_score?: number
    htf_bias?: string
  }
}

export default function TradeDecisionPanel({ data = {} }: TradeDecisionPanelProps) {
  const getMarketConditionColor = (regime?: string) => {
    switch (regime?.toLowerCase()) {
      case 'bullish': return 'bg-green-100 text-green-800'
      case 'bearish': return 'bg-red-100 text-red-800'
      case 'neutral': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Normalize helper (0-1 or 0-100)
  const normalize = (v?: number) => {
    if (v === undefined) return 0
    return v > 1 ? v / 100 : v
  }

  const mlConf = normalize(data.ml_confidence_level ?? data.ml_confidence ?? data.confidence)

  const threshold = data.minConfidence ?? 0.7;

  const getTradeReasonText = () => {
    if (!data.position || data.position === 'Flat') {
      const conditions = []
      if (data.market_regime) conditions.push(`Market is ${data.market_regime}`)
      if (data.volatility_state) conditions.push(`Volatility is ${data.volatility_state}`)
      if (data.ml_confidence_level && data.ml_confidence_level < threshold) {
        conditions.push(`ML confidence below ${Math.round(threshold * 100)}% threshold`);
      }
      if (data.rsi) {
        if (data.rsi > 70) conditions.push('RSI overbought')
        if (data.rsi < 30) conditions.push('RSI oversold')
      }
      return conditions.length > 0 
        ? `Not in position because: ${conditions.join(', ')}`
        : 'Waiting for optimal entry conditions'
    }

    const reasons = []
    if (data.ml_confidence_level && data.ml_confidence_level > 0.7) reasons.push('High ML confidence')
    if (data.overall_signal_strength && data.overall_signal_strength > 70) reasons.push('Strong signal alignment')
    if (data.ema_alignment_score && data.ema_alignment_score > 3) reasons.push('EMAs aligned')
    if (data.htf_bias) reasons.push(`Higher timeframe bias: ${data.htf_bias}`)

    return `In ${data.position} position because: ${reasons.join(', ')}`
  }

  return (
    <Card className="w-full bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <h2 className="text-xl font-bold">Trade Decision Analysis</h2>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Current Market State */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className={getMarketConditionColor(data.market_regime)}>
            {data.market_regime || 'Unknown Regime'}
          </Badge>
          <Badge variant="outline" className={getMarketConditionColor(data.volatility_state)}>
            {data.volatility_state || 'Unknown Volatility'}
          </Badge>
          <Badge variant="outline" className={getMarketConditionColor(data.htf_bias)}>
            HTF: {data.htf_bias || 'Unknown'}
          </Badge>
        </div>

        {/* ML Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>ML Confidence</span>
            <span>{(mlConf * 100).toFixed(1)}%</span>
          </div>
          <Progress value={mlConf * 100} className="h-2" />
        </div>

        {/* Trade Decision Explanation */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{getTradeReasonText()}</p>
        </div>

        {/* Next Entry Levels */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-semibold text-green-700">Next Long Entry</div>
            <div className="mt-1">
              <div>Level: {data.next_long_entry_level || 'N/A'}</div>
              <div>Quality: {data.long_entry_quality ? `${(data.long_entry_quality * 100).toFixed(1)}%` : 'N/A'}</div>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="font-semibold text-red-700">Next Short Entry</div>
            <div className="mt-1">
              <div>Level: {data.next_short_entry_level || 'N/A'}</div>
              <div>Quality: {data.short_entry_quality ? `${(data.short_entry_quality * 100).toFixed(1)}%` : 'N/A'}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 