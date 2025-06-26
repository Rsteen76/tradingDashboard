import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import Toast from '@/components/Toast'

interface Settings {
  minConfidence: number // 0–1
  strongConfidence: number // 0–1
  minStrength: number // 0–1
}

interface SettingsPanelProps {
  onSave: (s: Settings) => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<Settings>({
    minConfidence: 0.6,
    strongConfidence: 0.8,
    minStrength: 0.2
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

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
        <button
          onClick={async () => {
            onSave(settings).then((resp: any) => {
              setToastMessage(`Server threshold now ${(resp.execThreshold * 100).toFixed(0)}%`)
            })
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