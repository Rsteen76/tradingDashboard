import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface MLInsightsPanelProps {
  data?: {
    // primary fields
    ml_confidence_level?: number
    ml_long_probability?: number
    ml_short_probability?: number
    // alternative naming in StrategyStatus
    signal_probability_long?: number
    signal_probability_short?: number

    ml_volatility_prediction?: number
    market_regime?: string
    rsi?: number
    atr?: number
    ema_alignment_score?: number
    htf_bias?: string
    overall_signal_strength?: number
    confidence?: number
    ml_confidence?: number
  }
}

const MLInsightsPanel: React.FC<MLInsightsPanelProps> = ({ data = {} }) => {
  // helper to normalize values possibly given as 0-1 or 0-100
  const normalize = (v?: number) => {
    if (v === undefined) return 0
    return v > 1 ? v / 100 : v
  }

  // Compute probabilities (0-1 scale)
  const longProb = normalize(
    data.ml_long_probability ?? data.long_probability ?? data.signal_probability_long
  )
  const shortProb = normalize(
    data.ml_short_probability ?? data.short_probability ?? data.signal_probability_short
  )

  // Confidence
  let mlConf = normalize(data.ml_confidence_level ?? data.ml_confidence ?? data.confidence)
  if (mlConf === 0) {
    // fallback: use stronger of two probs
    mlConf = Math.max(longProb, shortProb)
  }

  // Format confidence level with color
  const getConfidenceColor = (levelPct: number) => {
    const level = levelPct * 100
    if (level >= 80) return 'text-emerald-400'
    if (level >= 60) return 'text-blue-400'
    if (level >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Format probability with color (prob 0-1)
  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.8) return 'text-emerald-400'
    if (prob >= 0.6) return 'text-blue-400'
    if (prob >= 0.4) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">ML Insights</h2>
        <Badge variant="outline" className={data.market_regime === 'TRENDING' ? 'bg-blue-500/20' : 'bg-purple-500/20'}>
          {data.market_regime || 'UNKNOWN'}
        </Badge>
      </div>

      {/* Confidence and Signal Strength */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-gray-400">ML Confidence</div>
          <div className={`text-2xl font-bold ${getConfidenceColor(mlConf)}`}>
            {(mlConf * 100).toFixed(1)}%
          </div>
          <Progress value={mlConf * 100} className="h-1" />
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Signal Strength</div>
          <div className={`text-2xl font-bold ${getConfidenceColor(normalize(data.overall_signal_strength))}`}>
            {(normalize(data.overall_signal_strength) * 100).toFixed(1)}%
          </div>
          <Progress value={normalize(data.overall_signal_strength) * 100} className="h-1" />
        </div>
      </div>

      {/* Directional Probabilities */}
      <div className="space-y-4 mt-6">
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Long Probability</div>
          <div className="flex items-center justify-between">
            <div className={`text-lg font-semibold ${getProbabilityColor(longProb)}`}>
              {(longProb * 100).toFixed(1)}%
            </div>
            <Progress value={longProb * 100} className="w-2/3 h-1" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Short Probability</div>
          <div className="flex items-center justify-between">
            <div className={`text-lg font-semibold ${getProbabilityColor(shortProb)}`}>
              {(shortProb * 100).toFixed(1)}%
            </div>
            <Progress value={shortProb * 100} className="w-2/3 h-1" />
          </div>
        </div>
      </div>

      {/* Market Context */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <div className="text-sm text-gray-400">HTF Bias</div>
          <div className="text-lg font-semibold">
            {data.htf_bias || '--'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400">EMA Alignment</div>
          <div className="text-lg font-semibold">
            {data.ema_alignment_score?.toFixed(1) || '--'}
          </div>
        </div>
      </div>

      {/* Volatility Prediction */}
      <div className="mt-6">
        <div className="text-sm text-gray-400">Volatility Prediction</div>
        <div className="flex items-center space-x-2">
          <div className="text-lg font-semibold">
            {data.ml_volatility_prediction?.toFixed(2) || '--'}
          </div>
          <Badge variant="outline" className="bg-blue-500/20">
            ATR: {data.atr?.toFixed(2) || '--'}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export default MLInsightsPanel 