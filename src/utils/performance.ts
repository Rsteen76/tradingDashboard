/**
 * Utility functions for efficient data comparison and update detection
 */

export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  
  if (!obj1 || !obj2) return false
  
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false
  }
  
  return true
}

export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  
  if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2
  }
  
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (!deepEqual(obj1[key], obj2[key])) return false
  }
  
  return true
}

export function hasSignificantChange(
  newData: any, 
  oldData: any, 
  significantFields: string[], 
  threshold = 0.001
): boolean {
  if (!oldData) return true
  
  for (const field of significantFields) {
    const newValue = newData?.[field]
    const oldValue = oldData?.[field]
    
    if (typeof newValue === 'number' && typeof oldValue === 'number') {
      const percentChange = Math.abs((newValue - oldValue) / oldValue)
      if (percentChange > threshold) return true
    } else if (newValue !== oldValue) {
      return true
    }
  }
  
  return false
}

export function createDataHash(data: any, fields: string[]): string {
  const values = fields.map(field => String(data?.[field] || ''))
  return values.join('|')
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

export class PerformanceTracker {
  private startTime: number = 0
  private measurements: number[] = []
  
  start() {
    this.startTime = performance.now()
  }
  
  end(label?: string): number {
    const duration = performance.now() - this.startTime
    this.measurements.push(duration)
    
    if (label && duration > 16) {
      console.warn(`⚠️ Performance warning - ${label}: ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }
  
  getStats() {
    if (this.measurements.length === 0) return null
    
    const sorted = [...this.measurements].sort((a, b) => a - b)
    const avg = this.measurements.reduce((sum, val) => sum + val, 0) / this.measurements.length
    const median = sorted[Math.floor(sorted.length / 2)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    
    return {
      count: this.measurements.length,
      average: avg,
      median,
      p95,
      slowCount: this.measurements.filter(m => m > 16).length
    }
  }
  
  reset() {
    this.measurements = []
  }
}
