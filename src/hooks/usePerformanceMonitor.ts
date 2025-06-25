'use client'

import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  slowRenders: number
}

export function usePerformanceMonitor(componentName: string, threshold = 16) {
  const metrics = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0
  })
  
  const renderStartTime = useRef<number>(0)

  useEffect(() => {
    renderStartTime.current = performance.now()
  })

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current
    metrics.current.renderCount++
    metrics.current.lastRenderTime = renderTime
    
    // Calculate running average
    const count = metrics.current.renderCount
    metrics.current.averageRenderTime = 
      (metrics.current.averageRenderTime * (count - 1) + renderTime) / count
    
    // Track slow renders
    if (renderTime > threshold) {
      metrics.current.slowRenders++
      console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }

    // Log performance every 50 renders in development
    if (process.env.NODE_ENV === 'development' && count % 50 === 0) {
      console.log(`📊 Performance metrics for ${componentName}:`, {
        ...metrics.current,
        slowRenderPercentage: ((metrics.current.slowRenders / count) * 100).toFixed(1) + '%'
      })
    }
  })

  return metrics.current
}

export function useRenderOptimization() {
  const frameRef = useRef<number>()
  
  useEffect(() => {
    // Cancel any pending frame on unmount
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const scheduleUpdate = (callback: () => void) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
    frameRef.current = requestAnimationFrame(callback)
  }

  return { scheduleUpdate }
}
