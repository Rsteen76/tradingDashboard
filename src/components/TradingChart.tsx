import { memo, useMemo } from 'react'

interface TradingChartProps {
  data: any[]
}

export default memo(function TradingChart({ data }: TradingChartProps) {
  // Memoize chart statistics
  const chartStats = useMemo(() => {
    if (!data.length) return null
    
    const prices = data.map(d => d.price).filter(p => p > 0)
    if (!prices.length) return null
    
    const current = prices[prices.length - 1]
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const volume = data.reduce((sum, d) => sum + (d.volume || 0), 0)
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
    
    return {
      current: current.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      range: (high - low).toFixed(2),
      volume: volume.toLocaleString(),
      avgPrice: avgPrice.toFixed(2),
      dataPoints: data.length
    }
  }, [data])

  return (
    <div className="trading-card p-6 rounded-lg h-96">
      <h2 className="text-xl font-bold mb-4 text-trading-green">📈 Real-Time Chart</h2>
      
      <div className="h-full flex flex-col">
        {/* Chart Stats Header */}
        {chartStats && (
          <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-gray-400">Current</div>
              <div className="font-bold text-white">${chartStats.current}</div>
            </div>
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-gray-400">High</div>
              <div className="font-bold text-green-400">${chartStats.high}</div>
            </div>
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-gray-400">Low</div>
              <div className="font-bold text-red-400">${chartStats.low}</div>
            </div>
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-gray-400">Range</div>
              <div className="font-bold text-blue-400">${chartStats.range}</div>
            </div>
          </div>
        )}
        
        {/* Chart Area */}
        <div className="flex-1 flex items-center justify-center border border-gray-700 rounded-lg bg-gray-900/50">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-xl">Advanced Chart View</div>
            <div className="text-sm mt-2">
              {chartStats ? 
                `${chartStats.dataPoints} data points | Avg: $${chartStats.avgPrice}` : 
                'Waiting for data...'
              }
            </div>
            <div className="text-xs mt-2 text-gray-500">
              TradingView integration ready
            </div>
          </div>
        </div>
        
        {/* Chart Footer */}
        {chartStats && (
          <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
            <div>Volume: {chartStats.volume}</div>
            <div>Data Points: {chartStats.dataPoints}</div>
            <div>Last Update: {new Date().toLocaleTimeString()}</div>
          </div>
        )}
      </div>
    </div>
  )
})
