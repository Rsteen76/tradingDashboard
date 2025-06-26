import { useState, useEffect } from 'react'
import { StrategyData, MarketData, StrategyStatus, TradeMessage, RiskManagement } from './useSocket'

interface ValidationError {
  field: string
  message: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function useDataValidation(data: StrategyData) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: []
  })

  useEffect(() => {
    const errors: ValidationError[] = []

    // Validate Market Data
    if (data.marketData) {
      validateMarketData(data.marketData, errors)
    }

    // Validate Strategy Status
    if (data.strategyStatus) {
      validateStrategyStatus(data.strategyStatus, errors)
    }

    // Validate Last Trade
    if (data.lastTrade) {
      validateTradeMessage(data.lastTrade, errors)
    }

    // Validate Risk Management
    if (data.riskManagement) {
      validateRiskManagement(data.riskManagement, errors)
    }

    // Format errors into readable messages
    const formattedErrors = errors.map(error => `${error.field}: ${error.message}`)

    setValidationResult({
      isValid: errors.length === 0,
      errors: formattedErrors
    })
  }, [data])

  return validationResult
}

function validateMarketData(data: MarketData, errors: ValidationError[]) {
  if (data.type !== 'market_data') {
    errors.push({
      field: 'marketData.type',
      message: 'Invalid message type'
    })
  }

  if (typeof data.price !== 'number' || data.price <= 0) {
    errors.push({
      field: 'marketData.price',
      message: 'Invalid price value'
    })
  }

  if (typeof data.rsi !== 'number' || data.rsi < 0 || data.rsi > 100) {
    errors.push({
      field: 'marketData.rsi',
      message: 'RSI must be between 0 and 100'
    })
  }

  if (typeof data.atr !== 'number' || data.atr < 0) {
    errors.push({
      field: 'marketData.atr',
      message: 'ATR must be positive'
    })
  }

  if (typeof data.volume !== 'number' || data.volume < 0) {
    errors.push({
      field: 'marketData.volume',
      message: 'Volume must be positive'
    })
  }
}

function validateStrategyStatus(data: StrategyStatus, errors: ValidationError[]) {
  if (data.type !== 'strategy_status') {
    errors.push({
      field: 'strategyStatus.type',
      message: 'Invalid message type'
    })
  }

  const pos = (data.position || '').toString().toLowerCase()
  if (!['long', 'short', 'flat', 'none', 'neutral'].includes(pos)) {
    errors.push({
      field: 'strategyStatus.position',
      message: 'Invalid position value'
    })
  }

  if (typeof data.position_size !== 'number' || data.position_size < 0) {
    errors.push({
      field: 'strategyStatus.position_size',
      message: 'Position size must be non-negative'
    })
  }

  if (
    typeof data.signal_probability_long !== 'number' ||
    data.signal_probability_long < 0 ||
    data.signal_probability_long > 100
  ) {
    errors.push({
      field: 'strategyStatus.signal_probability_long',
      message: 'Signal probability must be between 0 and 100'
    })
  }

  if (
    typeof data.signal_probability_short !== 'number' ||
    data.signal_probability_short < 0 ||
    data.signal_probability_short > 100
  ) {
    errors.push({
      field: 'strategyStatus.signal_probability_short',
      message: 'Signal probability must be between 0 and 100'
    })
  }
}

function validateTradeMessage(data: TradeMessage, errors: ValidationError[]) {
  if (data.type !== 'trade') {
    errors.push({
      field: 'trade.type',
      message: 'Invalid message type'
    })
  }

  if (!['Long', 'Short'].includes(data.direction)) {
    errors.push({
      field: 'trade.direction',
      message: 'Invalid trade direction'
    })
  }

  if (typeof data.entry_price !== 'number' || data.entry_price <= 0) {
    errors.push({
      field: 'trade.entry_price',
      message: 'Invalid entry price'
    })
  }

  if (typeof data.exit_price !== 'number' || data.exit_price <= 0) {
    errors.push({
      field: 'trade.exit_price',
      message: 'Invalid exit price'
    })
  }
}

function validateRiskManagement(data: RiskManagement, errors: ValidationError[]) {
  if (data.type !== 'risk_management') {
    errors.push({
      field: 'riskManagement.type',
      message: 'Invalid message type'
    })
  }

  if (typeof data.consecutive_losses !== 'number' || data.consecutive_losses < 0) {
    errors.push({
      field: 'riskManagement.consecutive_losses',
      message: 'Consecutive losses must be non-negative'
    })
  }

  if (typeof data.max_consecutive_losses !== 'number' || data.max_consecutive_losses <= 0) {
    errors.push({
      field: 'riskManagement.max_consecutive_losses',
      message: 'Max consecutive losses must be positive'
    })
  }

  if (typeof data.daily_loss !== 'number') {
    errors.push({
      field: 'riskManagement.daily_loss',
      message: 'Invalid daily loss value'
    })
  }

  if (typeof data.max_daily_loss !== 'number' || data.max_daily_loss <= 0) {
    errors.push({
      field: 'riskManagement.max_daily_loss',
      message: 'Max daily loss must be positive'
    })
  }
} 