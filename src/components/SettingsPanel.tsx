import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import Toast from '@/components/Toast'

interface Settings {
  minConfidence: number // 0–1
  strongConfidence: number // 0–1
  minStrength: number // 0–1
  autoTradingEnabled: boolean
}

interface SettingsPanelProps {
  onSave: (s: Settings) => void
  getCurrentSettings: () => Promise<any>
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSave, getCurrentSettings }) => {
  const [settings, setSettings] = useState<Settings>({
    minConfidence: 0.6,
    strongConfidence: 0.8,
    minStrength: 0.2,
    autoTradingEnabled: false
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Load current settings from server on component mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const serverSettings: any = await getCurrentSettings()
        console.log('Settings panel loaded server settings:', serverSettings)
        
        setSettings(prev => ({
          ...prev,
          minConfidence: serverSettings.execThreshold || prev.minConfidence,
          autoTradingEnabled: serverSettings.autoTradingEnabled || prev.autoTradingEnabled
        }))
      } catch (error) {
        console.warn('Failed to load server settings:', error)
      }
    }
    
    loadSettings()
  }, [getCurrentSettings])

  const update = (key: keyof Settings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const slider = (label: string, key: keyof Settings, min: number, max: number, step: number) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-trading-gray-400">{(settings[key] * 100).toFixed(0)}%</span>
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

  return (
    <Card className="bg-trading-card/40 backdrop-blur-lg border border-trading-border/30 p-4 relative">
      {/* Toast */}
      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-100">Signal Settings</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {slider('Min Confidence to Act', 'minConfidence', 0.4, 1, 0.01)}
        {slider('Strong Confidence', 'strongConfidence', 0.6, 1, 0.01)}
        {slider('Min Signal Strength', 'minStrength', 0, 1, 0.01)}
        
        {/* Automated Trading Toggle */}
        <div className="space-y-2 pt-2 border-t border-trading-border/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-100">Automated Trading</span>
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
        <button
          onClick={async () => {
            console.log('Sending settings:', settings)
            try {
              const resp: any = await onSave(settings)
              console.log('Server response:', resp)
              
              // Handle server response with fallbacks
              const threshold = resp?.execThreshold || settings.minConfidence || 0.7
              const autoTrading = resp?.autoTradingEnabled ?? settings.autoTradingEnabled ?? false
              
              const statusMsg = `Server threshold: ${(threshold * 100).toFixed(0)}% | Auto Trading: ${autoTrading ? 'ON' : 'OFF'}`
              setToastMessage(statusMsg)
            } catch (error) {
              console.error('Settings save error:', error)
              setToastMessage('Failed to save settings')
            }
          }}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded"
        >
          Save &amp; Send
        </button>
      </CardContent>
    </Card>
  )
}

export default SettingsPanel 