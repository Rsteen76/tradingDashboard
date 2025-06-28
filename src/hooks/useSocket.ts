'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'
import { transformKeys } from '@/lib/utils'

export interface MarketData {
  type: "market_data"
  instrument: string
  timestamp: string
  price: number
  ema5: number
  ema8: number
  ema13: number
  ema21: number
  ema50: number
  ema200: number
  rsi: number
  atr: number
  adx: number
  volume: number
  volume_ratio: number
  regime: string
}

export interface StrategyStatus {
  type: "strategy_status"
  strategy_instance_id: string
  strategy_name: string
  instrument: string
  timestamp: string
  current_price: number
  position: "Long" | "Short" | "Flat"
  position_size: number
  unrealized_pnl: number
  entry_price: number
  last_entry_price: number
  last_trade_direction: "Long" | "Short"
  stop_loss: number
  target1: number
  target2: number
  position_synced: boolean
  debug_strategy_position: string
  debug_strategy_quantity: number
  tick_size: number
  point_value: number
  state: string
  tick_count_session: number
  bars_processed: number
  overall_signal_strength: number
  signal_strength?: number;
  signal_probability_long: number
  signal_probability_short: number
  ml_confidence_level?: number;
  ml_confidence?: number;
  confidence?: number;
  minConfidence?: number;
  autoTradingEnabled?: boolean;
  ema_alignment_score: number
  ema_alignment_strength: string
  ema_trend_direction: string
  rsi_current: number
  rsi_zone: string
  rsi_distance_to_signal: number
  htf_bias: string
  volatility_state: string
  market_regime: string
  next_long_entry_level: number
  next_short_entry_level: number
  stop_level_long: number
  stop_level_short: number
  time_since_last_signal: number
  strategy_uptime: number
  connection_status: string
  smart_trailing_enabled: boolean
  smart_trailing_active: boolean
  current_smart_stop: number
  active_trailing_algorithm: string
  trailing_confidence_threshold: number
  trailing_update_interval: number
  max_stop_movement_atr: number
  last_trailing_update: number
}

export interface TradeMessage {
  type: "trade"
  instrument: string
  timestamp: string
  direction: "Long" | "Short"
  entry_price: number
  exit_price: number
  pnl: number
  quantity: number
  entry_time: string
  exit_time: string
  stop_price: number
  target1_price: number
  target2_price: number
  exit_reason: string
  regime: string
  rsi: number
  atr: number
  adx: number
  volume_ratio: number
  mae: number
  mfe: number
  actual_rr: number
  trade_type: string
}

export interface RiskManagement {
  minConfidence: number;
  strongConfidence: number;
  minStrength: number;
  autoTradingEnabled: boolean;
  ensembleWeights: {
    lstm: number;
    transformer: number;
    randomForest: number;
    xgboost: number;
    dqn: number;
  };
  trailingConfidenceThreshold: number;
  trailingUpdateInterval: number;
  maxStopMovementAtr: number;
  minProfitTarget: number;
  maxPositionSize: number;
  maxDailyRisk: number;
  volatilityAdjustment: number;
  patternConfidenceThreshold: number;
  regimeChangeThreshold: number;
  momentumThreshold: number;
  breakoutStrength: number;
  clearDirectionThreshold: number;
  trading_disabled: boolean;
  daily_loss: number;
  consecutive_losses: number;
}

export interface StrategyData {
  marketData: MarketData | null
  strategyStatus: StrategyStatus | null
  lastTrade: TradeMessage | null
  riskManagement: RiskManagement | null
}

interface ConnectionState {
  isConnected: boolean
  latency: number
}

export interface PerformanceMetrics {
  models: {
    [key: string]: {
      predictions: number
      correct: number
      accuracy: number
      lastUpdate: string
    }
  }
  trading: {
    dailyPnL: number
    weeklyPnL: number
    monthlyPnL: number
    winRate: number
    profitFactor: number
    sharpeRatio: number
    maxDrawdown: number
    currentDrawdown: number
    consecutiveWins: number
    consecutiveLosses: number
  }
  risk: {
    positionsOpen: number
    totalExposure: number
    marginUsed: number
    riskScore: number
    dailyVaR: number
    stressTestResult: number
  }
  health: {
    uptime: number
    lastHeartbeat: string
    cpuUsage: number
    memoryUsage: number
    tensorflowMemory: number
    apiLatency: number
    predictionLatency: number
    ninjaConnection: boolean
    score: number
  }
  learning: {
    totalTradesAnalyzed: number
    patternsIdentified: number
    modelUpdates: number
    lastModelUpdate: string
    adaptationRate: number
    learningEfficiency: number
  }
}

export interface SystemAlert {
  id: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  timestamp: string
  data?: any
}

export interface EvolutionProgress {
  currentPhase: string
  totalTrades: number
  tradesToNext: number
  performance: {
    winRate: number
    profitFactor: number
    avgWin: number
    avgLoss: number
  }
}

// Use the correct port for the ML server
const SOCKET_URL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001'

// Validate incoming data against interface
function validateData<T>(data: any, type: string): data is T {
  if (!data || typeof data !== 'object') return false
  if (data.type !== type) return false
  return true
}

export function useSocket() {
  const [strategyData, setStrategyData] = useState<StrategyData>({
    marketData: null,
    strategyStatus: null,
    lastTrade: null,
    riskManagement: null,
  })
  const [marketDataHistory, setMarketDataHistory] = useState<MarketData[]>([])
  const [tradeHistory, setTradeHistory] = useState<TradeMessage[]>([])
  const [mlPrediction, setMlPrediction] = useState<any>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    latency: 0
  })
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])
  const [evolutionProgress, setEvolutionProgress] = useState<EvolutionProgress | null>(null)
  
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const latencyIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    let isSubscribed = true

    const connectSocket = () => {
      console.log('Connecting to ML server at:', SOCKET_URL)
      
      // Clean up existing socket if any
      if (socketRef.current?.connected) {
        socketRef.current.disconnect()
      }

      const socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket']
      })

      socketRef.current = socket

      socket.on('connect', () => {
        if (!isSubscribed) return
        console.log('Connected to ML server')
        setConnectionState(prev => ({ ...prev, isConnected: true }))
        
        // Request initial trading progress
        socket.emit('get_trading_progress', (progress) => {
          console.log('Initial trading progress:', progress)
        })
      })

      socket.on('market_data', (data: any) => {
        if (!isSubscribed) return
        if (validateData<MarketData>(data, 'market_data')) {
          setStrategyData(prev => ({
            ...prev,
            marketData: data
          }))
          setMarketDataHistory(prev => [...prev.slice(-100), data])
        }
      })

      socket.on('strategy_status', (data: any) => {
        if (!isSubscribed) return
        if (validateData<StrategyStatus>(data, 'strategy_status')) {
          setStrategyData(prev => ({
            ...prev,
            strategyStatus: data
          }))
        }
      })

      socket.on('trade', (data: any) => {
        if (!isSubscribed) return;
        if (!validateData<TradeMessage>(data, 'trade')) {
          console.error('Invalid trade data:', data);
          return;
        }
        setStrategyData(prev => ({
          ...prev,
          lastTrade: data,
        }));
        setTradeHistory(prev => [data, ...prev].slice(0, 50));
      });

      socket.on('risk_management', (data: any) => {
        if (!isSubscribed) return;
        if (!validateData<RiskManagement>(data, 'risk_management')) {
          console.error('Invalid risk management data:', data);
          return;
        }
        setStrategyData(prev => ({
          ...prev,
          riskManagement: { ...prev.riskManagement, ...data },
        }));
      });

      socket.on('ml_prediction', (data: any) => {
        if (!isSubscribed) return;
        console.log('Received ml_prediction', data);
        setMlPrediction(data);
      });

      socket.on('current_settings', (settings: any) => {
        if (!isSubscribed) return;
        setStrategyData(prev => ({
          ...prev,
          riskManagement: {
            ...prev.riskManagement,
            ...settings
          }
        }));
      });

      socket.on('strategy_data', (data: any) => {
        if (!isSubscribed) return;
        // More flexible validation for strategy_data - it may not have a type field
        if (!data || typeof data !== 'object') {
          console.error('Invalid strategy data:', data);
          return;
        }
        setStrategyData(prev => ({
          ...prev,
          ...data,
          riskManagement: {
            ...prev.riskManagement,
            ...data.riskManagement
          }
        }));
      });

      socket.on('evolution_progress', (progress: EvolutionProgress) => {
        if (!isSubscribed) return
        console.log('Received evolution progress:', progress)
        setEvolutionProgress(progress)
      })

      socket.on('trading_progress', (progress: any) => {
        if (!isSubscribed) return
        console.log('Received trading progress:', progress)
        setPerformanceMetrics(prev => prev ? {
          ...prev,
          trading: {
            ...prev.trading,
            ...progress.trading
          },
          risk: {
            ...prev.risk,
            ...progress.risk
          }
        } : null)
      })

      socket.on('performance_metrics', (data: PerformanceMetrics) => {
        if (!isSubscribed) return
        console.log('Received performance metrics:', data)
        setPerformanceMetrics(data)
      })

      socket.on('system_alert', (alert: SystemAlert) => {
        if (!isSubscribed) return
        console.log('Received system alert:', alert)
        setSystemAlerts(prev => [alert, ...prev].slice(0, 10))
      })

      socket.on('disconnect', () => {
        if (!isSubscribed) return
        console.log('Disconnected from ML server')
        setConnectionState(prev => ({ ...prev, isConnected: false }))
      })

      socket.on('error', (error: Error) => {
        if (!isSubscribed) return
        console.error('Socket error:', error)
        setConnectionState(prev => ({ ...prev, isConnected: false }))
      })
    }

    connectSocket()

    // Cleanup function
    return () => {
      isSubscribed = false
      if (socketRef.current) {
        console.log('Cleaning up socket connection')
        socketRef.current.disconnect()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current)
      }
    }
  }, [])

  const updateServerSettings = useCallback((settings: any) => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        // Map dashboard settings to the full server format
        const serverSettings = {
          // Core Trading Settings
          minConfidence: settings.minConfidence,
          autoTradingEnabled: settings.autoTradingEnabled,
          strongConfidence: settings.strongConfidence,
          minStrength: settings.minStrength,
          
          // ML Model Weights
          ensembleWeights: settings.modelWeights,
          
          // Smart Trailing Settings
          trailingConfidenceThreshold: settings.trailingConfidenceThreshold,
          trailingUpdateInterval: settings.trailingUpdateInterval,
          maxStopMovementAtr: settings.maxStopMovementAtr,
          
          // Risk Management
          minProfitTarget: settings.minProfitTarget,
          maxPositionSize: settings.maxPositionSize,
          maxDailyRisk: settings.maxDailyRisk,
          volatilityAdjustment: settings.volatilityAdjustment,
          
          // Advanced AI Settings
          patternConfidenceThreshold: settings.patternConfidenceThreshold,
          regimeChangeThreshold: settings.regimeChangeThreshold,
          momentumThreshold: settings.momentumThreshold,
          breakoutStrength: settings.breakoutStrength,
        };
        
        socketRef.current.emit('update_settings', serverSettings, (response: any) => {
          if (response?.error) {
            console.error('Failed to update settings:', response.error);
            reject(new Error(response.error));
          } else {
            console.log('Settings updated successfully:', response);
            resolve(response);
          }
        });
      } else {
        reject(new Error('Socket not connected'));
      }
    });
  }, []);

  const getCurrentSettings = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        socketRef.current.emit('get_settings', (response: any) => {
          if (response?.error) {
            console.error('Failed to get settings:', response.error)
            reject(new Error(response.error))
          } else {
            console.log('Current settings received:', response)
            resolve(response)
          }
        })
      } else {
        reject(new Error('Socket not connected'))
      }
    })
  }, [])

  const sendManualTrade = (payload: { command: string; quantity?: number }) => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        socketRef.current.emit('manual_trade', payload, (response: any) => {
          resolve(response)
        })
      } else {
        reject(new Error('Socket not connected'))
      }
    })
  }

  return {
    strategyData,
    marketDataHistory,
    tradeHistory,
    mlPrediction,
    connectionState,
    performanceMetrics,
    systemAlerts,
    updateServerSettings,
    getCurrentSettings,
    sendManualTrade,
    evolutionProgress
  }
} 