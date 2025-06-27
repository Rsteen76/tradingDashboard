import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Brain, Activity, AlertTriangle, CheckCircle2, Clock, Target, Shield, Zap } from 'lucide-react';

interface PerformanceMetrics {
  trading: {
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    currentDrawdown: number;
    consecutiveWins: number;
    consecutiveLosses: number;
  };
  models: {
    [key: string]: {
      predictions: number;
      correct: number;
      accuracy: number;
      lastUpdate: string | null;
    };
  };
  risk: {
    positionsOpen: number;
    totalExposure: number;
    riskScore: number;
    dailyVaR: number;
  };
  health: {
    score: number;
    cpuUsage: number;
    memoryUsage: number;
    apiLatency: number;
    ninjaConnection: boolean;
  };
}

interface TradeStatistics {
  overall: {
    totalTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  byHour: { [key: string]: any };
  byPattern: { [key: string]: any };
  byConfidence: { [key: string]: any };
}

interface SystemAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface EnhancedPerformancePanelProps {
  className?: string;
}

const EnhancedPerformancePanel: React.FC<EnhancedPerformancePanelProps> = ({ className = '' }) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [tradeStatistics, setTradeStatistics] = useState<TradeStatistics | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'models' | 'trades' | 'alerts'>('overview');
  const [loading, setLoading] = useState(true);

  // Fetch data from enhanced APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, statsRes, alertsRes] = await Promise.all([
          fetch('/api/performance-metrics'),
          fetch('/api/trade-statistics'),
          fetch('/api/system-alerts')
        ]);

        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setPerformanceMetrics(metrics);
        }

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setTradeStatistics(stats);
        }

        if (alertsRes.ok) {
          const alerts = await alertsRes.json();
          setSystemAlerts(alerts);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch enhanced performance data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <div className={`bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <Activity className="w-8 h-8 text-blue-400 animate-pulse mx-auto mb-2" />
            <p className="text-slate-400">Loading enhanced metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Enhanced Performance</h3>
            <p className="text-xs text-slate-400">Real-time system analytics</p>
          </div>
        </div>
        
        {/* System Health Indicator */}
        {performanceMetrics && (
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${performanceMetrics.health.score >= 0.8 ? 'bg-emerald-400' : performanceMetrics.health.score >= 0.6 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className={`text-sm font-medium ${getHealthColor(performanceMetrics.health.score)}`}>
              {(performanceMetrics.health.score * 100).toFixed(0)}% Health
            </span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-slate-800/30 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'models', label: 'AI Models', icon: Brain },
          { id: 'trades', label: 'Trade Stats', icon: Target },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedTab(id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              selectedTab === id
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {id === 'alerts' && systemAlerts.length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {systemAlerts.filter(a => !a.acknowledged).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {selectedTab === 'overview' && performanceMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Daily P&L */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400">Daily P&L</span>
              </div>
              <div className={`text-lg font-bold ${performanceMetrics.trading.dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(performanceMetrics.trading.dailyPnL)}
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400">Win Rate</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatPercentage(performanceMetrics.trading.winRate)}
              </div>
            </div>

            {/* Profit Factor */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-400">Profit Factor</span>
              </div>
              <div className="text-lg font-bold text-white">
                {performanceMetrics.trading.profitFactor.toFixed(2)}
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-slate-400">Risk Score</span>
              </div>
              <div className={`text-lg font-bold ${performanceMetrics.risk.riskScore <= 0.3 ? 'text-emerald-400' : performanceMetrics.risk.riskScore <= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(performanceMetrics.risk.riskScore * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'models' && performanceMetrics && (
          <div className="space-y-3">
            {Object.entries(performanceMetrics.models).map(([modelName, modelData]) => (
              <div key={modelName} className="bg-slate-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white capitalize">{modelName}</span>
                  </div>
                  <div className={`text-sm font-bold ${modelData.accuracy >= 0.6 ? 'text-emerald-400' : modelData.accuracy >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatPercentage(modelData.accuracy)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Predictions: {modelData.predictions}</span>
                  <span>Correct: {modelData.correct}</span>
                  <span>Last: {modelData.lastUpdate ? new Date(modelData.lastUpdate).toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'trades' && tradeStatistics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Total Trades</div>
                <div className="text-2xl font-bold text-white">{tradeStatistics.overall.totalTrades}</div>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Expectancy</div>
                <div className={`text-2xl font-bold ${tradeStatistics.overall.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(tradeStatistics.overall.expectancy)}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-3">Performance Breakdown</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Avg Win:</span>
                  <span className="text-emerald-400 ml-2">{formatCurrency(tradeStatistics.overall.avgWin)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Avg Loss:</span>
                  <span className="text-red-400 ml-2">{formatCurrency(-tradeStatistics.overall.avgLoss)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Sharpe Ratio:</span>
                  <span className="text-white ml-2">{tradeStatistics.overall.sharpeRatio.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Max Drawdown:</span>
                  <span className="text-red-400 ml-2">{formatPercentage(tradeStatistics.overall.maxDrawdown)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="space-y-3">
            {systemAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-400">No active alerts</p>
              </div>
            ) : (
              systemAlerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium capitalize">{alert.type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs opacity-60">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                  {!alert.acknowledged && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                        Unacknowledged
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPerformancePanel; 