import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, Target, AlertCircle, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';

interface ActiveTrade {
  id: string;
  instrument: string;
  direction: 'long' | 'short';
  entryTime: string;
  entryPrice: number;
  quantity: number;
  confidence: number;
  maxFavorable: number;
  maxAdverse: number;
  currentPnL: number;
  warnings: Array<{
    type: string;
    timestamp: string;
    message?: string;
  }>;
}

interface CompletedTrade {
  id: string;
  instrument: string;
  direction: 'long' | 'short';
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  finalPnL: number;
  finalPnLPercent: number;
  success: boolean;
  exitReason: string;
  confidence: number;
  metrics: {
    roi: number;
    efficiency: number;
    durationMinutes: number;
    predictionAccuracy: {
      direction: boolean;
      overall: number;
    };
  };
}

interface TradeOutcomePanelProps {
  className?: string;
}

const TradeOutcomePanel: React.FC<TradeOutcomePanelProps> = ({ className = '' }) => {
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [recentTrades, setRecentTrades] = useState<CompletedTrade[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'recent' | 'insights'>('active');
  const [loading, setLoading] = useState(true);

  // Fetch trade data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // In a real implementation, these would be separate endpoints
        const response = await fetch('/api/trade-outcomes');
        if (response.ok) {
          const data = await response.json();
          setActiveTrades(data.activeTrades || []);
          setRecentTrades(data.recentTrades || []);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch trade outcome data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000); // Update every 2 seconds for active trades

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
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getTimeSince = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'long' ? TrendingUp : TrendingDown;
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'long' ? 'text-emerald-400' : 'text-red-400';
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const getExitReasonIcon = (reason: string) => {
    switch (reason) {
      case 'take_profit': return CheckCircle;
      case 'stop_loss': return XCircle;
      case 'trailing_stop': return Target;
      default: return AlertCircle;
    }
  };

  const getExitReasonColor = (reason: string) => {
    switch (reason) {
      case 'take_profit': return 'text-emerald-400';
      case 'stop_loss': return 'text-red-400';
      case 'trailing_stop': return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className={`bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <Activity className="w-8 h-8 text-blue-400 animate-pulse mx-auto mb-2" />
            <p className="text-slate-400">Loading trade outcomes...</p>
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
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Trade Outcomes</h3>
            <p className="text-xs text-slate-400">Real-time trade lifecycle tracking</p>
          </div>
        </div>

        {/* Active Trades Count */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${activeTrades.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></div>
          <span className="text-sm text-slate-400">
            {activeTrades.length} active trade{activeTrades.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-slate-800/30 rounded-lg p-1">
        {[
          { id: 'active', label: 'Active Trades', count: activeTrades.length },
          { id: 'recent', label: 'Recent Trades', count: recentTrades.length },
          { id: 'insights', label: 'Insights', count: 0 }
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setSelectedTab(id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              selectedTab === id
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white border border-green-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
            }`}
          >
            <span>{label}</span>
            {count > 0 && (
              <span className="w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {selectedTab === 'active' && (
          <>
            {activeTrades.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No active trades</p>
              </div>
            ) : (
              activeTrades.map((trade) => {
                const DirectionIcon = getDirectionIcon(trade.direction);
                return (
                  <div key={trade.id} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                    {/* Trade Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <DirectionIcon className={`w-5 h-5 ${getDirectionColor(trade.direction)}`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{trade.instrument}</span>
                            <span className={`text-xs px-2 py-1 rounded ${getDirectionColor(trade.direction)} bg-opacity-20`}>
                              {trade.direction.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {trade.quantity} @ ${trade.entryPrice.toFixed(2)} • {getTimeSince(trade.entryTime)} ago
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getPnLColor(trade.currentPnL)}`}>
                          {formatCurrency(trade.currentPnL)}
                        </div>
                        <div className="text-xs text-slate-400">
                          Conf: {(trade.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Max Favorable/Adverse */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="bg-emerald-500/10 rounded-lg p-3">
                        <div className="text-xs text-emerald-400 mb-1">Max Favorable</div>
                        <div className="text-emerald-400 font-medium">
                          {formatCurrency(trade.maxFavorable)}
                        </div>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-3">
                        <div className="text-xs text-red-400 mb-1">Max Adverse</div>
                        <div className="text-red-400 font-medium">
                          {formatCurrency(trade.maxAdverse)}
                        </div>
                      </div>
                    </div>

                    {/* Warnings */}
                    {trade.warnings.length > 0 && (
                      <div className="space-y-2">
                        {trade.warnings.slice(-2).map((warning, index) => (
                          <div key={index} className="flex items-center space-x-2 text-xs text-yellow-400 bg-yellow-500/10 rounded p-2">
                            <AlertCircle className="w-3 h-3" />
                            <span>{warning.type.replace('_', ' ')}</span>
                            <span className="text-slate-400">
                              {getTimeSince(warning.timestamp)} ago
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {selectedTab === 'recent' && (
          <>
            {recentTrades.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No recent trades</p>
              </div>
            ) : (
              recentTrades.map((trade) => {
                const DirectionIcon = getDirectionIcon(trade.direction);
                const ExitIcon = getExitReasonIcon(trade.exitReason);
                return (
                  <div key={trade.id} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                    {/* Trade Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <DirectionIcon className={`w-5 h-5 ${getDirectionColor(trade.direction)}`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{trade.instrument}</span>
                            <span className={`text-xs px-2 py-1 rounded ${trade.success ? 'text-emerald-400 bg-emerald-500/20' : 'text-red-400 bg-red-500/20'}`}>
                              {trade.success ? 'WIN' : 'LOSS'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {trade.quantity} @ ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getPnLColor(trade.finalPnL)}`}>
                          {formatCurrency(trade.finalPnL)}
                        </div>
                        <div className={`text-xs ${getPnLColor(trade.finalPnLPercent)}`}>
                          {formatPercentage(trade.finalPnLPercent)}
                        </div>
                      </div>
                    </div>

                    {/* Trade Details */}
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white ml-1">
                          {Math.round(trade.metrics.durationMinutes)}m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Efficiency:</span>
                        <span className="text-white ml-1">
                          {(trade.metrics.efficiency * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ExitIcon className={`w-3 h-3 ${getExitReasonColor(trade.exitReason)}`} />
                        <span className={`${getExitReasonColor(trade.exitReason)}`}>
                          {trade.exitReason.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* AI Accuracy */}
                    <div className="mt-3 bg-slate-700/30 rounded p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">AI Prediction Accuracy</span>
                        <div className="flex items-center space-x-2">
                          <span className={`${trade.metrics.predictionAccuracy.direction ? 'text-emerald-400' : 'text-red-400'}`}>
                            Direction: {trade.metrics.predictionAccuracy.direction ? '✓' : '✗'}
                          </span>
                          <span className="text-white">
                            Overall: {(trade.metrics.predictionAccuracy.overall * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {selectedTab === 'insights' && (
          <div className="space-y-4">
            {/* Trade Performance Insights */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Performance Insights</h4>
              <div className="space-y-2 text-sm">
                {recentTrades.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Recent Win Rate:</span>
                      <span className="text-white">
                        {((recentTrades.filter(t => t.success).length / recentTrades.length) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Trade Duration:</span>
                      <span className="text-white">
                        {Math.round(recentTrades.reduce((sum, t) => sum + t.metrics.durationMinutes, 0) / recentTrades.length)}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Best Exit Reason:</span>
                      <span className="text-white">
                        {(() => {
                          const counts = recentTrades.reduce((acc, trade) => {
                            acc[trade.exitReason] = (acc[trade.exitReason] || 0) + (trade.success ? 1 : 0);
                            return acc;
                          }, {} as Record<string, number>);
                          return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0]?.replace('_', ' ') || 'N/A';
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI Model Performance */}
            <div className="bg-slate-800/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">AI Model Insights</h4>
              <div className="space-y-2 text-sm">
                {recentTrades.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Direction Accuracy:</span>
                      <span className="text-white">
                        {((recentTrades.filter(t => t.metrics.predictionAccuracy.direction).length / recentTrades.length) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Overall AI Accuracy:</span>
                      <span className="text-white">
                        {(recentTrades.reduce((sum, t) => sum + t.metrics.predictionAccuracy.overall, 0) / recentTrades.length * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">High Confidence Trades:</span>
                      <span className="text-white">
                        {recentTrades.filter(t => t.confidence > 0.7).length} / {recentTrades.length}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeOutcomePanel; 