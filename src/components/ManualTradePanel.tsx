import React, { useState, useEffect } from 'react'
import Toast from '@/components/Toast'
import { useSocket } from '@/hooks/useSocket'

interface ManualTradePanelProps {
  onSend: (payload: { 
    command: string; 
    quantity?: number; 
    stop_price?: number; 
    target_price?: number; 
    reason?: string;
    use_ai_optimization?: boolean;
  }) => Promise<any>
}

const ManualTradePanel: React.FC<ManualTradePanelProps> = ({ onSend }) => {
  const { strategyData } = useSocket()
  const [qty, setQty] = useState(1)
  const [stopPoints, setStopPoints] = useState(8)
  const [targetPoints, setTargetPoints] = useState(12)
  const [useStopsTargets, setUseStopsTargets] = useState(true)
  const [useAIOptimization, setUseAIOptimization] = useState(true)
  const [currentPrice, setCurrentPrice] = useState(21900)
  const [toast, setToast] = useState<string | null>(null)
  const [aiOptimization, setAiOptimization] = useState<any>(null)
  const [marketRegime, setMarketRegime] = useState<string>('Unknown')
  const [aiConfidence, setAiConfidence] = useState<number>(0)

  // Get current position state
  const position = strategyData?.strategyStatus?.position || 'Flat'
  const isInPosition = position !== 'Flat'
  const isLong = position.toLowerCase().includes('long')
  const isShort = position.toLowerCase().includes('short')

  // Request AI optimization for stops/targets
  const requestAIOptimization = async (direction: 'long' | 'short') => {
    try {
      if (!useAIOptimization) return null

      const response = await fetch('http://localhost:3001/api/ai-optimize-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          quantity: qty,
          current_price: currentPrice,
          request_type: 'stop_target_optimization'
        })
      })

      if (response.ok) {
        const optimization = await response.json()
        setAiOptimization(optimization)
        setMarketRegime(optimization.market_regime || 'Unknown')
        setAiConfidence(optimization.confidence || 0)
        
        if (optimization.optimal_stop_points) {
          setStopPoints(optimization.optimal_stop_points)
        }
        if (optimization.optimal_target_points) {
          setTargetPoints(optimization.optimal_target_points)
        }
        
        return optimization
      }
    } catch (error) {
      console.warn('AI optimization request failed:', error)
    }
    return null
  }

  // Enhanced trade execution with AI optimization
  const executeTrade = async (direction: 'long' | 'short') => {
    try {
      // Don't allow new trades if already in position
      if (isInPosition && direction !== 'close') {
        setToast('❌ Cannot enter new position while in existing position')
        return
      }

      let aiOptimizationData = null
      
      // Get AI optimization if enabled and not closing
      if (useAIOptimization && direction !== 'close') {
        setToast(`🤖 Requesting AI optimization for ${direction} trade...`)
        aiOptimizationData = await requestAIOptimization(direction)
      }

      // Calculate stop and target prices
      let stopPrice = 0
      let targetPrice = 0
      
      if (useStopsTargets && direction !== 'close') {
        if (direction === 'long') {
          stopPrice = currentPrice - stopPoints
          targetPrice = currentPrice + targetPoints
        } else {
          stopPrice = currentPrice + stopPoints  
          targetPrice = currentPrice - targetPoints
        }
      }

      const payload = {
        command: direction === 'close' ? 'close_position' : `go_${direction}`,
        quantity: qty,
        ...(useStopsTargets && direction !== 'close' && {
          stop_price: stopPrice,
          target_price: targetPrice,
        }),
        reason: useAIOptimization && aiOptimizationData ? 
          `AI-Optimized Manual Trade (${marketRegime}, ${(aiConfidence * 100).toFixed(0)}% confidence)` : 
          'Manual Trade',
        use_ai_optimization: useAIOptimization,
        ...(aiOptimizationData && { ai_optimization_data: aiOptimizationData })
      }

      setToast(`📈 ${direction === 'close' ? 'Closing' : 'Executing'} ${direction.toUpperCase()} trade...`)
      
      const response = await onSend(payload)
      
      if (response?.success) {
        const optimizationText = useAIOptimization && direction !== 'close' ? 
          ` (AI: ${marketRegime}, ${(aiConfidence * 100).toFixed(0)}% conf)` : ''
        setToast(`✅ ${direction === 'close' ? 'Position closed' : direction.toUpperCase() + ' trade executed'} successfully${optimizationText}`)
      } else {
        setToast(`❌ Trade failed: ${response?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Trade execution error:', error)
      setToast(`❌ Trade execution failed: ${error.message}`)
    }
  }

  // Auto-request AI optimization when direction or price changes
  useEffect(() => {
    if (useAIOptimization && currentPrice > 0 && !isInPosition) {
      const timer = setTimeout(() => {
        requestAIOptimization('long')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentPrice, useAIOptimization, isInPosition])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-2">🤖 AI Manual Trading</h3>
        {useAIOptimization && (
          <div className="text-sm text-slate-400">
            AI Mode: {marketRegime} | Confidence: {(aiConfidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Position Status */}
      {isInPosition && (
        <div className={`mb-4 p-3 rounded-lg ${
          isLong ? 'bg-green-500/10 border border-green-500/30' :
          'bg-red-500/10 border border-red-500/30'
        }`}>
          <div className="text-sm font-medium mb-1">
            Current Position: {position}
          </div>
          <div className="text-xs text-slate-400">
            Entry: {strategyData?.strategyStatus?.entry_price?.toFixed(2) || '--'}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* AI Optimization Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useAI"
            checked={useAIOptimization}
            onChange={(e) => setUseAIOptimization(e.target.checked)}
            className="rounded"
            disabled={isInPosition}
          />
          <label htmlFor="useAI" className={`text-sm ${isInPosition ? 'text-slate-500' : 'text-white'}`}>
            🧠 Use AI/ML Optimization for Stops & Targets
          </label>
        </div>

        {/* Quantity */}
        <div className="flex items-center gap-2">
          <label className="text-white text-sm w-20">Quantity:</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-20"
            min="1"
            disabled={isInPosition}
          />
        </div>

        {/* Current Price */}
        <div className="flex items-center gap-2">
          <label className="text-white text-sm w-20">Price:</label>
          <input
            type="number"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
            className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-32"
            step="0.25"
            disabled={isInPosition}
          />
        </div>

        {/* Stop Loss & Targets */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useStops"
            checked={useStopsTargets}
            onChange={(e) => setUseStopsTargets(e.target.checked)}
            className="rounded"
            disabled={isInPosition}
          />
          <label htmlFor="useStops" className={`text-sm ${isInPosition ? 'text-slate-500' : 'text-white'}`}>
            🛡️ Use Stop Loss & Targets {useAIOptimization ? '(AI Optimized)' : ''}
          </label>
        </div>

        {useStopsTargets && !isInPosition && (
          <div className="ml-6 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm w-24">Stop (pts):</label>
              <input
                type="number"
                value={stopPoints}
                onChange={(e) => setStopPoints(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-20"
                min="1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-white text-sm w-24">Target (pts):</label>
              <input
                type="number"
                value={targetPoints}
                onChange={(e) => setTargetPoints(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-20"
                min="1"
              />
            </div>
          </div>
        )}

        {/* Trade Buttons */}
        <div className="flex gap-2 pt-4">
          {isInPosition ? (
            // Show only close button when in position
            <button
              onClick={() => executeTrade('close')}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Close Position
            </button>
          ) : (
            // Show Long/Short buttons when flat
            <>
              <button
                onClick={() => executeTrade('long')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Long
              </button>
              <button
                onClick={() => executeTrade('short')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Short
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <Toast message={toast} type="info" onClose={() => setToast(null)} />
      )}
    </div>
  )
}

export default ManualTradePanel 