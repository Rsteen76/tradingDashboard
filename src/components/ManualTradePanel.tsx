import React, { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'

interface ManualTradePanelProps {
  onSend: (payload: { 
    command: string; 
    quantity?: number; 
    stop_price?: number; 
    target_price?: number; 
    instrument?: string;
    use_ai_optimization?: boolean;
    reason?: string;
  }) => void;
  instrument: string;
}

const ManualTradePanel: React.FC<ManualTradePanelProps> = ({ onSend, instrument }) => {
  const { strategyData } = useSocket()
  const [qty, setQty] = useState(1)
  const [useAIOptimization, setUseAIOptimization] = useState(true)
  const [pendingTrade, setPendingTrade] = useState<any>(null)
  const [lastTradeResult, setLastTradeResult] = useState<any>(null)

  const position = strategyData?.strategyStatus?.position || 'Flat'
  const isInPosition = position !== 'Flat'

  // Listen for real-time trade updates
  useEffect(() => {
    if (strategyData?.pending_trade) {
      setPendingTrade(strategyData.pending_trade)
      // Clear pending after 3 seconds if no update
      setTimeout(() => setPendingTrade(null), 3000)
    }
    
    if (strategyData?.trade_status === 'PENDING_EXECUTION') {
      setPendingTrade({
        status: 'PENDING_EXECUTION',
        action: strategyData?.position,
        timestamp: strategyData?.timestamp
      })
    }
  }, [strategyData])

  const handleTrade = (command: 'go_long' | 'go_short' | 'close_position') => {
    // Set pending state immediately for UI feedback
    setPendingTrade({
      status: 'SUBMITTING',
      action: command.replace('go_', '').toUpperCase(),
      timestamp: new Date().toISOString()
    })
    
    onSend({
      command,
      quantity: qty,
      instrument,
      use_ai_optimization: useAIOptimization,
      reason: 'Manual Trade from Dashboard'
    })
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">Manual Trade</h3>
      </div>

      {/* Pending Trade Indicator */}
      {pendingTrade && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
            <div className="text-sm font-medium text-yellow-400">
              {pendingTrade.status === 'SUBMITTING' ? 'Submitting Trade...' :
               pendingTrade.status === 'PENDING_EXECUTION' ? `${pendingTrade.action} - Executing...` :
               'Processing Trade...'}
            </div>
          </div>
          {pendingTrade.entry_price && (
            <div className="text-xs text-yellow-300 mt-1">
              Entry: {pendingTrade.entry_price} | Stop: {pendingTrade.stop_loss} | Target: {pendingTrade.take_profit}
            </div>
          )}
        </div>
      )}

      {/* Current Position */}
      {isInPosition && !pendingTrade && (
        <div className={`mb-4 p-3 rounded-lg ${
          position.toLowerCase().includes('long') ? 'bg-green-500/10 border border-green-500/30' :
          'bg-red-500/10 border border-red-500/30'
        }`}>
          <div className="text-sm font-medium">
            In Position: {position}
          </div>
          {strategyData?.avg_price && (
            <div className="text-xs text-slate-400 mt-1">
              Entry: {strategyData.avg_price} | Stop: {strategyData.current_smart_stop}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="text-white text-sm w-20">Quantity:</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-full"
            min="1"
            disabled={isInPosition || !!pendingTrade}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useAI"
            checked={useAIOptimization}
            onChange={(e) => setUseAIOptimization(e.target.checked)}
            className="rounded"
            disabled={isInPosition || !!pendingTrade}
          />
          <label htmlFor="useAI" className={`text-sm ${(isInPosition || !!pendingTrade) ? 'text-slate-500' : 'text-white'}`}>
            Use AI Optimization
          </label>
        </div>

        {!isInPosition ? (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => handleTrade('go_long')}
              disabled={!!pendingTrade}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${
                pendingTrade 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {pendingTrade && pendingTrade.action === 'LONG' ? 'EXECUTING...' : 'BUY / LONG'}
            </button>
            <button
              onClick={() => handleTrade('go_short')}
              disabled={!!pendingTrade}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${
                pendingTrade 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {pendingTrade && pendingTrade.action === 'SHORT' ? 'EXECUTING...' : 'SELL / SHORT'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleTrade('close_position')}
            disabled={!!pendingTrade}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors mt-2 ${
              pendingTrade 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-600 hover:bg-slate-500 text-white'
            }`}
          >
            {pendingTrade ? 'EXECUTING...' : 'CLOSE POSITION'}
          </button>
        )}
      </div>
    </div>
  )
}

export default ManualTradePanel 