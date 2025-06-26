import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  latency?: number
  startTime?: string
}

export default function ConnectionStatus({ isConnected, latency, startTime }: ConnectionStatusProps) {
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500'
  const statusText = isConnected ? 'Connected' : 'Disconnected'

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A'
    const date = new Date(timeString)
    return date.toLocaleTimeString()
  }

  const getUptime = () => {
    if (!startTime) return 'N/A'
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Connection Status */}
      <div className="flex items-center space-x-2 px-3 py-1 bg-trading-card/50 backdrop-blur-lg rounded-full border border-trading-border/40">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-sm">{statusText}</span>
      </div>

      {/* Connection Details */}
      {latency !== undefined && (
        <span className="text-xs text-gray-400">{latency} ms</span>
      )}
    </div>
  )
}
