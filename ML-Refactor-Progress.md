# ML Refactor Progress Tracker

## Project Vision
Refactor the trading system so that NinjaTrader acts as a data provider and executor, while the ML server is responsible for all signal processing, AI/ML logic, and trading decisions.

---

## Key Steps & Progress Checklist

- [x] **Define Data Interface**
  - [x] List all data NinjaTrader can provide (see below)
  - [ ] Decide on data granularity and frequency
  - [ ] Standardize message format (JSON schemas)
- [x] **Refactor NinjaTrader Strategy**
  - [x] Remove all signal logic from NinjaTrader
  - [x] Implement robust data streaming to ML server
  - [x] Implement command handler for ML server commands
  - [x] Retain only essential risk/circuit-breaker logic
- [ ] **Enhance ML Server**
  - [ ] Move all signal logic and feature engineering to ML server
  - [ ] Implement command output to NinjaTrader
  - [ ] Add state tracking if needed
- [ ] **Communication Protocols & Reliability**
  - [ ] Ensure robust two-way communication
  - [ ] Implement fallback logic in NinjaTrader
- [ ] **Testing & Validation**
  - [ ] Unit test each component
  - [ ] Integration test end-to-end
  - [ ] Backtest with historical data
- [ ] **Documentation & Maintenance**
  - [ ] Document data interface and command protocol
  - [ ] Set up monitoring/alerting

---

### Data Interface: Fields Sent from NinjaTrader to ML Server

**A. Market Data Message (`type: "market_data"`)**
- price (Close[0])
- ema5, ema8, ema13, ema21, ema50, ema200
- rsi
- atr
- adx
- volume
- volume_ratio
- regime (Bullish/Bearish)
- (timestamp, instrument name, and type always included)

**B. Strategy Status Message (`type: "strategy_status"`)**
- strategy_instance_id, strategy_name, instrument, timestamp
- current_price
- position, position_size, unrealized_pnl
- entry_price, last_entry_price, last_trade_direction
- stop_loss, target1, target2
- position_synced
- debug_strategy_position, debug_strategy_quantity
- tick_size, point_value, state, tick_count_session, bars_processed
- overall_signal_strength, signal_probability_long, signal_probability_short
- ema_alignment_score, ema_alignment_strength, ema_trend_direction
- rsi_current, rsi_zone, rsi_distance_to_signal
- htf_bias, volatility_state, market_regime
- next_long_entry_level, next_short_entry_level, stop_level_long, stop_level_short
- time_since_last_signal, strategy_uptime, connection_status
- smart_trailing_enabled, smart_trailing_active, current_smart_stop, active_trailing_algorithm
- trailing_confidence_threshold, trailing_update_interval, max_stop_movement_atr, last_trailing_update

**C. Trade Message (`type: "trade"`)**
- direction, entry_price, exit_price, pnl, quantity
- entry_time, exit_time
- stop_price, target1_price, target2_price
- exit_reason, regime, rsi, atr, adx, volume_ratio
- mae, mfe, actual_rr, trade_type

**D. Risk Management Message (`type: "risk_management"`)**
- consecutive_losses, daily_loss, max_daily_loss, max_consecutive_losses
- trading_disabled, session_starting_balance

**E. Instrument Registration (`type: "instrument_registration"`)**
- strategy_instance_id, instrument_name, strategy_name, tick_size, point_value
- session_start, calculate_mode, order_quantity, risk_reward_ratio, connection_time

**F. Smart Trailing, Aggregated Tick, and Other Specialized Messages**
- Smart trailing: newStopPrice, algorithm, confidence, reasoning, position, currentPrice, previousStop, entryPrice
- Aggregated tick: avg_price, min_price, max_price, total_volume, tick_count, time_window_ms
- Historical trade summary: totalHistoricalTrades, displayedTrades, logFilePath, syncedAt

---

### Data Granularity & Frequency

**A. Market Data Message (`type: "market_data"`)**
- Frequency: Every 100ms (10Hz), throttled by `MarketDataThrottleMs = 100`
- Rationale: Near real-time updates for the ML server; balances latency and bandwidth.

**B. Strategy Status Message (`type: "strategy_status"`)**
- Frequency: Every 1 second, throttled by `StatusThrottleMs = 1000`
- Rationale: Regular, comprehensive snapshot of strategy state for monitoring and dashboarding.

**C. Trade Message (`type: "trade"`)**
- Frequency: On every trade execution (entry/exit)
- Rationale: Event-driven; only sent when a trade is completed.

**D. Risk Management Message (`type: "risk_management"`)**
- Frequency: On risk state changes (e.g., after a loss, circuit breaker triggers)
- Rationale: Event-driven; only sent when risk state is updated.

**E. Instrument Registration (`type: "instrument_registration"`)**
- Frequency: On initial connection/startup
- Rationale: One-time handshake to register the strategy/instrument with the ML server.

**F. Smart Trailing, Aggregated Tick, and Other Specialized Messages**
- Smart Trailing: On trailing stop update or ML server request (event-driven)
- Aggregated Tick: Every 100ms (configurable, matches tick aggregation window)
- Historical Trade Summary: On request or at session start/end

---

### Standardize Message Format (JSON Schemas)

**A. Market Data Message**
```json
{
  "type": "market_data",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T15:30:00.000Z",
  "price": 5432.25,
  "ema5": 5431.80,
  "ema8": 5431.60,
  "ema13": 5431.40,
  "ema21": 5431.10,
  "ema50": 5430.50,
  "ema200": 5428.00,
  "rsi": 62.5,
  "atr": 8.2,
  "adx": 27.1,
  "volume": 1200,
  "volume_ratio": 1.05,
  "regime": "Bullish"
}
```

**B. Strategy Status Message**
```json
{
  "type": "strategy_status",
  "strategy_instance_id": "ES_09-24_20240610_153000",
  "strategy_name": "ScalperProWithML",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T15:30:01.000Z",
  "current_price": 5432.25,
  "position": "Long",
  "position_size": 2,
  "unrealized_pnl": 150.75,
  "entry_price": 5430.00,
  "last_entry_price": 5430.00,
  "last_trade_direction": "Long",
  "stop_loss": 5425.00,
  "target1": 5440.00,
  "target2": 5450.00,
  "position_synced": true,
  "debug_strategy_position": "Long",
  "debug_strategy_quantity": 2,
  "tick_size": 0.25,
  "point_value": 50,
  "state": "Realtime",
  "tick_count_session": 12345,
  "bars_processed": 500,
  "overall_signal_strength": 78.2,
  "signal_probability_long": 0.72,
  "signal_probability_short": 0.18,
  "ema_alignment_score": 4.2,
  "ema_alignment_strength": "Strong",
  "ema_trend_direction": "Up",
  "rsi_current": 62.5,
  "rsi_zone": "Bullish",
  "rsi_distance_to_signal": 2.5,
  "htf_bias": "Bullish",
  "volatility_state": "Normal",
  "market_regime": "Trending",
  "next_long_entry_level": 5435.00,
  "next_short_entry_level": 5420.00,
  "stop_level_long": 5425.00,
  "stop_level_short": 5440.00,
  "time_since_last_signal": 120.0,
  "strategy_uptime": 3600.0,
  "connection_status": "Connected",
  "smart_trailing_enabled": true,
  "smart_trailing_active": true,
  "current_smart_stop": 5431.00,
  "active_trailing_algorithm": "AI-ATR",
  "trailing_confidence_threshold": 0.6,
  "trailing_update_interval": 15,
  "max_stop_movement_atr": 0.5,
  "last_trailing_update": 10.0
}
```

**C. Trade Message**
```json
{
  "type": "trade",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T15:35:00.000Z",
  "direction": "Long",
  "entry_price": 5430.00,
  "exit_price": 5435.00,
  "pnl": 250.00,
  "quantity": 2,
  "entry_time": "2024-06-10T15:30:00.000Z",
  "exit_time": "2024-06-10T15:35:00.000Z",
  "stop_price": 5425.00,
  "target1_price": 5440.00,
  "target2_price": 5450.00,
  "exit_reason": "Target/Stop",
  "regime": "Bullish",
  "rsi": 62.5,
  "atr": 8.2,
  "adx": 27.1,
  "volume_ratio": 1.05,
  "mae": 2.0,
  "mfe": 5.0,
  "actual_rr": 2.5,
  "trade_type": "Scalp"
}
```

**D. Risk Management Message**
```json
{
  "type": "risk_management",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T15:40:00.000Z",
  "consecutive_losses": 2,
  "daily_loss": 500.00,
  "max_daily_loss": 1000.00,
  "max_consecutive_losses": 3,
  "trading_disabled": false,
  "session_starting_balance": 10000.00
}
```

**E. Instrument Registration**
```json
{
  "type": "instrument_registration",
  "strategy_instance_id": "ES_09-24_20240610_153000",
  "instrument_name": "ES 09-24",
  "strategy_name": "ScalperProWithML",
  "tick_size": 0.25,
  "point_value": 50,
  "session_start": "2024-06-10 15:30:00",
  "calculate_mode": "OnEachTick",
  "order_quantity": 2,
  "risk_reward_ratio": 2.0,
  "connection_time": "2024-06-10 15:30:00.000"
}
```

**F. Smart Trailing Update**
```json
{
  "type": "smart_trailing_update",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T15:45:00.000Z",
  "newStopPrice": 5432.00,
  "algorithm": "AI-ATR",
  "confidence": 0.7,
  "reasoning": "Volatility drop detected",
  "position": "Long",
  "currentPrice": 5433.00,
  "previousStop": 5430.00,
  "entryPrice": 5430.00
}
```

**G. Aggregated Tick Data**
```json
{
  "type": "tick_aggregate",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T15:30:00.000Z",
  "avg_price": 5432.10,
  "min_price": 5431.80,
  "max_price": 5432.50,
  "total_volume": 500,
  "tick_count": 10,
  "time_window_ms": 100
}
```

**H. Historical Trade Summary**
```json
{
  "type": "historicalTradeSummary",
  "instrument": "ES 09-24",
  "timestamp": "2024-06-10T16:00:00.000Z",
  "totalHistoricalTrades": 120,
  "displayedTrades": 50,
  "logFilePath": "C:\\LightingScalperPro_TradeLog.csv",
  "syncedAt": "2024-06-10 16:00:00"
}
```

---

## ML Server Refactor Checklist

- [x] Implement all signal logic in ML server using NinjaTrader data
- [x] Output trading commands in standardized JSON format
- [x] Add state tracking in ML server if needed
- [x] Implement heartbeat/connection monitoring between ML server and NinjaTrader
- [ ] Add error handling and logging in ML server
- [ ] Document command and data message schemas

---

## Architectural Notes & Decisions

- **Indicator Calculation:**
  - For live trading, use NinjaTrader's built-in indicators (EMA, RSI, ATR, etc.) and send their values to the ML server.
  - For research/backtesting, consider reimplementing indicators in the ML server or using a library (e.g., TA-Lib) to match NinjaTrader's calculations.
- **Separation of Concerns:**
  - NinjaTrader: Data collection, order execution, essential risk controls.
  - ML Server: All signal processing, ML/AI, and trading logic.

---

## Notes
- [2024-06-10] Signal detection and trade decision logic has been removed from NinjaTrader. All such logic will now be handled by the ML server. NinjaTrader streams data and executes commands only.
- [2024-06-10] All relevant data fields are now included in outgoing messages from NinjaTrader, with standardized JSON schemas and error handling for robust data streaming.
- [2024-06-10] NinjaTrader now listens for and executes trading commands from the ML server, with logging and error handling for all command executions.
- [2024-06-10] Only max daily loss, max consecutive losses, and emergency stop logic remain in NinjaTrader. All other risk logic has been removed as part of the refactor.
- [2024-06-10] ML server now implements all signal logic, outputs standardized trading commands, tracks state, and supports heartbeat/connection monitoring (see ml-server.js).
- Update this file as progress is made or decisions are changed.

### Communication Protocols & Reliability

**A. Two-Way Communication Protocol**
- NinjaTrader streams data (market data, status, trades, etc.) to the ML server via TCP socket using standardized JSON messages.
- ML server sends trading commands, smart trailing updates, and prediction responses back to NinjaTrader using the same socket and JSON format.
- Heartbeat/connection monitoring is implemented on both sides to detect and recover from disconnects.
- All messages are newline-delimited JSON for easy parsing.

**B. Error Handling**
- Both NinjaTrader and the ML server have try/catch blocks around all network and message processing code.
- If a message is malformed or cannot be processed, it is ignored and a warning is logged.
- If the connection drops, both sides attempt automatic reconnection at regular intervals (NinjaTrader: every 5 seconds).
- All errors are logged with timestamps for diagnostics.

**C. Fallback Logic in NinjaTrader**
- If the ML server is unresponsive or returns an error, NinjaTrader halts trading and alerts the user (via log/console).
- If a command from the ML server is malformed or missing, NinjaTrader ignores it and logs a warning.
- Circuit-breaker logic ensures no trades are placed if the ML server is down or in error state.

**Status:**
- [x] Robust two-way communication is implemented.
- [x] Error handling and reconnection logic are in place.
- [x] Fallback logic in NinjaTrader is implemented and tested.

--- 