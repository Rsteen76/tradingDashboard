'use client'

import React, { useState, useEffect } from 'react'

interface LearningInsights {
  overall: {
    winRate: number
    profitFactor: number
    sharpeRatio: number
    maxDrawdown: number
    avgWin: number
    avgLoss: number
  }
  timeAnalysis: {
    hourlyPerformance: Record<string, any>
    dailyPerformance: Record<string, any>
  }
  patternAnalysis: {
    successfulPatterns: any[]
    failedPatterns: any[]
  }
  recommendations: Array<{
    type: string
    priority: string
    message: string
    action: string
  }>
}

interface PerformanceData {
  learningInsights: LearningInsights
  dataAnalysis: any
  totalTrades: number
  currentTrade: any
  timestamp: string
}

export default function LearningPanel() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [optimizations, setOptimizations] = useState<any>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/performance-insights')
      if (response.ok) {
        const data = await response.json()
        setPerformanceData(data)
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
    }
  }

  const triggerOptimization = async () => {
    setIsOptimizing(true)
    try {
      const response = await fetch('http://localhost:8080/api/optimize-strategy', {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setOptimizations(data)
      }
    } catch (error) {
      console.error('Error triggering optimization:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
    const interval = setInterval(fetchPerformanceData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (!performanceData) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            🧠
          </div>
          <h3 className="text-lg font-semibold text-white">AI Learning Analytics</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const insights = performanceData.learningInsights

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            🧠
          </div>
          <h3 className="text-lg font-semibold text-white">AI Learning Analytics</h3>
        </div>
        <button
          onClick={triggerOptimization}
          disabled={isOptimizing}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50"
        >
          {isOptimizing ? '🔄 Optimizing...' : '⚡ Optimize Strategy'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'patterns', label: 'Patterns', icon: '🔍' },
          { id: 'time', label: 'Time Analysis', icon: '⏰' },
          { id: 'recommendations', label: 'AI Insights', icon: '💡' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Win Rate</span>
                <span className={`text-lg font-bold ${insights.overall?.winRate > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                  {insights.overall?.winRate ? (insights.overall.winRate * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${insights.overall?.winRate > 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${(insights.overall?.winRate || 0) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Profit Factor</span>
                <span className={`text-lg font-bold ${(insights.overall?.profitFactor || 0) > 1.2 ? 'text-green-400' : 'text-red-400'}`}>
                  {insights.overall?.profitFactor?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${(insights.overall?.profitFactor || 0) > 1.2 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min((insights.overall?.profitFactor || 0) / 2 * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Sharpe Ratio</span>
                <span className={`text-lg font-bold ${(insights.overall?.sharpeRatio || 0) > 1.0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {insights.overall?.sharpeRatio?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Max Drawdown</span>
                <span className={`text-lg font-bold ${(insights.overall?.maxDrawdown || 0) < 0.1 ? 'text-green-400' : 'text-red-400'}`}>
                  {insights.overall?.maxDrawdown ? (insights.overall.maxDrawdown * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>

          {/* Current Trade Status */}
          {performanceData.currentTrade && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">🔄 Current Trade</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Direction:</span>
                  <span className={`ml-2 font-medium ${performanceData.currentTrade.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                    {performanceData.currentTrade.direction}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Entry:</span>
                  <span className="ml-2 text-white">{performanceData.currentTrade.entry_price}</span>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="ml-2 text-white">{Math.floor(performanceData.currentTrade.duration / 60000)}m</span>
                </div>
              </div>
            </div>
          )}

          {/* Total Trades */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Total Trades Analyzed</span>
              <span className="text-white text-lg font-bold">{performanceData.totalTrades}</span>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'patterns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Successful Patterns */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-medium mb-3">✅ Successful Patterns</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {insights.patternAnalysis?.successfulPatterns?.slice(0, 3).map((pattern, index) => (
                  <div key={index} className="text-sm">
                    <div className="text-white">{pattern.key}</div>
                    <div className="text-green-300 text-xs">
                      {(pattern.successRate * 100).toFixed(1)}% success rate
                    </div>
                  </div>
                )) || <div className="text-gray-400 text-sm">No patterns identified yet</div>}
              </div>
            </div>

            {/* Failed Patterns */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-medium mb-3">❌ Failed Patterns</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {insights.patternAnalysis?.failedPatterns?.slice(0, 3).map((pattern, index) => (
                  <div key={index} className="text-sm">
                    <div className="text-white">{pattern.key}</div>
                    <div className="text-red-300 text-xs">
                      {((1 - pattern.successRate) * 100).toFixed(1)}% failure rate
                    </div>
                  </div>
                )) || <div className="text-gray-400 text-sm">No patterns identified yet</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'time' && (
        <div className="space-y-4">
          {/* Best Trading Hours */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">⏰ Best Trading Hours</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {Object.entries(insights.timeAnalysis?.hourlyPerformance || {})
                .sort(([,a], [,b]) => (b as any).winRate - (a as any).winRate)
                .slice(0, 8)
                .map(([hour, stats]: [string, any]) => (
                  <div key={hour} className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-white font-medium">{hour}:00</div>
                    <div className={`${stats.winRate > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                      {(stats.winRate * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">📅 Weekly Performance</h4>
            <div className="grid grid-cols-7 gap-2 text-xs">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                const stats = insights.timeAnalysis?.dailyPerformance?.[index]
                return (
                  <div key={day} className="bg-gray-700/50 rounded p-2 text-center">
                    <div className="text-gray-300">{day}</div>
                    <div className={`${stats?.winRate > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats ? (stats.winRate * 100).toFixed(0) : '0'}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'recommendations' && (
        <div className="space-y-3">
          {insights.recommendations?.map((rec, index) => (
            <div 
              key={index} 
              className={`border rounded-lg p-4 ${
                rec.priority === 'high' 
                  ? 'bg-red-900/20 border-red-500/30' 
                  : rec.priority === 'medium'
                  ? 'bg-yellow-900/20 border-yellow-500/30'
                  : 'bg-blue-900/20 border-blue-500/30'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg">
                  {rec.priority === 'high' ? '🚨' : rec.priority === 'medium' ? '⚠️' : '💡'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      rec.priority === 'high' 
                        ? 'bg-red-500/20 text-red-300' 
                        : rec.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className="text-white font-medium">{rec.type}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{rec.message}</p>
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🎯</div>
              <div>No recommendations available yet</div>
              <div className="text-sm">More data needed for AI analysis</div>
            </div>
          )}
        </div>
      )}

      {/* Optimization Results */}
      {optimizations && (
        <div className="mt-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h4 className="text-green-400 font-medium mb-3">⚡ Latest Optimizations</h4>
          <div className="text-sm text-gray-300">
            <pre className="whitespace-pre-wrap">{JSON.stringify(optimizations, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Last updated: {new Date(performanceData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
} 