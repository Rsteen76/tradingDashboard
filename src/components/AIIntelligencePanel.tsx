import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface AIIntelligenceData {
  // Real AI Predictions
  profitPrediction?: {
    expectedProfit: number;
    maxProfitPotential: number;
    profitProbability: number;
    profitConfidence: number;
  };
  
  // Neural Network Outputs
  neuralNetworks?: {
    transformer?: { direction: string; confidence: number; target: number; };
    lstm?: { nextPrices: number[]; trend: string; };
    cnn?: { pattern: string; confidence: number; };
    dqn?: { action: number; qValues: number[]; };
    profitOptimizer?: { optimalEntry: number; optimalExit: number; };
  };
  
  // Market Regime Analysis
  marketRegime?: {
    regime: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
  
  // AI Reasoning
  aiReasoning?: string[];
  aiModelsUsed?: string[];
  
  // Performance Metrics
  aiMetrics?: {
    predictionAccuracy: number;
    profitPredictionAccuracy: number;
    adaptationSpeed: number;
    learningEfficiency: number;
  };
  
  // Optimization Results
  optimization?: {
    action: string;
    confidence: number;
    expectedProfit: number;
    maxProfitPotential: number;
    positionSize: number;
    riskRewardRatio: number;
    optimalEntry: number;
    optimalExit: number;
    holdTime: number;
  };
}

interface AIIntelligencePanelProps {
  data: AIIntelligenceData;
}

const AIIntelligencePanel: React.FC<AIIntelligencePanelProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [aiInsights, setAIInsights] = useState<AIIntelligenceData>({})

  useEffect(() => {
    setAIInsights(data)
  }, [data])

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'bull_trend': return 'bg-green-500'
      case 'bear_trend': return 'bg-red-500'
      case 'sideways': return 'bg-yellow-500'
      case 'volatile': return 'bg-orange-500'
      case 'breakout': return 'bg-blue-500'
      case 'reversal': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const renderOverviewTab = () => (
    <div className="space-y-4">
      {/* Profit Prediction */}
      {aiInsights.profitPrediction && (
        <Card className="p-4">
          <h4 className="font-semibold text-green-400 mb-3">🤖 AI Profit Prediction</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Expected Profit</p>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(aiInsights.profitPrediction.expectedProfit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Max Potential</p>
              <p className="text-xl font-bold text-blue-400">
                {formatCurrency(aiInsights.profitPrediction.maxProfitPotential)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Success Probability</p>
              <div className="flex items-center space-x-2">
                <Progress 
                  value={aiInsights.profitPrediction.profitProbability * 100} 
                  className="flex-1" 
                />
                <span className="text-sm font-medium">
                  {(aiInsights.profitPrediction.profitProbability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400">AI Confidence</p>
              <div className="flex items-center space-x-2">
                <Progress 
                  value={aiInsights.profitPrediction.profitConfidence * 100} 
                  className="flex-1" 
                />
                <span className="text-sm font-medium">
                  {(aiInsights.profitPrediction.profitConfidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Market Regime Analysis */}
      {aiInsights.marketRegime && (
        <Card className="p-4">
          <h4 className="font-semibold text-blue-400 mb-3">📊 Market Regime Analysis</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current Regime:</span>
              <Badge className={`${getRegimeColor(aiInsights.marketRegime.regime)} text-white`}>
                {aiInsights.marketRegime.regime.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Confidence: {(aiInsights.marketRegime.confidence * 100).toFixed(1)}%</p>
              <Progress value={aiInsights.marketRegime.confidence * 100} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(aiInsights.marketRegime.probabilities).map(([regime, prob]) => (
                <div key={regime} className="flex justify-between">
                  <span className="text-gray-400">{regime.replace('_', ' ')}:</span>
                  <span className="font-medium">{(prob * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* AI Models Status */}
      {aiInsights.aiModelsUsed && (
        <Card className="p-4">
          <h4 className="font-semibold text-purple-400 mb-3">🧠 Active AI Models</h4>
          <div className="grid grid-cols-2 gap-2">
            {aiInsights.aiModelsUsed.map((model, index) => (
              <Badge key={index} variant="outline" className="justify-center">
                {model.toUpperCase()}
              </Badge>
            ))}
          </div>
        </Card>
      )}
        </div>
  )

  const renderNeuralNetworksTab = () => (
    <div className="space-y-4">
      {aiInsights.neuralNetworks && (
        <>
          {/* Transformer Network */}
          {aiInsights.neuralNetworks.transformer && (
            <Card className="p-4">
              <h4 className="font-semibold text-green-400 mb-3">🔮 Transformer Network</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Direction</p>
                  <Badge className={aiInsights.neuralNetworks.transformer.direction === 'up' ? 'bg-green-500' : 'bg-red-500'}>
                    {aiInsights.neuralNetworks.transformer.direction.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Confidence</p>
                  <p className="font-medium">{(aiInsights.neuralNetworks.transformer.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Target</p>
                  <p className="font-medium">{aiInsights.neuralNetworks.transformer.target.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* LSTM Network */}
          {aiInsights.neuralNetworks.lstm && (
            <Card className="p-4">
              <h4 className="font-semibold text-blue-400 mb-3">📈 LSTM Network</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Trend:</span>
                  <Badge className={aiInsights.neuralNetworks.lstm.trend === 'bullish' ? 'bg-green-500' : 'bg-red-500'}>
                    {aiInsights.neuralNetworks.lstm.trend.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Next Price Predictions:</p>
                  <div className="grid grid-cols-5 gap-1 text-xs">
                    {aiInsights.neuralNetworks.lstm.nextPrices.slice(0, 5).map((price, i) => (
                      <div key={i} className="bg-gray-700 p-1 rounded text-center">
                        {price.toFixed(0)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* CNN Pattern Recognition */}
          {aiInsights.neuralNetworks.cnn && (
            <Card className="p-4">
              <h4 className="font-semibold text-orange-400 mb-3">🔍 CNN Pattern Recognition</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Pattern:</span>
                  <Badge variant="outline">
                    {aiInsights.neuralNetworks.cnn.pattern.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pattern Confidence</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={aiInsights.neuralNetworks.cnn.confidence * 100} className="flex-1" />
                    <span className="text-xs">{(aiInsights.neuralNetworks.cnn.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Deep Q-Network */}
          {aiInsights.neuralNetworks.dqn && (
            <Card className="p-4">
              <h4 className="font-semibold text-red-400 mb-3">🎯 Deep Q-Network</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Recommended Action:</span>
                  <Badge className="bg-red-500">
                    {['BUY', 'SELL', 'HOLD', 'INCREASE', 'DECREASE'][aiInsights.neuralNetworks.dqn.action] || 'UNKNOWN'}
                </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Q-Values:</p>
                  <div className="grid grid-cols-5 gap-1 text-xs">
                    {aiInsights.neuralNetworks.dqn.qValues.map((qVal, i) => (
                      <div key={i} className={`p-1 rounded text-center ${
                        i === aiInsights.neuralNetworks.dqn.action ? 'bg-red-600' : 'bg-gray-700'
                      }`}>
                        {qVal.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
              )}
            </div>
  )

  const renderOptimizationTab = () => (
    <div className="space-y-4">
      {aiInsights.optimization && (
        <>
          <Card className="p-4">
            <h4 className="font-semibold text-yellow-400 mb-3">⚡ AI Optimization Results</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Recommended Action</p>
                <Badge className={aiInsights.optimization.action === 'up' ? 'bg-green-500' : 'bg-red-500'}>
                  {aiInsights.optimization.action.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-400">AI Confidence</p>
                <div className="flex items-center space-x-2">
                  <Progress value={aiInsights.optimization.confidence * 100} className="flex-1" />
                  <span className="text-sm">{(aiInsights.optimization.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Position Size</p>
                <p className="text-lg font-bold">{aiInsights.optimization.positionSize}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Risk:Reward</p>
                <p className="text-lg font-bold text-green-400">1:{aiInsights.optimization.riskRewardRatio.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Optimal Entry</p>
                <p className="text-lg font-bold">{aiInsights.optimization.optimalEntry.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Optimal Exit</p>
                <p className="text-lg font-bold">{aiInsights.optimization.optimalExit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Hold Time</p>
                <p className="text-lg font-bold">{Math.round(aiInsights.optimization.holdTime)} min</p>
                </div>
              <div>
                <p className="text-sm text-gray-400">Expected Profit</p>
                <p className="text-lg font-bold text-green-400">
                  {formatCurrency(aiInsights.optimization.expectedProfit)}
                </p>
              </div>
            </div>
          </Card>

          {/* AI Reasoning */}
          {aiInsights.aiReasoning && (
            <Card className="p-4">
              <h4 className="font-semibold text-cyan-400 mb-3">🧠 AI Reasoning</h4>
              <div className="space-y-2">
                {aiInsights.aiReasoning.map((reason, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-300">{reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )

  const renderPerformanceTab = () => (
    <div className="space-y-4">
      {aiInsights.aiMetrics && (
        <Card className="p-4">
          <h4 className="font-semibold text-pink-400 mb-3">📊 AI Performance Metrics</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-400">Prediction Accuracy</span>
                <span className="text-sm font-medium">{(aiInsights.aiMetrics.predictionAccuracy * 100).toFixed(1)}%</span>
              </div>
              <Progress value={aiInsights.aiMetrics.predictionAccuracy * 100} />
            </div>
                  <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-400">Profit Prediction Accuracy</span>
                <span className="text-sm font-medium">{(aiInsights.aiMetrics.profitPredictionAccuracy * 100).toFixed(1)}%</span>
              </div>
              <Progress value={aiInsights.aiMetrics.profitPredictionAccuracy * 100} />
                    </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-400">Adaptation Speed</span>
                <span className="text-sm font-medium">{(aiInsights.aiMetrics.adaptationSpeed * 100).toFixed(1)}%</span>
                  </div>
              <Progress value={aiInsights.aiMetrics.adaptationSpeed * 100} />
                </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-400">Learning Efficiency</span>
                <span className="text-sm font-medium">{(aiInsights.aiMetrics.learningEfficiency * 100).toFixed(1)}%</span>
              </div>
              <Progress value={aiInsights.aiMetrics.learningEfficiency * 100} />
            </div>
          </div>
        </Card>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">🤖 Advanced AI Intelligence</h3>
        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          Real Neural Networks
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'networks', label: 'Neural Networks', icon: '🧠' },
          { id: 'optimization', label: 'Optimization', icon: '⚡' },
          { id: 'performance', label: 'Performance', icon: '📈' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'networks' && renderNeuralNetworksTab()}
        {activeTab === 'optimization' && renderOptimizationTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
      </div>
    </div>
  )
}

export default AIIntelligencePanel 