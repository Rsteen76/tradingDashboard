import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface RiskManagementPanelProps {
  riskData?: {
    account_balance?: number
    max_position_size?: number
    current_risk_per_trade?: number
    max_daily_risk?: number
    daily_drawdown?: number
    position?: string
    position_size?: number
    risk_reward_ratio?: number
    win_rate?: number
    expected_value?: number
    max_consecutive_losses?: number
    volatility_adjustment?: number
    atr?: number
  }
  position?: string
  unrealizedPnl?: number
}

const RiskManagementPanel: React.FC<RiskManagementPanelProps> = ({ riskData = {}, position, unrealizedPnl }) => {
  const data = riskData as Record<string, any>

  // Calculate risk metrics
  const calculateRiskMetrics = () => {
    const maxRiskAmount = (data.account_balance || 0) * (data.max_daily_risk || 0.02)
    const currentRiskAmount = (data.position_size || 0) * (data.current_risk_per_trade || 0.01)
    const riskUtilization = maxRiskAmount === 0 ? 0 : (currentRiskAmount / maxRiskAmount) * 100

    return {
      maxRiskAmount,
      currentRiskAmount,
      riskUtilization
    }
  }

  const { maxRiskAmount, currentRiskAmount, riskUtilization } = calculateRiskMetrics()

  // Get risk level color
  const getRiskColor = (utilization: number) => {
    if (utilization >= 80) return 'text-red-400'
    if (utilization >= 50) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  return (
    <Card className="bg-trading-card/30 backdrop-blur-lg border-trading-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-xl font-semibold text-gray-100">Risk Management</h2>
        <Badge variant={riskUtilization >= 80 ? 'destructive' : 'outline'}>
          Risk Level: {riskUtilization.toFixed(1)}%
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Position Risk */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Current Risk</p>
            <p className={`text-lg font-semibold ${getRiskColor(riskUtilization)}`}>
              ${currentRiskAmount.toFixed(2)}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Max Risk</p>
            <p className="text-lg font-semibold text-gray-200">
              ${maxRiskAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Risk Utilization Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Risk Utilization</span>
            <span className={getRiskColor(riskUtilization)}>{riskUtilization.toFixed(1)}%</span>
          </div>
          <Progress value={riskUtilization} className="h-2" />
        </div>

        {/* Position Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Risk/Reward</p>
            <p className="text-lg font-semibold">
              {data.risk_reward_ratio ? `${data.risk_reward_ratio.toFixed(2)}` : '--'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Win Rate</p>
            <p className="text-lg font-semibold">
              {data.win_rate ? `${(data.win_rate * 100).toFixed(1)}%` : '--'}
            </p>
          </div>
        </div>

        {/* Volatility Adjustment */}
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Volatility Adjustment</p>
            <Badge variant="outline" className="text-xs">
              ATR: {data.atr ? `${(data.atr * 100).toFixed(2)}%` : '--'}
            </Badge>
          </div>
          <p className="text-lg font-semibold mt-1">
            {data.volatility_adjustment ? `${(data.volatility_adjustment * 100).toFixed(1)}%` : '--'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default RiskManagementPanel 