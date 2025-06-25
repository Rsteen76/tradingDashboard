'use client'

import { useState, useEffect, useMemo, memo } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

// Define Toast component first so we can reference it later in this file
const Toast = memo(function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  // Memoize toast styles and icon
  const toastConfig = useMemo(() => {
    const baseStyles = "fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border transition-all duration-300 max-w-md"
    
    switch (type) {
      case 'success':
        return {
          styles: `${baseStyles} bg-green-900/90 border-green-500 text-green-100`,
          icon: '✅'
        }
      case 'warning':
        return {
          styles: `${baseStyles} bg-yellow-900/90 border-yellow-500 text-yellow-100`,
          icon: '⚠️'
        }
      case 'error':
        return {
          styles: `${baseStyles} bg-red-900/90 border-red-500 text-red-100`,
          icon: '❌'
        }
      case 'info':
        return {
          styles: `${baseStyles} bg-blue-900/90 border-blue-500 text-blue-100`,
          icon: 'ℹ️'
        }
      default:
        return {
          styles: `${baseStyles} bg-gray-900/90 border-gray-500 text-gray-100`,
          icon: '📢'
        }
    }
  }, [type])

  return (
    <div className={`${toastConfig.styles} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-lg">{toastConfig.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-4 text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
});

export default Toast;

export const ToastContainer = memo(function ToastContainer({ toasts, removeToast }: { 
  toasts: Array<{ id: string; message: string; type: 'success' | 'warning' | 'error' | 'info' }>, 
  removeToast: (id: string) => void 
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ transform: `translateY(${index * 10}px)` }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
})
