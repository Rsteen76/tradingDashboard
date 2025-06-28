# AI Performance Monitor Dashboard Integration Guide

## Current Status
✅ **Backend**: AI Performance Monitor fully integrated and emitting events  
❌ **Frontend**: Dashboard NOT listening for performance monitor events

## Required Changes

### 1. Update useSocket Hook
**File:** `src/hooks/useSocket.ts`

Add these interfaces:
```typescript
export interface PerformanceMetrics {
  trading: {
    dailyPnL: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    tradesCompleted: number;
  };
  risk: {
    positionsOpen: number;
    totalExposure: number;
    riskLevel: string;
  };
  health: {
    cpuUsage: number;
    memoryUsage: number;
    predictionLatency: number;
    ninjaConnection: boolean;
    score: number;
  };
  models: {
    [key: string]: {
      predictions: number;
      correct: number;
      accuracy: number;
      lastUpdate: string;
    };
  };
  learning: {
    totalTradesAnalyzed: number;
    modelUpdates: number;
    learningEfficiency: number;
    lastModelUpdate: string;
  };
}

export interface SystemAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  data?: any;
}
```

Add state variables:
```typescript
const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
```

Add Socket.IO listeners in the connectSocket function:
```typescript
socket.on('performance_metrics', (data: any) => {
  if (!isSubscribed) return;
  console.log('Received performance_metrics', data);
  setPerformanceMetrics(data.metrics);
});

socket.on('system_alert', (data: any) => {
  if (!isSubscribed) return;
  console.log('Received system_alert', data);
  setSystemAlerts(prev => [data, ...prev].slice(0, 20)); // Keep last 20 alerts
});
```

Export the new state:
```typescript
return {
  // ... existing exports
  performanceMetrics,
  systemAlerts,
  acknowledgeAlert: (alertId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('acknowledge_alert', alertId);
    }
  }
}
```

### 2. Create AI Performance Monitor Component
**File:** `src/components/AIPerformanceMonitor.tsx`

```typescript
import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { PerformanceMetrics, SystemAlert } from '@/hooks/useSocket';

interface AIPerformanceMonitorProps {
  metrics?: PerformanceMetrics;
  alerts?: SystemAlert[];
  onAcknowledgeAlert?: (alertId: string) => void;
}

export default function AIPerformanceMonitor({ 
  metrics, 
  alerts = [], 
  onAcknowledgeAlert 
}: AIPerformanceMonitorProps) {
  const getHealthColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-400 bg-emerald-500/10';
    if (score >= 0.6) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 text-red-400';
      case 'high': return 'border-orange-500 text-orange-400';
      case 'medium': return 'border-yellow-500 text-yellow-400';
      default: return 'border-blue-500 text-blue-400';
    }
  };

  if (!metrics) {
    return (
      <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30">
        <CardHeader>
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Performance Monitor
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-trading-gray-400">Connecting to performance monitor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Health */}
      <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </h3>
            <Badge className={getHealthColor(metrics.health?.score || 0)}>
              {((metrics.health?.score || 0) * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-trading-gray-400">CPU Usage</p>
            <p className="text-lg font-mono text-gray-100">
              {(metrics.health?.cpuUsage || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-trading-gray-400">Memory</p>
            <p className="text-lg font-mono text-gray-100">
              {((metrics.health?.memoryUsage || 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-trading-gray-400">Prediction Latency</p>
            <p className="text-lg font-mono text-gray-100">
              {metrics.health?.predictionLatency || 0}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-trading-gray-400">NinjaTrader</p>
            <p className={`text-lg font-mono ${metrics.health?.ninjaConnection ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.health?.ninjaConnection ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trading Performance */}
      <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30">
        <CardHeader>
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trading Performance
          </h3>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-trading-gray-400">Daily P&L</p>
            <p className={`text-lg font-mono ${(metrics.trading?.dailyPnL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${(metrics.trading?.dailyPnL || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-trading-gray-400">Trades Today</p>
            <p className="text-lg font-mono text-gray-100">
              {metrics.trading?.tradesCompleted || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-trading-gray-400">Consecutive Wins</p>
            <p className="text-lg font-mono text-emerald-400">
              {metrics.trading?.consecutiveWins || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-trading-gray-400">Consecutive Losses</p>
            <p className="text-lg font-mono text-red-400">
              {metrics.trading?.consecutiveLosses || 0}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30">
          <CardHeader>
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts ({alerts.length})
            </h3>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 rounded border ${getAlertColor(alert.severity)} bg-opacity-10`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-xs opacity-75">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {!alert.acknowledged && onAcknowledgeAlert && (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
                    >
                      Ack
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### 3. Update Main Dashboard
**File:** `src/app/page.tsx`

Import and use the new component:
```typescript
import AIPerformanceMonitor from '@/components/AIPerformanceMonitor';

// In the useSocket hook usage:
const { 
  // ... existing 
  performanceMetrics, 
  systemAlerts, 
  acknowledgeAlert 
} = useSocket();

// Add to the dashboard layout:
<AIPerformanceMonitor 
  metrics={performanceMetrics}
  alerts={systemAlerts}
  onAcknowledgeAlert={acknowledgeAlert}
/>
```

### 4. Test the Integration

1. Start the server
2. Open the dashboard
3. Check browser console for:
   ```
   Received performance_metrics {trading: {...}, health: {...}}
   Received system_alert {id: "...", type: "...", message: "..."}
   ```

### 5. Optional: Enhanced Features

- Real-time performance charts
- Model accuracy trending
- Risk threshold visualizations
- Alert history
- Performance export functionality

## Expected Result
The dashboard will show:
- ✅ Real-time system health metrics
- ✅ AI model performance tracking  
- ✅ Trading performance statistics
- ✅ Live alerts and notifications
- ✅ System status monitoring 