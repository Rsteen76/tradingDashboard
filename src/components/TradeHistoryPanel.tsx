import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TradeMessage {
  instrument?: string
  timestamp?: string
  direction?: 'Long' | 'Short'
  entry_price?: number
  exit_price?: number
  pnl?: number
  quantity?: number
}

interface TradeHistoryPanelProps {
  trades: TradeMessage[]
}

const formatTime = (ts?: string) => {
  if (!ts) return '--'
  const d = new Date(ts)
  return d.toLocaleTimeString()
}

const TradeHistoryPanel: React.FC<TradeHistoryPanelProps> = ({ trades }) => {
  return (
    <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30">
      <CardHeader className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-semibold text-gray-100">Recent Trades</h2>
        <Badge variant="outline">{trades.length}</Badge>
      </CardHeader>
      <CardContent className="max-h-60 overflow-y-auto divide-y divide-trading-border/30 text-sm">
        {trades.slice().reverse().map((t, idx) => (
          <div key={idx} className="py-2 flex justify-between items-center">
            <span>{formatTime(t.timestamp)}</span>
            <span className={t.direction === 'Long' ? 'text-emerald-400' : 'text-red-400'}>
              {t.direction?.toUpperCase()}
            </span>
            <span>@ {t.entry_price?.toFixed(2)}</span>
            <span className={t.pnl && t.pnl < 0 ? 'text-red-400' : 'text-emerald-400'}>
              {t.pnl ? t.pnl.toFixed(2) : '--'}
            </span>
          </div>
        ))}
        {trades.length === 0 && <div className="text-center text-gray-400 py-4">No trades yet</div>}
      </CardContent>
    </Card>
  )
}

export default TradeHistoryPanel 