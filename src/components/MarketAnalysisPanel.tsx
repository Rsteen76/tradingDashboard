import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface MarketAnalysisPanelProps {
  data?: {
    price?: number
    bid?: number
    ask?: number
    volume?: number
    rsi?: number
    atr?: number
    ema_alignment?: number
    volatility_state?: string
    market_regime?: string
    htf_bias?: string
    signal_probability_long?: number
    signal_probability_short?: number
    overall_signal_strength?: number
  }
}

const MarketAnalysisPanel: React.FC<MarketAnalysisPanelProps> = ({ data = {} }) => {
  // Format price with color based on bid/ask spread
  const formatPrice = (price: number | undefined) => {
    if (!price) return '--'
    return price.toFixed(2)
  }

  // Get RSI color based on value
  const getRsiColor = (rsi: number | undefined) => {
    if (!rsi) return 'text-gray-400'
    if (rsi >= 70) return 'text-red-400'
    if (rsi <= 30) return 'text-green-400'
    return 'text-blue-400'
  }

  // Get volatility state color
  const getVolatilityColor = (state: string | undefined) => {
    if (!state) return 'bg-gray-500/20'
    switch (state.toLowerCase()) {
      case 'high': return 'bg-red-500/20'
      case 'medium': return 'bg-yellow-500/20'
      case 'low': return 'bg-green-500/20'
      default: return 'bg-gray-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Market Status Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Market Analysis</h2>
        <div className="flex space-x-2">
          <Badge variant="outline" className={data.market_regime === 'TRENDING' ? 'bg-blue-500/20' : 'bg-purple-500/20'}>
            {data.market_regime || 'UNKNOWN'}
          </Badge>
          <Badge variant="outline" className={getVolatilityColor(data.volatility_state)}>
            {data.volatility_state || 'UNKNOWN'} VOL
          </Badge>
        </div>
      </div>

      {/* Price Information */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="text-3xl font-bold text-gray-100">
            ${formatPrice(data.price)}
          </div>
          <div className="flex space-x-4 text-sm">
            <span className="text-green-400">Bid: ${formatPrice(data.bid)}</span>
            <span className="text-red-400">Ask: ${formatPrice(data.ask)}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-400">Volume</div>
          <div className="text-3xl font-bold text-blue-400">
            {data.volume?.toLocaleString() || '--'}
          </div>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-gray-400">RSI</div>
          <div className={`text-2xl font-bold ${getRsiColor(data.rsi)}`}>
            {data.rsi?.toFixed(1) || '--'}
          </div>
          <Progress 
            value={data.rsi} 
            className="h-1"
            indicatorClassName={getRsiColor(data.rsi)}
          />
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-400">ATR</div>
          <div className="text-2xl font-bold text-emerald-400">
            {data.atr?.toFixed(2) || '--'}
          </div>
          <div className="text-xs text-gray-500">
            {data.atr && data.price 
              ? `${((data.atr / data.price) * 100).toFixed(2)}% of price`
              : '--'
            }
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-400">EMA Alignment</div>
          <div className="text-2xl font-bold text-blue-400">
            {data.ema_alignment?.toFixed(1) || '--'}
          </div>
          <Progress value={data.ema_alignment} className="h-1" />
        </div>
      </div>

      {/* Signal Analysis */}
      <div className="space-y-4">
        <div className="text-sm text-gray-400">Signal Analysis</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Long Signal</span>
              <span className="text-green-400">
                {((data.signal_probability_long || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(data.signal_probability_long || 0) * 100} 
              className="h-1"
              indicatorClassName="bg-green-400"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Short Signal</span>
              <span className="text-red-400">
                {((data.signal_probability_short || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={(data.signal_probability_short || 0) * 100} 
              className="h-1"
              indicatorClassName="bg-red-400"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-400">Overall Strength</span>
          <span className="text-lg font-semibold text-blue-400">
            {data.overall_signal_strength?.toFixed(1) || '--'}%
          </span>
        </div>
      </div>
    </div>
  )
}

export default MarketAnalysisPanel 