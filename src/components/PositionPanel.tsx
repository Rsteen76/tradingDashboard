import { useMemo, memo } from 'react'

interface PositionPanelProps {
  data: any
  contractSpecs?: {
    tickSize: number
    tickValue: number
    pointValue: number
    displayName: string
  }
}

export default memo(function PositionPanel({ data, contractSpecs }: PositionPanelProps) {
  // Memoize all position calculations
  const positionData = useMemo(() => {
    const position = data?.position || 'FLAT'
    const positionSize = data?.position_size || 0
    const pnl = data?.pnl || 0
    const entryPrice = data?.entry_price || 0
    const currentPrice = data?.price || 0
    const stopLoss = data?.stop_loss || 0
    const targetPrice = data?.target_price || 0
    
    // Calculate position value and risk/reward with contract multiplier
    const positionValue = positionSize * currentPrice
    const pointValue = contractSpecs?.pointValue || 50 // Default to ES
    
    const riskAmount = entryPrice && stopLoss ? 
      Math.abs(entryPrice - stopLoss) * positionSize * pointValue : 0
    const rewardAmount = entryPrice && targetPrice ? 
      Math.abs(targetPrice - entryPrice) * positionSize * pointValue : 0
    
    // Position display logic
    const isDisconnected = position.toLowerCase().includes('disconnected')
    const isLong = position.toLowerCase().includes('long')
    const isShort = position.toLowerCase().includes('short')
    
    let positionColor = 'text-gray-400'
    let positionDisplay = '⏸️ FLAT'
    
    if (isDisconnected) {
      positionColor = 'text-gray-500'
      positionDisplay = '🔌 DISCONNECTED'
    } else if (isLong) {
      positionColor = 'text-trading-green'
      positionDisplay = '📈 LONG'
    } else if (isShort) {
      positionColor = 'text-trading-red'
      positionDisplay = '📉 SHORT'
    }
    
    return {
      position,
      positionSize,
      pnl,
      entryPrice,
      currentPrice,
      stopLoss,
      targetPrice,
      positionValue,
      riskAmount,
      rewardAmount,
      isDisconnected,
      positionColor,
      positionDisplay,
      formattedPnl: pnl.toFixed(2),
      formattedPositionValue: positionValue.toFixed(2),
      formattedEntryPrice: entryPrice.toFixed(2),
      formattedCurrentPrice: currentPrice.toFixed(2),
      formattedStopLoss: stopLoss.toFixed(2),
      formattedTargetPrice: targetPrice.toFixed(2),
      formattedRiskAmount: riskAmount.toFixed(2),
      formattedRewardAmount: rewardAmount.toFixed(2)
    }
  }, [
    data?.position,
    data?.position_size,
    data?.pnl,
    data?.entry_price,
    data?.price,
    data?.stop_loss,
    data?.target_price
  ])
  
  return (
    <div className="trading-card p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-purple-400">💼 Position</h2>
        {contractSpecs && (
          <div className="text-xs text-gray-400">
            {contractSpecs.displayName} • ${contractSpecs.pointValue}/pt
          </div>
        )}
      </div>
      
      <div className="space-y-4">        <div className="text-center">
          <div className="text-sm text-gray-400 mb-2">Current Position</div>
          <div className={`text-2xl font-bold ${positionData.positionColor}`}>
            {positionData.positionDisplay}
            {positionData.positionSize > 0 && !positionData.isDisconnected && (
              <span className="text-sm ml-2 text-gray-300">({positionData.positionSize})</span>
            )}
          </div>
        </div>
        
        {positionData.positionSize > 0 && (
          <div className="text-center">
            <div className="text-sm text-gray-400">Position Value</div>
            <div className="text-lg font-bold text-white">
              ${positionData.formattedPositionValue}
            </div>
          </div>
        )}
        
        <div className="border-t border-gray-700 pt-4">
          <div className="text-sm text-gray-400 mb-2">Unrealized P&L</div>
          <div className={`text-xl font-bold font-mono ${
            positionData.pnl >= 0 ? 'text-trading-green' : 'text-trading-red'
          }`}>
            ${positionData.pnl >= 0 ? '+' : ''}${positionData.formattedPnl}
          </div>
        </div>        
        {positionData.entryPrice > 0 && (
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Entry Price:</span>
              <span className="text-white font-mono">${positionData.formattedEntryPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Price:</span>
              <span className="text-white font-mono">${positionData.formattedCurrentPrice}</span>
            </div>
            {positionData.stopLoss > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Stop Loss:</span>
                <span className="text-red-400 font-mono">${positionData.formattedStopLoss}</span>
              </div>
            )}
            {positionData.targetPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Target:</span>
                <span className="text-green-400 font-mono">${positionData.formattedTargetPrice}</span>
              </div>
            )}
          </div>
        )}
        
        {(positionData.riskAmount > 0 || positionData.rewardAmount > 0) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-gray-800 rounded">
              <div className="text-gray-400">Risk</div>
              <div className="font-bold text-orange-400">${positionData.formattedRiskAmount}</div>
            </div>
            <div className="text-center p-2 bg-gray-800 rounded">
              <div className="text-gray-400">Reward</div>
              <div className="font-bold text-trading-green">${positionData.formattedRewardAmount}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
