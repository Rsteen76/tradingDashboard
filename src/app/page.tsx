'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Zap, Brain, Target, Shield, Activity, DollarSign, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Minus, Settings as SettingsIcon } from 'lucide-react'
import { useSocket, RiskManagement, StrategyStatus, MarketData } from '@/hooks/useSocket'
import SettingsPanel, { Settings } from '@/components/SettingsPanel'
import Toast from '@/components/Toast'
import TradeDecisionPanel from '@/components/TradeDecisionPanel'
import EnhancedPerformancePanel from '@/components/EnhancedPerformancePanel'
import TradeOutcomePanel from '@/components/TradeOutcomePanel'



const TradingDashboard = () => {
  const { strategyData, marketDataHistory, tradeHistory, mlPrediction, connectionState, updateServerSettings, getCurrentSettings, sendManualTrade } = useSocket()
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m')
  const [showSettings, setShowSettings] = useState(false)
  const [tradeToast, setTradeToast] = useState<string | null>(null)

  // Initialize settings from strategyData if available, otherwise use defaults
  const [settings, setSettings] = useState<Settings>(() => ({
    minConfidence: strategyData?.riskManagement?.minConfidence ?? 0.6,
    strongConfidence: strategyData?.riskManagement?.strongConfidence ?? 0.8,
    minStrength: strategyData?.riskManagement?.minStrength ?? 0.2,
    autoTradingEnabled: strategyData?.riskManagement?.autoTradingEnabled ?? false,
    modelWeights: strategyData?.riskManagement?.ensembleWeights ?? {
      lstm: 0.3,
      transformer: 0.25,
      randomForest: 0.2,
      xgboost: 0.15,
      dqn: 0.1
    },
    trailingConfidenceThreshold: strategyData?.riskManagement?.trailingConfidenceThreshold ?? 0.6,
    trailingUpdateInterval: strategyData?.riskManagement?.trailingUpdateInterval ?? 15,
    maxStopMovementAtr: strategyData?.riskManagement?.maxStopMovementAtr ?? 2,
    minProfitTarget: strategyData?.riskManagement?.minProfitTarget ?? 25,
    maxPositionSize: strategyData?.riskManagement?.maxPositionSize ?? 100000,
    maxDailyRisk: strategyData?.riskManagement?.maxDailyRisk ?? 1000,
    volatilityAdjustment: strategyData?.riskManagement?.volatilityAdjustment ?? 0,
    patternConfidenceThreshold: strategyData?.riskManagement?.patternConfidenceThreshold ?? 0.7,
    regimeChangeThreshold: strategyData?.riskManagement?.regimeChangeThreshold ?? 0.8,
    momentumThreshold: strategyData?.riskManagement?.momentumThreshold ?? 0.6,
    breakoutStrength: strategyData?.riskManagement?.breakoutStrength ?? 0.7,
    clearDirectionThreshold: strategyData?.riskManagement?.clearDirectionThreshold ?? 0.6
  }))

  // Update settings when strategyData changes
  useEffect(() => {
    const riskManagement = strategyData?.riskManagement;
    if (!riskManagement) return;

    console.log('Received new risk management data:', riskManagement);
    setSettings(prev => ({
      ...prev,
      minConfidence: riskManagement.minConfidence ?? prev.minConfidence,
      strongConfidence: riskManagement.strongConfidence ?? prev.strongConfidence,
      minStrength: riskManagement.minStrength ?? prev.minStrength,
      autoTradingEnabled: riskManagement.autoTradingEnabled ?? prev.autoTradingEnabled,
      modelWeights: riskManagement.ensembleWeights ?? prev.modelWeights,
      trailingConfidenceThreshold: riskManagement.trailingConfidenceThreshold ?? prev.trailingConfidenceThreshold,
      trailingUpdateInterval: riskManagement.trailingUpdateInterval ?? prev.trailingUpdateInterval,
      maxStopMovementAtr: riskManagement.maxStopMovementAtr ?? prev.maxStopMovementAtr,
      minProfitTarget: riskManagement.minProfitTarget ?? prev.minProfitTarget,
      maxPositionSize: riskManagement.maxPositionSize ?? prev.maxPositionSize,
      maxDailyRisk: riskManagement.maxDailyRisk ?? prev.maxDailyRisk,
      volatilityAdjustment: riskManagement.volatilityAdjustment ?? prev.volatilityAdjustment,
      patternConfidenceThreshold: riskManagement.patternConfidenceThreshold ?? prev.patternConfidenceThreshold,
      regimeChangeThreshold: riskManagement.regimeChangeThreshold ?? prev.regimeChangeThreshold,
      momentumThreshold: riskManagement.momentumThreshold ?? prev.momentumThreshold,
      breakoutStrength: riskManagement.breakoutStrength ?? prev.breakoutStrength,
      clearDirectionThreshold: riskManagement.clearDirectionThreshold ?? prev.clearDirectionThreshold
    }));
  }, [strategyData?.riskManagement])

  // Handle settings update
  const handleSettingsUpdate = async (newSettings: Settings) => {
    console.log('Updating settings:', newSettings);
    setSettings(newSettings);
    await updateServerSettings(newSettings);
  }

  const executeTrade = async (payload: { command: string; quantity?: number; instrument?: string }) => {
    // Ensure instrument is included
    const enrichedPayload = {
      instrument,
      quantity: 1,
      ...payload,
    }
    try {
      const resp = await sendManualTrade(enrichedPayload) as any
      if (resp?.success) {
        setTradeToast('Trade command sent')
      } else {
        setTradeToast('Trade failed')
      }
    } catch (error) {
      setTradeToast('Trade failed')
    }
  }

  // Extract data with fallbacks
  const marketData = strategyData?.marketData as MarketData;
  const strategyStatus = strategyData?.strategyStatus as StrategyStatus;
  const riskManagement: RiskManagement = {
    ...strategyData?.riskManagement,
    minConfidence: settings.minConfidence,  // Use settings.minConfidence
    daily_loss: strategyData?.riskManagement?.daily_loss ?? 0,
    consecutive_losses: strategyData?.riskManagement?.consecutive_losses ?? 0,
    trading_disabled: strategyData?.riskManagement?.trading_disabled ?? false
  } as RiskManagement;
  const lastTrade = strategyData?.lastTrade ?? {};

  // Derived values with better fallbacks
  const position = strategyStatus?.position || 'Flat'
  const positionSize = strategyStatus?.position_size || 0
  const pnl = strategyStatus?.unrealized_pnl || 0
  const currentPrice = marketData?.price || strategyStatus?.current_price || 0
  const signalStrength = strategyStatus?.overall_signal_strength || strategyStatus?.signal_strength || 0
  const longProb = strategyStatus?.signal_probability_long || 0
  const shortProb = strategyStatus?.signal_probability_short || 0
  
  // ML Confidence with multiple fallbacks and proper normalization
  let mlConfidence = strategyStatus?.ml_confidence_level || strategyStatus?.ml_confidence || mlPrediction?.confidence || 0.5
  // If it's already a percentage (>1), keep as is, otherwise convert to percentage
  if (mlConfidence <= 1) {
    mlConfidence = mlConfidence * 100
  }
  
  const instrument = marketData?.instrument || strategyStatus?.instrument || 'ES'

  // Auto trading status - check multiple possible locations
  const autoTradingEnabled = riskManagement?.autoTradingEnabled ?? strategyStatus?.autoTradingEnabled ?? true

  // Get the actual execution threshold from server (default to 0.7 if not available)
  const execThreshold = (riskManagement?.minConfidence ?? 0.7) * 100 // Convert to percentage

  // Dynamic colors and status
  const getPositionColor = () => {
    if (position.toLowerCase().includes('long')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (position.toLowerCase().includes('short')) return 'text-red-400 bg-red-500/10 border-red-500/30'
    return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  }

  const getPnLColor = () => pnl >= 0 ? 'text-emerald-400' : 'text-red-400'

  const getSignalDirection = () => {
    if (longProb > shortProb && longProb > 60) return 'LONG'
    if (shortProb > longProb && shortProb > 60) return 'SHORT'
    return 'NEUTRAL'
  }

  const formatCurrency = (val: number) => {
    const formatted = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return val >= 0 ? `+$${formatted}` : `-$${formatted}`
  }

  // Risk Limits Section
  const dailyLossLimit = riskManagement?.maxDailyRisk ?? 0;
  const consecutiveLossesLimit = 3; // Default limit - using fixed value since maxConsecutiveLosses doesn't exist

  // Risk Limit Checks
  const isOverDailyLoss = (riskManagement?.daily_loss ?? 0) >= dailyLossLimit;
  const isOverConsecutiveLosses = (riskManagement?.consecutive_losses ?? 0) >= consecutiveLossesLimit;

  // Risk Limit Status
  const riskLimitStatus = {
    dailyLoss: {
      current: riskManagement?.daily_loss ?? 0,
      limit: riskManagement?.maxDailyRisk ?? 0,
      isOver: isOverDailyLoss
    },
    consecutiveLosses: {
      current: riskManagement?.consecutive_losses ?? 0,
      limit: consecutiveLossesLimit,
      isOver: isOverConsecutiveLosses
    }
  };

  // Show loading state if no data yet
  if (!currentPrice && !marketData?.price) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connecting to Trading Server</h2>
          <p className="text-slate-400">
            {connectionState.isConnected ? 'Loading market data...' : 'Establishing connection...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 animate-pulse"></div>
      
      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 backdrop-blur-xl bg-slate-950/80">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                  AI Trading Command Center
                </h1>
                <p className="text-slate-400 text-sm">Powered by Neural Networks & Deep Learning</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              connectionState.isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionState.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className={`text-sm font-medium ${
                connectionState.isConnected ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {connectionState.isConnected ? 'LIVE' : 'DISCONNECTED'}
              </span>
              {connectionState.latency > 0 && (
                <span className="text-xs text-slate-400">
                  {connectionState.latency}ms
                </span>
              )}
            </div>
            
            {/* Controls */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-5 gap-6">
          {/* Current Position */}
          <div className={`p-6 rounded-2xl border backdrop-blur-xl ${getPositionColor()}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {position.toLowerCase().includes('long') && <ArrowUpRight className="w-5 h-5" />}
                {position.toLowerCase().includes('short') && <ArrowDownRight className="w-5 h-5" />}
                {position === 'Flat' && <Minus className="w-5 h-5" />}
                <span className="text-sm font-medium opacity-80">POSITION</span>
              </div>
              <div className="text-xs opacity-60">{positionSize} contracts</div>
            </div>
            <div className="text-2xl font-bold">{position.toUpperCase()}</div>
            <div className="text-sm opacity-60 mt-1">Entry: {strategyStatus.entry_price?.toFixed(2) || '--'}</div>
          </div>

          {/* Current P&L */}
          <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-400">UNREALIZED P&L</span>
            </div>
            <div className={`text-3xl font-bold ${getPnLColor()}`}>
              {formatCurrency(pnl)}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {pnl >= 0 ? '+' : ''}{((pnl / 100000) * 100).toFixed(2)}%
            </div>
          </div>

          {/* Current Price */}
          <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-slate-400">{instrument.toUpperCase()} PRICE</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {currentPrice.toFixed(2)}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Vol: {marketData?.volume ? (marketData?.volume / 1000000).toFixed(1) + 'M' : '--'}
            </div>
          </div>

          {/* ML Confidence */}
          <div className="p-6 rounded-2xl border border-purple-500/30 backdrop-blur-xl bg-purple-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">ML CONFIDENCE</span>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {mlConfidence.toFixed(0)}%
            </div>
            <div className="text-sm text-purple-300 mt-1">Neural Network</div>
          </div>

          {/* Signal Strength */}
          <div className="p-6 rounded-2xl border border-orange-500/30 backdrop-blur-xl bg-orange-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-300">SIGNAL POWER</span>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {signalStrength.toFixed(0)}%
            </div>
            <div className="text-sm text-orange-300 mt-1">Multi-Factor</div>
          </div>
        </div>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-3 gap-6">
          {/* AI Signal Analysis */}
          <div className="col-span-2 space-y-6 relative z-10">
            {/* Trading Intelligence Panel - Fixed Height */}
            <div className="p-6 rounded-xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/40 h-[580px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800/60 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-200">Trading Intelligence Center</h3>
                    <p className="text-sm text-slate-400">AI-powered trade readiness & execution monitoring</p>
                  </div>
                </div>
                
                {/* Overall Status Badge */}
                <div className={`px-4 py-2 rounded-lg border ${
                  (autoTradingEnabled && mlConfidence >= execThreshold && 
                   Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100) && !riskManagement.trading_disabled) 
                    ? 'bg-green-900/30 border-green-600/40 text-green-300' 
                    : 'bg-slate-800/60 border-slate-600/50 text-slate-300'
                }`}>
                  <div className="text-sm font-medium">
                    {(autoTradingEnabled && mlConfidence >= execThreshold && 
                      Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100) && !riskManagement.trading_disabled) 
                      ? 'READY TO TRADE' : 'AWAITING SIGNAL'}
                  </div>
                </div>
              </div>

              {/* Main Metrics Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {/* ML Confidence */}
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">ML Confidence</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      mlConfidence >= execThreshold ? 'text-green-300' : 'text-amber-300'
                    }`}>
                      {mlConfidence.toFixed(0)}%
                    </span>
                    <span className="text-sm text-slate-500">/ {execThreshold.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        mlConfidence >= execThreshold ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(mlConfidence, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Signal Strength */}
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">Signal Power</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      signalStrength >= 65 ? 'text-green-300' : 
                      signalStrength >= 45 ? 'text-amber-300' : 'text-red-300'
                    }`}>
                      {signalStrength.toFixed(0)}%
                    </span>
                    <span className="text-sm text-slate-500">strength</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        signalStrength >= 65 ? 'bg-green-500' : 
                        signalStrength >= 45 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(signalStrength, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Directional Bias */}
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">Direction</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${
                      Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100) ? 
                        (longProb > shortProb ? 'text-green-300' : 'text-red-300') : 
                        'text-slate-400'
                    }`}>
                      {longProb > shortProb && longProb > (settings.clearDirectionThreshold * 100) ? 'LONG' : 
                       shortProb > longProb && shortProb > (settings.clearDirectionThreshold * 100) ? 'SHORT' : 'NEUTRAL'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {Math.max(longProb, shortProb).toFixed(0)}% / {(settings.clearDirectionThreshold * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Auto Trading Status */}
                <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">Auto Trading</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${
                      autoTradingEnabled && !riskManagement.trading_disabled ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {autoTradingEnabled && !riskManagement.trading_disabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {riskManagement.consecutive_losses || 0} losses
                  </div>
                </div>
              </div>

              {/* Entry Levels & Conditions - Flex 1 to fill remaining space */}
              <div className="grid grid-cols-3 gap-6 flex-1">
                {/* Entry Conditions Checklist */}
                <div className="col-span-2 flex flex-col">
                  <h4 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Entry Conditions
                  </h4>
                  
                  {/* Fixed height container for conditions */}
                  <div className="space-y-2 flex-1">
                    {[
                      {
                        label: 'Auto Trading Enabled',
                        condition: autoTradingEnabled,
                        value: autoTradingEnabled ? 'ENABLED' : 'DISABLED'
                      },
                      {
                        label: `ML Confidence ≥ ${execThreshold.toFixed(0)}%`,
                        condition: mlConfidence >= execThreshold,
                        value: `${mlConfidence.toFixed(1)}%`
                      },
                      {
                        label: `Clear Direction ≥ ${(settings.clearDirectionThreshold * 100).toFixed(0)}%`,
                        condition: Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100),
                        value: `${Math.max(longProb, shortProb).toFixed(1)}%`
                      },
                      {
                        label: 'Risk Management Clear',
                        condition: !riskManagement.trading_disabled,
                        value: !riskManagement.trading_disabled ? 'CLEAR' : 'BLOCKED'
                      }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            item.condition ? 'bg-green-500' : 'bg-slate-500'
                          }`}></div>
                          <span className="text-sm text-slate-300">{item.label}</span>
                        </div>
                        <div className={`text-sm font-medium ${
                          item.condition ? 'text-green-300' : 'text-slate-400'
                        }`}>
                          {item.value}
                        </div>
                      </div>
                    ))}

                    {/* Fixed height status area */}
                    <div className="mt-4 h-[60px] flex items-start">
                      {(() => {
                        const blockers = [];
                        if (!autoTradingEnabled) blockers.push('Auto trading disabled');
                        if (mlConfidence < execThreshold) blockers.push(`ML confidence too low (${mlConfidence.toFixed(0)}% < ${execThreshold.toFixed(0)}%)`);
                        if (Math.max(longProb, shortProb) <= (settings.clearDirectionThreshold * 100)) blockers.push(`No clear directional bias (${Math.max(longProb, shortProb).toFixed(0)}% ≤ ${(settings.clearDirectionThreshold * 100).toFixed(0)}%)`);
                        if (riskManagement.trading_disabled) blockers.push('Risk management has disabled trading');
                        
                        return blockers.length > 0 ? (
                          <div className="w-full p-3 rounded-lg bg-red-900/20 border border-red-700/30">
                            <h5 className="text-sm font-medium text-red-300 mb-1 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Blockers ({blockers.length})
                            </h5>
                            <div className="text-xs text-red-300/70 truncate">
                              {blockers[0]}{blockers.length > 1 && ` +${blockers.length - 1} more`}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full p-3 rounded-lg bg-green-900/20 border border-green-700/30">
                            <div className="flex items-center gap-2 text-green-300">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm font-medium">All conditions satisfied</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Entry Levels - Fixed structure */}
                <div className="flex flex-col">
                  <h4 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Entry Levels
                  </h4>
                  
                  {/* Fixed height containers for entry levels */}
                  <div className="space-y-3 flex-1">
                    {/* Long Entry - Always present */}
                    <div className={`p-4 rounded-lg border h-[80px] flex flex-col justify-center ${
                      strategyStatus.next_long_entry_level 
                        ? 'bg-green-900/20 border-green-700/30' 
                        : 'bg-slate-800/20 border-slate-700/30'
                    }`}>
                      {strategyStatus.next_long_entry_level ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <ArrowUpRight className="w-4 h-4 text-green-300" />
                            <span className="text-sm text-green-300 font-medium">Long Entry</span>
                          </div>
                          <div className="text-lg font-bold text-green-300">{strategyStatus.next_long_entry_level.toFixed(2)}</div>
                          <div className="text-xs text-slate-400">
                            {Math.abs(currentPrice - strategyStatus.next_long_entry_level).toFixed(2)} pts away
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="text-sm text-slate-500">Long Entry</div>
                          <div className="text-xs text-slate-600 mt-1">No level set</div>
                        </div>
                      )}
                    </div>

                    {/* Short Entry - Always present */}
                    <div className={`p-4 rounded-lg border h-[80px] flex flex-col justify-center ${
                      strategyStatus.next_short_entry_level 
                        ? 'bg-red-900/20 border-red-700/30' 
                        : 'bg-slate-800/20 border-slate-700/30'
                    }`}>
                      {strategyStatus.next_short_entry_level ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <ArrowDownRight className="w-4 h-4 text-red-300" />
                            <span className="text-sm text-red-300 font-medium">Short Entry</span>
                          </div>
                          <div className="text-lg font-bold text-red-300">{strategyStatus.next_short_entry_level.toFixed(2)}</div>
                          <div className="text-xs text-slate-400">
                            {Math.abs(currentPrice - strategyStatus.next_short_entry_level).toFixed(2)} pts away
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="text-sm text-slate-500">Short Entry</div>
                          <div className="text-xs text-slate-600 mt-1">No level set</div>
                        </div>
                      )}
                    </div>

                    {/* Overall Readiness Score - Fixed height */}
                    <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 h-[100px] flex flex-col justify-center">
                      <div className="text-center">
                        <div className="text-sm text-slate-400 mb-1">Readiness Score</div>
                        <div className={`text-2xl font-bold mb-1 ${
                          (() => {
                            let score = 0;
                            if (autoTradingEnabled) score += 25;
                            if (mlConfidence >= execThreshold) score += 30;
                            if (signalStrength >= 65) score += 25;
                            if (Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100)) score += 20;
                            
                            if (score >= 80) return 'text-green-300';
                            if (score >= 60) return 'text-blue-300';
                            if (score >= 40) return 'text-amber-300';
                            return 'text-slate-400';
                          })()
                        }`}>
                          {(() => {
                            let score = 0;
                            if (autoTradingEnabled) score += 25;
                            if (mlConfidence >= execThreshold) score += 30;
                            if (signalStrength >= 65) score += 25;
                            if (Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100)) score += 20;
                            return score;
                          })()}%
                        </div>
                        <div className={`text-xs ${
                          (() => {
                            let score = 0;
                            if (autoTradingEnabled) score += 25;
                            if (mlConfidence >= execThreshold) score += 30;
                            if (signalStrength >= 65) score += 25;
                            if (Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100)) score += 20;
                            
                            if (score >= 80) return 'text-green-300';
                            if (score >= 60) return 'text-blue-300';
                            if (score >= 40) return 'text-amber-300';
                            return 'text-slate-400';
                          })()
                        }`}>
                          {(() => {
                            let score = 0;
                            if (autoTradingEnabled) score += 25;
                            if (mlConfidence >= execThreshold) score += 30;
                            if (signalStrength >= 65) score += 25;
                            if (Math.max(longProb, shortProb) > (settings.clearDirectionThreshold * 100)) score += 20;
                            
                            if (score >= 80) return 'READY TO TRADE';
                            if (score >= 60) return 'ALMOST READY';
                            if (score >= 40) return 'BUILDING SETUP';
                            return 'WAITING FOR SETUP';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <TradeDecisionPanel data={{ ...strategyStatus, ...riskManagement }} />

            {/* Signal Direction */}
            <div className="p-6 rounded-2xl border border-blue-500/30 backdrop-blur-xl bg-blue-500/5 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">AI Signal Analysis</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-emerald-400">Live Analysis</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Long Signal */}
                <div className={`p-4 rounded-xl border transition-all duration-500 ${
                  longProb > shortProb ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700/50 bg-slate-800/30'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-emerald-400">LONG SIGNAL</div>
                      <div className="text-xs text-slate-400">Buy Pressure</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Probability</span>
                      <span className="text-emerald-400 font-bold">{longProb.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${longProb}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400">Entry: {strategyStatus.next_long_entry_level?.toFixed(2) || '--'}</div>
                  </div>
                </div>

                {/* Short Signal */}
                <div className={`p-4 rounded-xl border transition-all duration-500 ${
                  shortProb > longProb ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700/50 bg-slate-800/30'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="font-bold text-red-400">SHORT SIGNAL</div>
                      <div className="text-xs text-slate-400">Sell Pressure</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Probability</span>
                      <span className="text-red-400 font-bold">{shortProb.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000"
                        style={{ width: `${shortProb}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400">Entry: {strategyStatus.next_short_entry_level?.toFixed(2) || '--'}</div>
                  </div>
                </div>
              </div>

              {/* Current Recommendation */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-blue-400" />
                  <div>
                    <div className="font-bold text-blue-400">AI RECOMMENDATION</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {getSignalDirection()}
                      {getSignalDirection() !== 'NEUTRAL' && (
                        <span className="text-sm ml-2 text-slate-400">
                          @ {getSignalDirection() === 'LONG' ? 
                            (strategyStatus.next_long_entry_level?.toFixed(2) || '--') : 
                            (strategyStatus.next_short_entry_level?.toFixed(2) || '--')
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Indicators */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30">
              <h3 className="text-xl font-bold mb-6">Technical Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-2">RSI (14)</div>
                  <div className="text-2xl font-bold text-white">{(marketData?.rsi || strategyStatus?.rsi_current || strategyStatus?.rsi || 50).toFixed(1)}</div>
                  <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                    <div 
                      className={`h-1 rounded-full transition-all duration-1000 ${
                        (marketData?.rsi || strategyStatus?.rsi_current || strategyStatus?.rsi || 50) > 70 ? 'bg-red-500' : 
                        (marketData?.rsi || strategyStatus?.rsi_current || strategyStatus?.rsi || 50) < 30 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${marketData?.rsi || strategyStatus?.rsi_current || strategyStatus?.rsi || 50}%` }}
                    ></div>
                  </div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-2">ATR</div>
                  <div className="text-2xl font-bold text-white">{(marketData?.atr || 15).toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-1">Volatility</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-2">Volume</div>
                  <div className="text-2xl font-bold text-white">
                    {marketData?.volume ? (marketData?.volume / 1000000).toFixed(1) + 'M' : '--'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Contracts</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Risk Management */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30 h-[280px] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Risk Management</h3>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Daily P&L</span>
                    <span className={(riskManagement.daily_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatCurrency(riskManagement.daily_loss || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${(riskManagement.daily_loss || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(Math.abs(riskManagement.daily_loss || 0) / (riskManagement.maxDailyRisk || 5000) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Max Loss: ${(riskManagement.maxDailyRisk || 5000).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Consecutive Losses</span>
                    <span className="text-orange-400">
                      {riskManagement.consecutive_losses || 0} / {consecutiveLossesLimit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-orange-500 rounded-full"
                      style={{ 
                        width: `${((riskManagement.consecutive_losses || 0) / (riskManagement.maxConsecutiveLosses || 5)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                riskManagement.trading_disabled 
                  ? 'bg-red-500/10 border border-red-500/30' 
                  : 'bg-emerald-500/10 border border-emerald-500/30'
              }`}>
                {riskManagement.trading_disabled ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-medium">Trading Halted</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Trading Active</span>
                  </>
                )}
              </div>
            </div>

            {/* Smart Trailing */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30 h-[200px] flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold">Smart Trailing</h3>
              </div>
              
              <div className={`p-3 rounded-lg flex items-center gap-2 mb-4 ${
                strategyStatus.smart_trailing_active 
                  ? 'bg-purple-500/10 border border-purple-500/30' 
                  : 'bg-slate-800/50 border border-slate-700/50'
              }`}>
                {strategyStatus.smart_trailing_active ? (
                  <>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-purple-400 font-medium">AI Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <span className="text-slate-400 font-medium">Inactive</span>
                  </>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current Stop</span>
                  <span className="text-white font-mono">
                    {strategyStatus.smart_trailing_active ? (strategyStatus.current_smart_stop?.toFixed(2) || '--') : '--'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Algorithm</span>
                  <span className="text-purple-400">
                    {strategyStatus.smart_trailing_active ? (strategyStatus.active_trailing_algorithm || 'Neural') : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Protection</span>
                  <span className="text-emerald-400">
                    {strategyStatus.smart_trailing_active && strategyStatus.entry_price && strategyStatus.current_smart_stop ? 
                      formatCurrency(Math.abs(strategyStatus.current_smart_stop - strategyStatus.entry_price) * (positionSize || 1) * 50) : 
                      '$0.00'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 rounded-2xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/30 h-[200px] flex flex-col">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="flex-1 flex flex-col space-y-3">
                <button 
                  onClick={() => executeTrade({ command: 'go_long', quantity: 1 })}
                  className="flex-1 p-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors"
                >
                  Execute Long
                </button>
                <button 
                  onClick={() => executeTrade({ command: 'go_short', quantity: 1 })}
                  className="flex-1 p-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                >
                  Execute Short
                </button>
                <button 
                  onClick={() => executeTrade({ command: 'close_position' })}
                  className="flex-1 p-3 bg-slate-600 hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Close Position
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Analytics Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Enhanced Performance Panel */}
          <EnhancedPerformancePanel className="col-span-1" />
          
          {/* Trade Outcome Panel */}
          <TradeOutcomePanel className="col-span-1" />
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">
                Last Update: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">System Online</span>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            Neural Network v4.2.1 | Latency: {connectionState.latency || 0}ms
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed top-20 right-6 z-50">
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            onSave={handleSettingsUpdate}
          />
        </div>
      )}
      {tradeToast && (
        <Toast type="success" message={tradeToast} onClose={() => setTradeToast(null)} />
      )}
    </div>
  )
}

export default TradingDashboard