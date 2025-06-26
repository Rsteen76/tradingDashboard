'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import ConnectionStatus from '@/components/ConnectionStatus'
import Toast from '@/components/Toast'
import MLPanel from '@/components/MLPanel'
import SignalPanel from '@/components/SignalPanel'
import LearningPanel from '@/components/LearningPanel'
import UpcomingTradesPanel from '@/components/UpcomingTradesPanel'
import AIIntelligencePanel from '@/components/AIIntelligencePanel'
import SmartTrailingPanel from '@/components/SmartTrailingPanel'
import { TradingErrorBoundary } from '@/components/ErrorBoundary'
import TradeDecisionPanel from '@/components/TradeDecisionPanel'
import LiveChart from '@/components/LiveChart'
import PositionPanel from '@/components/PositionPanel'
import RiskManagementPanel from '@/components/RiskManagementPanel'
import TradingVisualizer from '@/components/TradingVisualizer'
import { Card } from '@/components/ui/card'
import MLInsightsPanel from '@/components/MLInsightsPanel'
import MarketAnalysisPanel from '@/components/MarketAnalysisPanel'
import PerformanceMetrics from '@/components/PerformanceMetrics'
import { useSocket } from '@/hooks/useSocket'
import { useDataValidation } from '@/hooks/useDataValidation'
import TradeHistoryPanel from '@/components/TradeHistoryPanel'
import SettingsPanel from '@/components/SettingsPanel'
import ManualTradePanel from '@/components/ManualTradePanel'

// Custom hook for smooth data transitions
function useSmoothedData<T>(data: T, delay: number = 75): T {
  const [smoothedData, setSmoothedData] = useState<T>(data)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSmoothedData(data)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [data, delay])
  
  return smoothedData
}

// Custom hook for debounced updates
function useDebouncedValue<T>(value: T, delay: number = 100): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}

export default function Dashboard() {
  const { strategyData, marketDataHistory, tradeHistory, mlPrediction, connectionState, updateServerSettings, sendManualTrade } = useSocket()
  const { isValid, errors } = useDataValidation(strategyData)
  
  // Use smoothed data for UI updates
  const smoothedData = useSmoothedData(strategyData, 75)
  
  // Debounce ML data to prevent rapid updates
  const debouncedMLData = useDebouncedValue(smoothedData, 100)

  // Derive Trade Signal Panel data
  const signalPanelData = useMemo(() => {
    const s = smoothedData.strategyStatus ?? {}
    const m = smoothedData.marketData ?? {}

    // Determine signal direction based on probabilities
    let signal_direction: 'long' | 'short' | 'flat' = 'flat'
    if (
      typeof s.signal_probability_long === 'number' &&
      typeof s.signal_probability_short === 'number'
    ) {
      if (s.signal_probability_long > s.signal_probability_short && s.signal_probability_long > 0.5) {
        signal_direction = 'long'
      } else if (s.signal_probability_short > s.signal_probability_long && s.signal_probability_short > 0.5) {
        signal_direction = 'short'
      }
    }

    const entry_price =
      signal_direction === 'long'
        ? s.next_long_entry_level ?? s.entry_price
        : signal_direction === 'short'
        ? s.next_short_entry_level ?? s.entry_price
        : undefined

    const stop_loss =
      signal_direction === 'long' ? s.stop_level_long : signal_direction === 'short' ? s.stop_level_short : undefined

    // Prefer target1, fallback to target2 if defined
    const take_profit = s.target1 ?? s.target2

    let risk_reward_ratio: number | undefined = undefined
    if (
      typeof entry_price === 'number' &&
      typeof stop_loss === 'number' &&
      typeof take_profit === 'number'
    ) {
      const risk = Math.abs(entry_price - stop_loss)
      const reward = Math.abs(take_profit - entry_price)
      if (risk > 0) risk_reward_ratio = reward / risk
    }

    const current_price = m.price ?? s.current_price

    // Basic volatility proxy: ATR / price
    const volatility =
      typeof m.atr === 'number' && typeof current_price === 'number' && current_price > 0
        ? m.atr / current_price
        : undefined

    const trend_alignment = typeof s.ema_alignment_score === 'number' ? Math.min(1, s.ema_alignment_score / 5) : undefined

    const momentum_score =
      signal_direction === 'long'
        ? s.signal_probability_long
        : signal_direction === 'short'
        ? s.signal_probability_short
        : undefined

    const reasons: string[] = []

    // If trading disabled by risk management
    if (smoothedData.riskManagement?.trading_disabled) {
      reasons.push('Trading disabled by risk management')
    }

    // If already in a trade
    if (s.position && s.position.toLowerCase() !== 'flat' && s.position_size > 0) {
      reasons.push(`Currently in an open ${s.position} position (size ${s.position_size})`)
    }

    // Thresholds
    const strengthThreshold = 50
    const confidenceThreshold = 0.6 // 60%

    if (typeof s.overall_signal_strength === 'number' && s.overall_signal_strength < strengthThreshold) {
      reasons.push(`Signal strength (${s.overall_signal_strength.toFixed(1)}%) below threshold (${strengthThreshold}%)`)
    }

    const bestProb = Math.max(s.signal_probability_long ?? 0, s.signal_probability_short ?? 0)
    if (bestProb < confidenceThreshold) {
      reasons.push(`Model confidence too low (${(bestProb * 100).toFixed(1)}% < ${(confidenceThreshold * 100).toFixed(0)}%)`)
    }

    // Volatility check if ATR is high relative to price ( >2%)
    if (
      typeof m.atr === 'number' &&
      typeof current_price === 'number' &&
      current_price > 0 &&
      m.atr / current_price > 0.02
    ) {
      reasons.push('Market volatility too high')
    }

    // Daily risk check
    if (
      smoothedData.riskManagement?.daily_loss !== undefined &&
      smoothedData.riskManagement?.max_daily_loss !== undefined &&
      smoothedData.riskManagement.daily_loss > smoothedData.riskManagement.max_daily_loss
    ) {
      reasons.push('Daily loss limit exceeded')
    }

    // Build final object
    return {
      // Signal Data
      signal_type: 'entry', // Simplified assumption
      signal_direction,
      signal_strength: s.overall_signal_strength,
      signal_quality: s.overall_signal_strength, // using same metric for now
      signal_timeframe: 'Realtime',

      // Entry/Exit Points
      entry_price,
      stop_loss,
      take_profit,
      risk_reward_ratio,
      position_size: s.position_size,

      // Market Context
      current_price,
      recent_high: m.recent_high,
      recent_low: m.recent_low,
      atr: m.atr,
      volatility,

      // Signal Components
      trend_alignment,
      momentum_score,
      reversal_probability: undefined,
      breakout_strength: undefined,
      support_resistance_proximity: undefined,

      // No trade reasons
      no_trade_reasons: reasons,
    }
  }, [smoothedData])

  return (
    <div className="min-h-screen bg-gradient-to-b from-trading-dark to-trading-darker text-white">
      <div className="max-w-[2000px] mx-auto p-4 space-y-4">
        {/* Header with Connection Status */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-trading-green via-trading-blue to-purple-500">
            AI Trading Dashboard
          </h1>
          <ConnectionStatus 
            isConnected={connectionState.isConnected} 
            latency={connectionState.latency}
          />
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Trading View & Controls */}
          <div className="col-span-8 space-y-4">
            <TradingErrorBoundary>
              <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                <LiveChart data={marketDataHistory} />
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                  <PositionPanel 
                    position={smoothedData.strategyStatus?.position}
                    positionSize={smoothedData.strategyStatus?.position_size}
                    entryPrice={smoothedData.strategyStatus?.entry_price}
                    unrealizedPnl={smoothedData.strategyStatus?.unrealized_pnl}
                    currentPrice={smoothedData.marketData?.price}
                  />
                </Card>

                <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                  <SmartTrailingPanel
                    enabled={smoothedData.strategyStatus?.smart_trailing_enabled}
                    active={smoothedData.strategyStatus?.smart_trailing_active}
                    currentStop={smoothedData.strategyStatus?.current_smart_stop}
                    algorithm={smoothedData.strategyStatus?.active_trailing_algorithm}
                    confidence={smoothedData.strategyStatus?.trailing_confidence_threshold}
                  />
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                  <SignalPanel
                    data={signalPanelData}
                  />
                </Card>

                <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                  <TradeDecisionPanel data={debouncedMLData.strategyStatus} />
                </Card>
              </div>
            </TradingErrorBoundary>
          </div>

          {/* Right Column - Risk & ML Analysis */}
          <div className="col-span-4 space-y-4">
            <TradingErrorBoundary>
              <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                <RiskManagementPanel
                  riskData={smoothedData.riskManagement}
                  position={smoothedData.strategyStatus?.position}
                  unrealizedPnl={smoothedData.strategyStatus?.unrealized_pnl}
                />
              </Card>

              <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                <MLInsightsPanel data={{ ...smoothedData.marketData, ...debouncedMLData.strategyStatus, ...mlPrediction }} />
              </Card>

              <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
                <MarketAnalysisPanel data={{ ...smoothedData.strategyStatus, ...smoothedData.marketData }} />
              </Card>

              <TradeHistoryPanel trades={tradeHistory} />

              <SettingsPanel onSave={updateServerSettings} />

              <ManualTradePanel onSend={sendManualTrade} />
            </TradingErrorBoundary>
          </div>
        </div>

        {/* Footer - Performance Metrics */}
        <div className="mt-4">
          <Card className="p-4 bg-trading-card/30 backdrop-blur-sm">
            <PerformanceMetrics
              lastTrade={smoothedData.lastTrade}
              riskManagement={smoothedData.riskManagement}
            />
          </Card>
        </div>

        {/* Error Handling */}
        {!isValid && errors.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <Toast
              type="error"
              message={errors.join('; ')}
              onClose={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  )
}
