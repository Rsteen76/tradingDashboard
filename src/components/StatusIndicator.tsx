'use client'

import { useMemo, memo } from 'react'

interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'warning' | 'error'
  label: string
  subtitle?: string
  pulse?: boolean
}

export default memo(function StatusIndicator({ status, label, subtitle, pulse = true }: StatusIndicatorProps) {
  // Memoize status configuration
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-green-500',
          glow: 'shadow-green-500/50',
          textColor: 'text-green-400',
          icon: '🟢'
        }
      case 'warning':
        return {
          color: 'bg-yellow-500',
          glow: 'shadow-yellow-500/50',
          textColor: 'text-yellow-400',
          icon: '🟡'
        }
      case 'error':
        return {
          color: 'bg-red-500',
          glow: 'shadow-red-500/50',
          textColor: 'text-red-400',
          icon: '🔴'
        }
      default: // inactive
        return {
          color: 'bg-gray-500',
          glow: 'shadow-gray-500/50',
          textColor: 'text-gray-400',
          icon: '⚫'
        }
    }
  }, [status]);
  
  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${statusConfig.color} ${pulse ? 'animate-pulse' : ''}`}></div>
        <div className={`absolute inset-0 w-3 h-3 rounded-full ${statusConfig.color} ${statusConfig.glow} ${pulse ? 'animate-ping' : ''} opacity-75`}></div>
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${statusConfig.textColor}`}>
          {statusConfig.icon} {label}
        </span>
        {subtitle && (
          <span className="text-xs text-gray-400">{subtitle}</span>
        )}
      </div>
    </div>
  )
})
