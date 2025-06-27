import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import Toast from '@/components/Toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InfoCircledIcon } from '@radix-ui/react-icons'

export interface Settings {
  // Core Trading Settings
  minConfidence: number // 0-1
  strongConfidence: number // 0-1
  minStrength: number // 0-1
  autoTradingEnabled: boolean
  
  // ML Model Weights
  modelWeights: {
    lstm: number // 0-1
    transformer: number // 0-1
    randomForest: number // 0-1
    xgboost: number // 0-1
    dqn: number // 0-1
  }
  
  // Smart Trailing Settings
  trailingConfidenceThreshold: number // 0-1
  trailingUpdateInterval: number // seconds
  maxStopMovementAtr: number // ATR multiplier
  
  // Risk Management
  minProfitTarget: number // dollars
  maxPositionSize: number // contracts/shares
  maxDailyRisk: number // percentage
  volatilityAdjustment: number // 0-1
  
  // Advanced AI Settings
  patternConfidenceThreshold: number // 0-1
  regimeChangeThreshold: number // 0-1
  momentumThreshold: number // 0-1
  breakoutStrength: number // 0-1
  clearDirectionThreshold: number // 0-1 (threshold for clear long/short bias)
}

// Tooltip content for each setting
const tooltips = {
  // Core Trading Settings
  minConfidence: "Minimum confidence level required from the AI models before taking any trading action. Lower values may increase trade frequency but reduce accuracy.",
  strongConfidence: "Confidence threshold for aggressive position sizing and tighter stops. Higher values indicate stronger conviction trades.",
  minStrength: "Minimum signal strength required, combining multiple technical and AI factors. Helps filter out weak or uncertain signals.",
  autoTradingEnabled: "When enabled, the system will automatically execute trades based on AI signals. When disabled, signals are generated but require manual confirmation.",
  
  // ML Model Weights
  lstm: "Weight for the Long Short-Term Memory model, specialized in sequence prediction and trend analysis.",
  transformer: "Weight for the Transformer model, excellent at identifying complex market patterns and relationships.",
  randomForest: "Weight for the Random Forest model, robust for market regime classification and feature importance.",
  xgboost: "Weight for the XGBoost model, powerful for combining multiple technical indicators.",
  dqn: "Weight for the Deep Q-Network model, using reinforcement learning for optimal entry/exit timing.",
  
  // Smart Trailing Settings
  trailingConfidenceThreshold: "Minimum confidence required to adjust trailing stops. Higher values make stops more stable but potentially less responsive.",
  trailingUpdateInterval: "How often (in seconds) the system updates trailing stops. Shorter intervals are more responsive but may be noisier.",
  maxStopMovementAtr: "Maximum distance trailing stops can move in one update, expressed in ATR units. Limits extreme adjustments.",
  
  // Risk Management
  minProfitTarget: "Minimum profit target in dollars. Trades with lower expected profit will not be taken.",
  maxPositionSize: "Maximum position size in contracts/shares. Helps manage risk exposure.",
  maxDailyRisk: "Maximum percentage of account that can be risked per day.",
  volatilityAdjustment: "Factor to adjust position sizes based on market volatility. Higher values reduce size in volatile markets.",
  
  // Advanced AI Settings
  patternConfidenceThreshold: "Minimum confidence required for pattern recognition. Higher values ensure clearer patterns.",
  regimeChangeThreshold: "Sensitivity to market regime changes. Higher values require stronger evidence of regime shifts.",
  momentumThreshold: "Threshold for momentum-based signals. Higher values require stronger momentum confirmation.",
  breakoutStrength: "Required strength for breakout signals. Higher values reduce false breakouts but may delay entry.",
  clearDirectionThreshold: "Minimum probability required for a clear directional bias (long or short). Higher values require stronger conviction before considering a signal."
}

interface SettingsPanelProps {
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings>>
  onSave: (s: Settings) => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, onSave }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'models' | 'trailing' | 'risk' | 'advanced'>('core')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const update = (key: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateModelWeight = (model: keyof Settings['modelWeights'], value: number) => {
    setSettings(prev => ({
      ...prev,
      modelWeights: {
        ...prev.modelWeights,
        [model]: value
      }
    }))
  }

  const slider = (label: string, key: keyof Settings, min: number, max: number, step: number, unit: string = '%') => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoCircledIcon className="h-4 w-4 text-gray-400 hover:text-gray-300" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px] p-3 bg-gray-800/95 border border-gray-700 text-sm">
                {tooltips[key as keyof typeof tooltips]}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-trading-gray-400">
          {unit === '%' ? `${(settings[key] * 100).toFixed(0)}${unit}` : `${settings[key]}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={settings[key]}
        onChange={e => update(key, parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )

  const modelWeightSlider = (model: keyof Settings['modelWeights'], label: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoCircledIcon className="h-4 w-4 text-gray-400 hover:text-gray-300" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px] p-3 bg-gray-800/95 border border-gray-700 text-sm">
                {tooltips[model]}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-trading-gray-400">{(settings.modelWeights[model] * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={settings.modelWeights[model]}
        onChange={e => updateModelWeight(model, parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )

  const handleGetSettings = async () => {
    try {
      const resp = await getCurrentSettings();
      const threshold = resp?.minConfidence || settings.minConfidence;
      // ... rest of the function code ...
    } catch (error) {
      console.error('Failed to get settings:', error);
    }
  };

  return (
    <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30 p-4 relative">
      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
      
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-100">AI Trading Settings</h2>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-gray-800/50 rounded-lg p-1">
          {[
            { id: 'core', label: 'Core', icon: '⚡' },
            { id: 'models', label: 'Models', icon: '🧠' },
            { id: 'trailing', label: 'Trailing', icon: '📈' },
            { id: 'risk', label: 'Risk', icon: '🛡️' },
            { id: 'advanced', label: 'Advanced', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 mt-4">
        {/* Core Trading Settings */}
        {activeTab === 'core' && (
          <div className="space-y-4">
            {slider('Min Confidence to Act', 'minConfidence', 0.4, 1, 0.01)}
            {slider('Strong Confidence', 'strongConfidence', 0.6, 1, 0.01)}
            {slider('Min Signal Strength', 'minStrength', 0, 1, 0.01)}
            
            <div className="space-y-2 pt-2 border-t border-trading-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-100">Automated Trading</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-4 w-4 text-gray-400 hover:text-gray-300" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[300px] p-3 bg-gray-800/95 border border-gray-700 text-sm">
                        {tooltips.autoTradingEnabled}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoTradingEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoTradingEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              <p className="text-xs text-trading-gray-400">
                {settings.autoTradingEnabled ? 
                  'AI will automatically execute trades based on ML signals' : 
                  'Trading commands will be generated but not executed automatically'
                }
              </p>
            </div>
          </div>
        )}

        {/* ML Model Weights */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            {modelWeightSlider('lstm', 'LSTM Model Weight')}
            {modelWeightSlider('transformer', 'Transformer Model Weight')}
            {modelWeightSlider('randomForest', 'Random Forest Weight')}
            {modelWeightSlider('xgboost', 'XGBoost Weight')}
            {modelWeightSlider('dqn', 'DQN Model Weight')}
            
            <p className="text-xs text-trading-gray-400 mt-2">
              Model weights determine how much each model contributes to the final prediction.
              Total weights should sum to approximately 1.0
            </p>
          </div>
        )}

        {/* Smart Trailing Settings */}
        {activeTab === 'trailing' && (
          <div className="space-y-4">
            {slider('Trailing Confidence Threshold', 'trailingConfidenceThreshold', 0.4, 1, 0.01)}
            {slider('Update Interval', 'trailingUpdateInterval', 5, 60, 1, 's')}
            {slider('Max Stop Movement', 'maxStopMovementAtr', 0.1, 2, 0.1, ' ATR')}
            
            <p className="text-xs text-trading-gray-400 mt-2">
              Smart trailing settings control how aggressively the system moves stop losses
              based on market conditions and AI predictions.
            </p>
          </div>
        )}

        {/* Risk Management Settings */}
        {activeTab === 'risk' && (
          <div className="space-y-4">
            {slider('Min Profit Target', 'minProfitTarget', 10, 100, 5, '$')}
            {slider('Max Position Size', 'maxPositionSize', 1, 10, 1, '')}
            {slider('Max Daily Risk', 'maxDailyRisk', 0.5, 5, 0.1, '%')}
            {slider('Volatility Adjustment', 'volatilityAdjustment', 0, 1, 0.05)}
            
            <p className="text-xs text-trading-gray-400 mt-2">
              Risk management settings help protect your account by limiting position sizes
              and adjusting for market volatility.
            </p>
          </div>
        )}

        {/* Advanced AI Settings */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            {slider('Pattern Confidence', 'patternConfidenceThreshold', 0.4, 1, 0.01)}
            {slider('Regime Change Sensitivity', 'regimeChangeThreshold', 0.4, 1, 0.01)}
            {slider('Momentum Threshold', 'momentumThreshold', 0.4, 1, 0.01)}
            {slider('Breakout Strength', 'breakoutStrength', 0.4, 1, 0.01)}
            {slider('Clear Direction Threshold', 'clearDirectionThreshold', 0.5, 0.9, 0.01)}
            
            <p className="text-xs text-trading-gray-400 mt-2">
              Advanced settings control the sensitivity of various AI components
              to different market conditions and patterns.
            </p>
          </div>
        )}

        <button
          onClick={async () => {
            console.log('Sending settings:', settings)
            try {
              const resp: any = await onSave(settings)
              console.log('Server response:', resp)
              
              // Handle server response with fallbacks
              const threshold = resp?.minConfidence || settings.minConfidence
              const autoTrading = resp?.autoTradingEnabled ?? settings.autoTradingEnabled
              
              const statusMsg = `Settings saved successfully! Threshold: ${(threshold * 100).toFixed(0)}% | Auto Trading: ${autoTrading ? 'ON' : 'OFF'}`
              setToastMessage(statusMsg)
            } catch (error) {
              console.error('Settings save error:', error)
              setToastMessage('Failed to save settings')
            }
          }}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
        >
          Save & Apply
        </button>
      </CardContent>
    </Card>
  )
}

export default SettingsPanel 