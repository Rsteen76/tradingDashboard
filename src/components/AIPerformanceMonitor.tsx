'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { type PerformanceMetrics, type SystemAlert } from '../hooks/useSocket'
import { Brain, Activity, AlertTriangle, CheckCircle2, TrendingUp, Gauge, Bell } from 'lucide-react'

interface AIPerformanceMonitorProps {
  performanceMetrics: PerformanceMetrics | null
  systemAlerts: SystemAlert[]
  evolutionProgress: any
}

export function AIPerformanceMonitor({ 
  performanceMetrics, 
  systemAlerts,
  evolutionProgress
}: AIPerformanceMonitorProps) {
  
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Discovering patterns': return 'text-blue-400 bg-blue-500/10'
      case 'Filtering bad patterns': return 'text-yellow-400 bg-yellow-500/10'
      case 'Optimizing parameters': return 'text-orange-400 bg-orange-500/10'
      case 'Fine-tuning system': return 'text-purple-400 bg-purple-500/10'
      case 'Production ready': return 'text-emerald-400 bg-emerald-500/10'
      default: return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400 bg-emerald-500/10'
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-500/10'
    return 'text-red-400 bg-red-500/10'
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 text-red-400'
      case 'high': return 'border-orange-500 text-orange-400'
      case 'medium': return 'border-yellow-500 text-yellow-400'
      default: return 'border-blue-500 text-blue-400'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">AI Performance Monitor</CardTitle>
        <CardDescription>Real-time trading system evolution and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evolution" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="evolution" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Evolution
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          {/* Evolution Tab */}
          <TabsContent value="evolution" className="space-y-4">
            {evolutionProgress ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getPhaseColor(evolutionProgress.currentPhase)}>
                    {evolutionProgress.currentPhase}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {evolutionProgress.totalTrades} trades completed
                  </span>
                </div>
                
                {evolutionProgress.tradesToNext > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to next phase</span>
                      <span>{evolutionProgress.tradesToNext} trades remaining</span>
                    </div>
                    <Progress 
                      value={((evolutionProgress.totalTrades % 50) / 50) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                {evolutionProgress.performance && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-semibold">{evolutionProgress.performance.winRate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profit Factor</p>
                      <p className="text-lg font-semibold">{evolutionProgress.performance.profitFactor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Win</p>
                      <p className="text-lg font-semibold">{evolutionProgress.performance.avgWin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Loss</p>
                      <p className="text-lg font-semibold">{evolutionProgress.performance.avgLoss}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Waiting for trading data...
              </div>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            {performanceMetrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Daily P&L</p>
                  <p className={`text-lg font-semibold ${performanceMetrics.trading.dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${performanceMetrics.trading.dailyPnL.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Positions</p>
                  <p className="text-lg font-semibold">{performanceMetrics.risk.positionsOpen}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model Accuracy</p>
                  <p className="text-lg font-semibold">
                    {Object.values(performanceMetrics.models).reduce((acc, model) => acc + model.accuracy, 0) / Object.keys(performanceMetrics.models).length * 100}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                  <Badge className={getHealthColor(performanceMetrics.health.score)}>
                    {(performanceMetrics.health.score * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Waiting for performance data...
              </div>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            {systemAlerts.length > 0 ? (
              <div className="space-y-2">
                {systemAlerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertColor(alert.severity)} flex items-start gap-2`}
                  >
                    {alert.severity === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No active alerts
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 