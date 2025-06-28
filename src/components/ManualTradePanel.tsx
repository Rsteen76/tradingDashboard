import React, { useState, useEffect } from 'react'
import Toast from '@/components/Toast'

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
  const [qty, setQty] = useState(1)
  const [stopPoints, setStopPoints] = useState(8) // Default: 8 points stop loss
  const [targetPoints, setTargetPoints] = useState(12) // Default: 12 points target (1.5:1 ratio)
  const [useStopsTargets, setUseStopsTargets] = useState(true)
  const [useAIOptimization, setUseAIOptimization] = useState(true) // NEW: AI optimization toggle
  const [currentPrice, setCurrentPrice] = useState(21900)
  const [toast, setToast] = useState<string | null>(null)
  const [aiOptimization, setAiOptimization] = useState<any>(null) // NEW: Store AI recommendations
  const [marketRegime, setMarketRegime] = useState<string>('Unknown') // NEW: Market regime display
  const [aiConfidence, setAiConfidence] = useState<number>(0) // NEW: AI confidence level

  // NEW: Request AI optimization for stops/targets
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
        
        // Update stop/target with AI recommendations if available
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
      let aiOptimizationData = null
      
      // Get AI optimization if enabled
      if (useAIOptimization) {
        setToast(`🤖 Requesting AI optimization for ${direction} trade...`)
        aiOptimizationData = await requestAIOptimization(direction)
      }

      // Calculate stop and target prices
      let stopPrice = 0
      let targetPrice = 0
      
      if (useStopsTargets) {
        if (direction === 'long') {
          stopPrice = currentPrice - stopPoints
          targetPrice = currentPrice + targetPoints
        } else {
          stopPrice = currentPrice + stopPoints  
          targetPrice = currentPrice - targetPoints
        }
      }

      const payload = {
        command: `go_${direction}`,
        quantity: qty,
        ...(useStopsTargets && {
          stop_price: stopPrice,
          target_price: targetPrice,
        }),
        reason: useAIOptimization && aiOptimizationData ? 
          `AI-Optimized Manual Trade (${marketRegime}, ${(aiConfidence * 100).toFixed(0)}% confidence)` : 
          'Manual Trade',
        use_ai_optimization: useAIOptimization,
        ...(aiOptimizationData && { ai_optimization_data: aiOptimizationData })
      }

      setToast(`📈 Executing ${direction.toUpperCase()} trade...`)
      
      const response = await onSend(payload)
      
      if (response?.success) {
        const optimizationText = useAIOptimization ? 
          ` (AI: ${marketRegime}, ${(aiConfidence * 100).toFixed(0)}% conf)` : ''
        setToast(`✅ ${direction.toUpperCase()} trade executed successfully${optimizationText}`)
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
    if (useAIOptimization && currentPrice > 0) {
      const timer = setTimeout(() => {
        requestAIOptimization('long') // Get baseline optimization
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentPrice, useAIOptimization])

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
      <div className="space-y-4">
        {/* AI Optimization Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useAI"
            checked={useAIOptimization}
            onChange={(e) => setUseAIOptimization(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="useAI" className="text-white text-sm">
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
          />
          <label htmlFor="useStops" className="text-white text-sm">
            🛡️ Use Stop Loss & Targets {useAIOptimization ? '(AI Optimized)' : ''}
          </label>
        </div>

        {useStopsTargets && (
          <div className="ml-6 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm w-24">Stop (pts):</label>
              <input
                type="number"
                value={stopPoints}
                onChange={(e) => setStopPoints(parseFloat(e.target.value) || 0)}
                className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-20 disabled:opacity-50"
                step="0.25"
                disabled={useAIOptimization} // Disabled when AI is optimizing
              />
              <span className="text-slate-400 text-xs">
                = {currentPrice > 0 ? `${(currentPrice - stopPoints).toFixed(2)}` : '0.00'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-white text-sm w-24">Target (pts):</label>
              <input
                type="number"
                value={targetPoints}
                onChange={(e) => setTargetPoints(parseFloat(e.target.value) || 0)}
                className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 w-20 disabled:opacity-50"
                step="0.25"
                disabled={useAIOptimization} // Disabled when AI is optimizing
              />
              <span className="text-slate-400 text-xs">
                = {currentPrice > 0 ? `${(currentPrice + targetPoints).toFixed(2)}` : '0.00'}
              </span>
            </div>

                     {/* AI Optimization Display */}
         {useAIOptimization && aiOptimization && (
           <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/30 text-xs">
             <div className="text-purple-300 font-semibold mb-1">🤖 AI Recommendations:</div>
             <div className="text-slate-300 space-y-0.5">
               <div>• Market: {marketRegime} ({(aiConfidence * 100).toFixed(0)}% confidence)</div>
               {aiOptimization.reasoning && (
                 <div>• {aiOptimization.reasoning}</div>
               )}
               <div>• Risk/Reward: {targetPoints}:{stopPoints} = {(targetPoints/stopPoints).toFixed(1)}:1</div>
             </div>
           </div>
         )}
          </div>
        )}

        {/* Trade Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => executeTrade('long')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold flex-1 transition-colors"
          >
            📈 BUY {useAIOptimization ? '(AI)' : ''}
          </button>
          <button
            onClick={() => executeTrade('short')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex-1 transition-colors"
          >
            📉 SELL {useAIOptimization ? '(AI)' : ''}
          </button>
        </div>

                 {/* Smart Trailing Info */}
         <div className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
           💡 <strong>Smart Trailing:</strong> Once trade is active, the C# strategy will automatically use AI-driven trailing stops based on market conditions.
         </div>

        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  )
}

export default ManualTradePanel 