import { memo } from 'react'

interface ConnectionStatusProps {
  isConnected: boolean
  isActive?: boolean
  dataAge?: number
  lastUpdate?: string
}

export default memo(function ConnectionStatus({ 
  isConnected, 
  isActive = false,
  dataAge = 0,
  lastUpdate
}: ConnectionStatusProps) {
  
  // Determine connection quality based on data age
  const getConnectionQuality = () => {
    if (!isConnected) return { status: 'Disconnected', color: 'text-trading-red', indicator: 'bg-trading-red' }
    if (dataAge > 60000) return { status: 'Stale Data', color: 'text-yellow-400', indicator: 'bg-yellow-400' }
    if (dataAge > 30000) return { status: 'Slow Data', color: 'text-orange-400', indicator: 'bg-orange-400' }
    if (isActive) return { status: 'Live & Active', color: 'text-trading-green', indicator: 'bg-trading-green' }
    return { status: 'Connected', color: 'text-trading-blue', indicator: 'bg-trading-blue' }
  }

  const connectionQuality = getConnectionQuality()
  
  const formatDataAge = (age: number) => {
    if (age < 1000) return 'Now'
    if (age < 60000) return `${Math.floor(age / 1000)}s ago`
    return `${Math.floor(age / 60000)}m ago`
  }

  return (
    <div className="flex items-center space-x-4 bg-gray-800/50 px-4 py-3 rounded-lg border border-gray-700/50">
      {/* Connection Indicator */}
      <div className="flex items-center space-x-2">
        <div 
          className={`w-3 h-3 rounded-full ${connectionQuality.indicator} ${
            isConnected && isActive ? 'animate-pulse' : ''
          } shadow-lg`}
          style={{
            boxShadow: isConnected ? `0 0 10px ${connectionQuality.indicator.includes('green') ? '#10b981' : connectionQuality.indicator.includes('blue') ? '#3b82f6' : connectionQuality.indicator.includes('yellow') ? '#f59e0b' : connectionQuality.indicator.includes('orange') ? '#f97316' : '#ef4444'}40` : 'none'
          }}
        ></div>
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${connectionQuality.color}`}>
            {connectionQuality.status}
          </span>
          {isConnected && (
            <span className="text-xs text-gray-400">
              NinjaTrader Strategy
            </span>
          )}
        </div>
      </div>

      {/* Data Freshness Indicator */}
      {isConnected && (
        <div className="flex flex-col items-end text-right">
          <span className="text-xs text-gray-300">
            Last Update
          </span>
          <span className={`text-xs font-mono ${
            dataAge > 60000 ? 'text-red-400' : 
            dataAge > 30000 ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {formatDataAge(dataAge)}
          </span>
        </div>
      )}

      {/* Status Icons */}
      <div className="flex items-center space-x-1">
        {isConnected ? (
          <>
            {isActive && <span className="text-xs">🔴</span>}
            <span className="text-xs">📡</span>
          </>
        ) : (
          <span className="text-xs">❌</span>
        )}
      </div>
    </div>
  )
})
