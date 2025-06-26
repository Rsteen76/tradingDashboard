import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface TradingVisualizerProps {
  data?: {
    price?: number
    position?: string
    position_size?: number
    entry_price?: number
    stop_loss?: number
    take_profit?: number
    pnl?: number
    next_long_entry?: number
    next_short_entry?: number
    long_entry_quality?: number
    short_entry_quality?: number
    target1?: number
    target2?: number
    atr?: number
  }
}

const TradingVisualizer: React.FC<TradingVisualizerProps> = ({ data = {} }) => {
  // Calculate position P&L
  const calculatePnL = () => {
    if (!data.position || data.position === 'flat' || !data.entry_price || !data.price) return null
    const isLong = data.position.toLowerCase() === 'long'
    const pnlPoints = isLong ? data.price - data.entry_price : data.entry_price - data.price
    return pnlPoints * (data.position_size || 1)
  }

  // Format price with color based on P&L
  const formatPrice = (price: number | undefined, reference?: number) => {
    if (!price) return '--'
    const formatted = price.toFixed(2)
    if (!reference) return formatted
    return price > reference ? `+${(price - reference).toFixed(2)}` : (price - reference).toFixed(2)
  }

  // Get position badge color
  const getPositionColor = () => {
    if (!data.position || data.position === 'flat') return 'bg-gray-500/20'
    return data.position.toLowerCase() === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'
  }

  // Calculate quality percentage for entry levels
  const getQualityPercentage = (quality: number | undefined) => {
    if (!quality) return 0
    return Math.min(Math.max(quality * 100, 0), 100)
  }

  return (
    <div className="space-y-6">
      {/* Position Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Position Management</h2>
        <Badge variant="outline" className={getPositionColor()}>
          {data.position?.toUpperCase() || 'FLAT'} {data.position_size || 0}
        </Badge>
      </div>

      {/* Current Position Info */}
      {data.position && data.position !== 'flat' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Entry Price</div>
            <div className="text-2xl font-bold text-gray-100">
              ${formatPrice(data.entry_price)}
            </div>
            <div className="text-sm text-gray-500">
              Current: ${formatPrice(data.price)} ({formatPrice(data.price, data.entry_price)})
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-400">P&L</div>
            <div className={`text-2xl font-bold ${(data.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${(data.pnl || 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Risk Management Levels */}
      {data.position && data.position !== 'flat' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-400">Stop Loss</div>
              <div className="text-lg font-semibold text-red-400">
                ${formatPrice(data.stop_loss)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Target 1</div>
              <div className="text-lg font-semibold text-green-400">
                ${formatPrice(data.target1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Target 2</div>
              <div className="text-lg font-semibold text-green-400">
                ${formatPrice(data.target2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Opportunities */}
      {(!data.position || data.position === 'flat') && (
        <div className="space-y-4">
          <div className="text-sm text-gray-400">Entry Opportunities</div>
          <div className="grid grid-cols-2 gap-6">
            {/* Long Entry */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Long Entry</span>
                <span className="text-green-400">${formatPrice(data.next_long_entry)}</span>
              </div>
              <Progress 
                value={getQualityPercentage(data.long_entry_quality)} 
                className="h-1"
                indicatorClassName="bg-green-400"
              />
              <div className="text-xs text-gray-500">
                Quality: {(data.long_entry_quality || 0).toFixed(2)}
              </div>
            </div>
            {/* Short Entry */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Short Entry</span>
                <span className="text-red-400">${formatPrice(data.next_short_entry)}</span>
              </div>
              <Progress 
                value={getQualityPercentage(data.short_entry_quality)} 
                className="h-1"
                indicatorClassName="bg-red-400"
              />
              <div className="text-xs text-gray-500">
                Quality: {(data.short_entry_quality || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ATR Context */}
      <div className="mt-4">
        <div className="text-sm text-gray-400">Volatility Context</div>
        <div className="text-lg font-semibold text-emerald-400">
          ATR: {data.atr?.toFixed(2) || '--'} ({data.atr && data.price ? ((data.atr / data.price) * 100).toFixed(2) : '--'}% of price)
        </div>
      </div>
    </div>
  )
}

export default TradingVisualizer 