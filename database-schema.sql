-- ML Trading Server Database Schema
-- PostgreSQL database schema for storing ML predictions, market data, and training data

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS market_data CASCADE;
DROP TABLE IF EXISTS training_data CASCADE;

-- ML predictions table
CREATE TABLE ml_predictions (
  id SERIAL PRIMARY KEY,
  instrument VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  direction VARCHAR(10) NOT NULL,
  long_prob DECIMAL(5,4) NOT NULL,
  short_prob DECIMAL(5,4) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  strength DECIMAL(5,4),
  recommendation VARCHAR(20),
  features JSONB,
  model_versions JSONB,
  processing_time INTEGER,
  correct BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market data table
CREATE TABLE market_data (
  instrument VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  volume INTEGER,
  bid DECIMAL(10,2),
  ask DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  open DECIMAL(10,2),
  rsi DECIMAL(5,2),
  ema_alignment DECIMAL(5,4),
  macd DECIMAL(8,4),
  bollinger_upper DECIMAL(10,2),
  bollinger_lower DECIMAL(10,2),
  bollinger_middle DECIMAL(10,2),
  atr DECIMAL(8,4),
  obv BIGINT,
  vwap DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (instrument, timestamp)
);

-- Training data table
CREATE TABLE training_data (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  features FLOAT[] NOT NULL,
  label JSONB NOT NULL,
  quality_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model performance tracking table
CREATE TABLE model_performance (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL,
  accuracy DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_ml_predictions_instrument_timestamp ON ml_predictions(instrument, timestamp);
CREATE INDEX idx_ml_predictions_direction ON ml_predictions(direction);
CREATE INDEX idx_ml_predictions_confidence ON ml_predictions(confidence);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);
CREATE INDEX idx_market_data_price ON market_data(price);
CREATE INDEX idx_training_data_model_timestamp ON training_data(model_name, timestamp);
CREATE INDEX idx_model_performance_name_version ON model_performance(model_name, version);

-- Create views for common queries
CREATE VIEW recent_predictions AS
SELECT 
  instrument,
  timestamp,
  direction,
  confidence,
  strength,
  recommendation,
  processing_time
FROM ml_predictions 
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

CREATE VIEW model_accuracy_summary AS
SELECT 
  model_name,
  version,
  COUNT(*) as total_predictions,
  AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END) as accuracy,
  AVG(confidence) as avg_confidence,
  AVG(processing_time) as avg_processing_time
FROM ml_predictions mp
JOIN model_performance perf ON POSITION(model_name IN perf.model_name) > 0
WHERE mp.timestamp > NOW() - INTERVAL '7 days'
GROUP BY model_name, version;

-- Insert some initial model performance records
INSERT INTO model_performance (model_name, version, accuracy, total_predictions, correct_predictions, metadata) VALUES
('lstm', '2.1.0', 0.0, 0, 0, '{"type": "timeseries", "architecture": "LSTM"}'),
('transformer', '1.3.0', 0.0, 0, 0, '{"type": "pattern", "architecture": "Transformer"}'),
('randomForest', '1.2.0', 0.0, 0, 0, '{"type": "ensemble", "architecture": "Random Forest"}'),
('xgboost', '2.0.0', 0.0, 0, 0, '{"type": "boosting", "architecture": "XGBoost"}'),
('dqn', '1.1.0', 0.0, 0, 0, '{"type": "reinforcement", "architecture": "Deep Q-Network"}') 