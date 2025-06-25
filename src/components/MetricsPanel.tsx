import { useMemo, memo } from 'react'

interface MetricsPanelProps {
  data: any
}

export default memo(function MetricsPanel({ data }: MetricsPanelProps) {
  // Memoize RSI calculations
  const rsiStatus = useMemo(() => {
    const rsi = data?.rsi || 0
    if (rsi > 70) return { color: 'text-red-400', status: 'Overbought', emoji: '📈' }
    if (rsi < 30) return { color: 'text-green-400', status: 'Oversold', emoji: '📉' }
    return { color: 'text-yellow-400', status: 'Neutral', emoji: '⚖️' }
  }, [data?.rsi])
  
  // Memoize formatted values
  const formattedValues = useMemo(() => ({
    price: data?.price?.toFixed(2) || '0.00',
    rsi: data?.rsi?.toFixed(2) || '0.00',
    emaAlignment: data?.ema_alignment?.toFixed(1) || '0.0',
    instrument: data?.instrument || 'N/A',
    volume: data?.volume?.toLocaleString() || null,
    timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'No data'
  }), [data?.price, data?.rsi, data?.ema_alignment, data?.instrument, data?.volume, data?.timestamp])
  
  // Memoize EMA alignment color
  const emaColor = useMemo(() => 
    data?.ema_alignment > 0 ? 'text-trading-green' : 'text-trading-red',
    [data?.ema_alignment]
  )

  return (
    <div className="trading-card p-6 rounded-lg hover:border-trading-green/30 transition-all duration-300">
      <h2 className="text-xl font-bold mb-4 text-trading-green flex items-center gap-2">
        📊 Strategy Metrics
        {data?.timestamp && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
          <span className="text-gray-400 flex items-center gap-2">
            💰 Current Price
          </span>          <span className="font-mono text-lg text-white font-bold">
            ${formattedValues.price}
          </span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
          <span className="text-gray-400 flex items-center gap-2">
            {rsiStatus.emoji} RSI
            <span className="text-xs text-gray-500">({rsiStatus.status})</span>
          </span>          <span className={`font-mono text-lg font-bold ${rsiStatus.color}`}>
            {formattedValues.rsi}
          </span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
          <span className="text-gray-400 flex items-center gap-2">
            📐 EMA Alignment
          </span>          <span className={`font-mono text-lg font-bold ${emaColor}`}>
            {formattedValues.emaAlignment}°
          </span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
          <span className="text-gray-400 flex items-center gap-2">
            🎯 Instrument
          </span>          <span className="font-mono text-lg text-trading-blue font-bold">
            {formattedValues.instrument}
          </span>
        </div>        {formattedValues.volume && (
          <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
            <span className="text-gray-400 flex items-center gap-2">
              📊 Volume
            </span>
            <span className="font-mono text-lg text-purple-400 font-bold">
              {formattedValues.volume}
            </span>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            ⏰ Last Update
            <div className="w-1 h-1 bg-trading-green rounded-full animate-ping"></div>
          </div>          <div className="text-xs font-mono text-gray-300">
            {formattedValues.timestamp}
          </div>
        </div>
      </div>
    </div>
  )
})
