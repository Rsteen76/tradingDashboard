export interface Settings {
  min_confidence: number;
  strong_confidence: number;
  min_strength: number;
  auto_trading_enabled: boolean;
  model_weights: {
    lstm: number;
    transformer: number;
    random_forest: number;
    xgboost: number;
    dqn: number;
  };
  trailing_confidence_threshold: number;
  trailing_update_interval: number;
  max_stop_movement_atr: number;
  min_profit_target: number;
  max_position_size: number;
  max_daily_risk: number;
  volatility_adjustment: number;
  pattern_confidence_threshold: number;
  regime_change_threshold: number;
  momentum_threshold: number;
  breakout_strength: number;
  daily_loss: number;
  consecutive_losses: number;
  trading_disabled: boolean;
  max_daily_risk: number;
  max_consecutive_losses: number;
  exec_threshold?: number;
  daily_loss_limit?: number;
  consecutive_loss_limit?: number;
  trading_status?: boolean;
} 