import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PerformanceMetricsProps {
  lastTrade?: {
    pnl?: number
    direction?: string
    entry_price?: number
    exit_price?: number
    quantity?: number
  }
  riskManagement?: {
    daily_loss?: number
    trading_disabled?: boolean
    consecutive_losses?: number
    max_daily_loss?: number
    max_consecutive_losses?: number
  }
}

const formatCurrency = (value?: number) => {
  if (value === undefined) return '--'
  return `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ lastTrade, riskManagement }) => {
  const lastPnl = lastTrade?.pnl ?? 0
  const dailyPnl = riskManagement?.daily_loss ? -riskManagement.daily_loss : 0
  const tradingHalted = riskManagement?.trading_disabled ?? false

  const pnlColor = (val: number) => (val >= 0 ? 'text-emerald-400' : 'text-red-400')

  return (
    <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30 p-4">
      <CardHeader className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-bold text-gray-100">Performance Summary</h2>
        <Badge variant="outline" className={tradingHalted ? 'border-red-500 text-red-400' : 'border-emerald-500 text-emerald-400'}>
          {tradingHalted ? 'Trading Halted' : 'Trading Active'}
        </Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-trading-gray-400">Last Trade P&L</p>
          <p className={`text-xl font-mono ${pnlColor(lastPnl)}`}>{formatCurrency(lastPnl)}</p>
        </div>
        <div>
          <p className="text-sm text-trading-gray-400">Daily Net P&L</p>
          <p className={`text-xl font-mono ${pnlColor(dailyPnl)}`}>{formatCurrency(dailyPnl)}</p>
        </div>
        <div>
          <p className="text-sm text-trading-gray-400">Consecutive Losses</p>
          <p className="text-xl font-mono text-gray-100">
            {riskManagement?.consecutive_losses ?? '--'} / {riskManagement?.max_consecutive_losses ?? '--'}
          </p>
        </div>
        <div>
          <p className="text-sm text-trading-gray-400">Max Daily Loss</p>
          <p className="text-xl font-mono text-red-400">
            {riskManagement?.max_daily_loss ? `-$${riskManagement.max_daily_loss.toFixed(2)}` : '--'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default PerformanceMetrics 