import { Settings } from './settings';

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
  volatilityAdjustment: number;  // Keep as number
  patternConfidenceThreshold: number;
  regimeChangeThreshold: number;
  momentumThreshold: number;
  breakoutStrength: number;
  dailyLoss: number;
  consecutiveLosses: number;
  tradingDisabled: boolean;
  maxConsecutiveLosses: number;
  execThreshold?: number;
  dailyLossLimit?: number;
  consecutiveLossLimit?: number;
  tradingStatus?: boolean;
}

export interface MarketData {
  type: string;
  instrument: string;
  timestamp: number;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  close: number;
  vwap: number;
  atr: number;
  volatility: number;
  trend: number;
}

export interface StrategyStatus {
  type: string;
  strategyInstanceId: string;
  strategyName: string;
  instrument: string;
  status: string;
  position: string;
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  riskLevel: string;
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
  lastUpdate: number;
  tradingEnabled: boolean;
  autoTrading: boolean;
  riskPerTrade: number;
  maxPositionSize: number;
  minProfitTarget: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxConsecutiveLosses: number;
  maxDailyRisk: number;
  dailyPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  overallSignalStrength?: number;
  signalStrength?: number;
  signalProbabilityLong?: number;
  signalProbabilityShort?: number;
  mlConfidenceLevel?: number;
  mlConfidence?: number;
  autoTradingEnabled?: boolean;
  execThreshold?: number;
  dailyLoss?: number;
  consecutiveLosses?: number;
  tradingDisabled?: boolean;
  dailyLossLimit?: number;
  consecutiveLossLimit?: number;
  tradingStatus?: boolean;
  rsi?: number;
  rsi_current?: number;
} 