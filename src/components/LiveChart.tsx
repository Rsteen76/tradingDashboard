'use client'

import { useEffect, useRef, useMemo, memo } from 'react'

interface LiveChartProps {
  data: Array<{ price: number; timestamp: string; pnl?: number }>
  height?: number
}

export default memo(function LiveChart({ data, height = 200 }: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastDataHashRef = useRef<string>('')

  // Memoize chart calculations to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!data.length) return null
    
    const prices = data.map(d => d.price).filter(p => p > 0)
    if (prices.length === 0) return null

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1
    
    return {
      prices,
      minPrice,
      maxPrice,
      priceRange,
      dataLength: data.length,
      lastPrice: prices[prices.length - 1],
      high: maxPrice,
      low: minPrice
    }
  }, [data])
  
  // Create a hash of the data to detect changes
  const dataHash = useMemo(() => {
    if (!chartData) return ''
    return `${chartData.dataLength}-${chartData.lastPrice}-${chartData.high}-${chartData.low}`
  }, [chartData])

  useEffect(() => {
    // Only redraw if data actually changed
    if (dataHash === lastDataHashRef.current) return
    lastDataHashRef.current = dataHash
    
    const canvas = canvasRef.current
    if (!canvas || !chartData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Use requestAnimationFrame for smooth rendering
    animationFrameRef.current = requestAnimationFrame(() => {
      // Set canvas size
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // Clear canvas with a single operation
      ctx.clearRect(0, 0, rect.width, height)

      drawChart(ctx, rect.width, height, data, chartData)
    })
  }, [dataHash, chartData, data, height])
  
  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Optimized drawing function
  const drawChart = (ctx: CanvasRenderingContext2D, width: number, height: number, data: any[], chartData: any) => {
    const { minPrice, maxPrice, priceRange } = chartData    // Draw grid with batch operations
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(75, 75, 75, 0.3)'
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }

    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = (width / 6) * i
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    ctx.stroke()

    // Draw price line in one path
    if (data.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 2

      let firstPoint = true
      data.forEach((point, index) => {
        if (point.price <= 0) return
        
        const x = (index / (data.length - 1)) * width
        const y = height - ((point.price - minPrice) / priceRange) * height

        if (firstPoint) {
          ctx.moveTo(x, y)
          firstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Draw points in batches
      ctx.fillStyle = '#00ff88'
      data.forEach((point, index) => {
        if (point.price <= 0) return
        
        const x = (index / (data.length - 1)) * width
        const y = height - ((point.price - minPrice) / priceRange) * height

        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    }

    // Draw price labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (priceRange * (4 - i) / 4)
      const y = (height / 4) * i + 15
      ctx.fillText(`$${price.toFixed(2)}`, width - 5, y)
    }
  }

  // Memoize the stats to prevent recalculation
  const stats = useMemo(() => {
    if (!chartData) return { current: '0.00', high: '0.00', low: '0.00' }
    
    return {
      current: data[data.length - 1]?.price?.toFixed(2) || '0.00',
      high: chartData.high.toFixed(2),
      low: chartData.low.toFixed(2)
    }
  }, [chartData, data])

  return (
    <div className="trading-card p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-trading-green">📈 Live Price Action</h3>
        <div className="text-sm text-gray-400">
          {data.length} data points
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-700 rounded"
          style={{ height: `${height}px` }}
        />
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Waiting for data...
          </div>
        )}
      </div>
      {data.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-gray-400">Current</div>
            <div className="font-mono text-white">
              ${stats.current}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">High</div>
            <div className="font-mono text-green-400">
              ${stats.high}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">Low</div>
            <div className="font-mono text-red-400">
              ${stats.low}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
