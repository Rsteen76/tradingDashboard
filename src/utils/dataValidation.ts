// Data validation utilities for trading dashboard
export interface StrategyData {
  instrument?: string
  price?: number
  signal_strength?: number
  ml_probability?: number
  rsi?: number
  ema_alignment?: number
  pnl?: number
  position?: string
  position_size?: number
  timestamp?: string
  strategy_name?: string
  strategy_instance_id?: string
  entry_price?: number
  stop_loss?: number
  target_price?: number
  target1?: number
  target2?: number
  overall_signal_strength?: number
  signal_probability_long?: number
  signal_probability_short?: number
  ema_alignment_score?: number
  htf_bias?: string
  volatility_state?: string
  market_regime?: string
  ml_long_probability?: number
  ml_short_probability?: number
  ml_confidence_level?: number
  ml_volatility_prediction?: number
  ml_market_regime?: string
  bid?: number
  ask?: number
  spread?: number
  volume?: number
  next_long_entry_level?: number
  next_short_entry_level?: number
  long_entry_quality?: number
  short_entry_quality?: number
  ml_trade_recommendation?: string
  recommended_position_size?: number
  ml_mode?: string
  last_ml_update?: string
  data_source?: string
}

// Validation functions
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export function isValidPositiveNumber(value: any): value is number {
  return isValidNumber(value) && value >= 0
}

export function clampProbability(value: any): number {
  if (!isValidNumber(value)) return 0
  return Math.max(0, Math.min(1, value))
}

export function clampRSI(value: any): number {
  if (!isValidNumber(value)) return 50
  return Math.max(0, Math.min(100, value))
}

export function clampPercentage(value: any): number {
  if (!isValidNumber(value)) return 0
  return Math.max(-100, Math.min(100, value))
}

export function validatePrice(value: any): number {
  if (!isValidNumber(value) || value < 0) return 0
  // Cap at reasonable maximum to prevent overflow
  return Math.min(value, 999999.99)
}

export function validatePositionSize(value: any): number {
  if (!isValidNumber(value) || value < 0) return 0
  // Cap at reasonable maximum
  return Math.min(Math.floor(value), 1000)
}

export function validatePnL(value: any): number {
  if (!isValidNumber(value)) return 0
  // Cap P&L to prevent display issues
  return Math.max(-999999999, Math.min(999999999, value))
}

export function validateInstrument(value: any): string {
  if (typeof value !== 'string') return 'ES'
  // Limit length to prevent layout issues
  return value.length > 20 ? value.substring(0, 20) + '...' : value
}

export function validatePosition(value: any): string {
  if (typeof value !== 'string') return 'FLAT'
  const validPositions = ['FLAT', 'LONG', 'SHORT']
  const upperValue = value.toUpperCase()
  return validPositions.some(pos => upperValue.includes(pos)) ? upperValue : 'FLAT'
}

export function validateTimestamp(value: any): string {
  if (typeof value !== 'string') return new Date().toISOString()
  
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return new Date().toISOString()
    
    // Check if timestamp is too old (more than 1 hour)
    const age = Date.now() - date.getTime()
    if (age > 3600000) {
      console.warn('⚠️ Received very old timestamp:', value)
    }
    
    return value
  } catch {
    return new Date().toISOString()
  }
}

// Main validation function
export function validateStrategyData(data: any): StrategyData {
  if (!data || typeof data !== 'object') {
    console.warn('⚠️ Invalid strategy data received:', data)
    return {
      instrument: 'ES',
      price: 0,
      position: 'FLAT',
      position_size: 0,
      pnl: 0,
      timestamp: new Date().toISOString()
    }
  }

  const validated: StrategyData = {
    instrument: validateInstrument(data.instrument),
    price: validatePrice(data.price || data.current_price),
    signal_strength: clampPercentage(data.signal_strength),
    ml_probability: clampProbability(data.ml_probability),
    rsi: clampRSI(data.rsi),
    ema_alignment: clampPercentage(data.ema_alignment),
    pnl: validatePnL(data.pnl || data.unrealized_pnl),
    position: validatePosition(data.position),
    position_size: validatePositionSize(data.position_size),
    timestamp: validateTimestamp(data.timestamp),
    entry_price: validatePrice(data.entry_price),
    stop_loss: validatePrice(data.stop_loss),
    target_price: validatePrice(data.target_price),
    target1: validatePrice(data.target1),
    target2: validatePrice(data.target2),
    overall_signal_strength: clampPercentage(data.overall_signal_strength),
    signal_probability_long: clampProbability(data.signal_probability_long),
    signal_probability_short: clampProbability(data.signal_probability_short),
    ema_alignment_score: clampPercentage(data.ema_alignment_score),
    ml_long_probability: clampProbability(data.ml_long_probability),
    ml_short_probability: clampProbability(data.ml_short_probability),
    ml_confidence_level: clampProbability(data.ml_confidence_level),
    bid: validatePrice(data.bid),
    ask: validatePrice(data.ask),
    spread: validatePrice(data.spread),
    volume: validatePositionSize(data.volume),
    next_long_entry_level: validatePrice(data.next_long_entry_level),
    next_short_entry_level: validatePrice(data.next_short_entry_level),
    long_entry_quality: clampProbability(data.long_entry_quality),
    short_entry_quality: clampProbability(data.short_entry_quality)
  }

  // Copy string fields safely
  if (typeof data.strategy_name === 'string') validated.strategy_name = data.strategy_name
  if (typeof data.strategy_instance_id === 'string') validated.strategy_instance_id = data.strategy_instance_id
  if (typeof data.htf_bias === 'string') validated.htf_bias = data.htf_bias
  if (typeof data.volatility_state === 'string') validated.volatility_state = data.volatility_state
  if (typeof data.market_regime === 'string') validated.market_regime = data.market_regime
  if (typeof data.ml_market_regime === 'string') validated.ml_market_regime = data.ml_market_regime
  if (typeof data.ml_trade_recommendation === 'string') validated.ml_trade_recommendation = data.ml_trade_recommendation
  if (typeof data.ml_mode === 'string') validated.ml_mode = data.ml_mode
  if (typeof data.last_ml_update === 'string') validated.last_ml_update = data.last_ml_update
  if (typeof data.data_source === 'string') validated.data_source = data.data_source

  return validated
}

// Performance monitoring
export class PerformanceMonitor {
  private static renderCount = 0
  private static lastRenderTime = Date.now()
  private static renderTimes: number[] = []

  static trackRender(componentName: string) {
    this.renderCount++
    const now = Date.now()
    const timeSinceLastRender = now - this.lastRenderTime
    this.renderTimes.push(timeSinceLastRender)
    
    // Keep only last 100 render times
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift()
    }
    
    this.lastRenderTime = now
    
    // Log performance warnings
    if (timeSinceLastRender < 16) { // More than 60 FPS
      console.warn(`⚠️ ${componentName} rendering very frequently (${timeSinceLastRender}ms since last render)`)
    }
    
    if (this.renderCount % 100 === 0) {
      const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      console.log(`📊 Performance: ${this.renderCount} renders, avg time between renders: ${avgRenderTime.toFixed(1)}ms`)
    }
  }

  static getStats() {
    return {
      totalRenders: this.renderCount,
      averageTimeBetweenRenders: this.renderTimes.length > 0 
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length 
        : 0
    }
  }
} 