# ML Trading Server Setup Guide

## 🤖 Overview

This is a comprehensive AI/ML trading server that provides:

- **Real-time ML predictions** using multiple model ensemble
- **5 Advanced ML Models**: LSTM, Transformer, Random Forest, XGBoost, DQN
- **Feature Engineering Pipeline** with 50+ technical indicators
- **Online Learning System** for continuous model improvement
- **WebSocket & TCP APIs** for real-time integration
- **PostgreSQL Database** for data persistence
- **Redis Caching** for high-performance predictions

## 📋 Prerequisites

### Required Software
1. **Node.js** (v18+ recommended)
2. **PostgreSQL** (v12+ recommended)
3. **Redis** (v6+ recommended)
4. **Git** for cloning

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **CPU**: Multi-core processor (4+ cores recommended)
- **Storage**: 10GB free space minimum
- **Network**: Stable internet connection

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm run setup
```

This will:
- Install all required npm packages
- Setup the PostgreSQL database
- Create required tables and indexes

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/trading_ml
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trading_ml
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
PORT=8080
NODE_ENV=production
```

### 3. Manual Database Setup (Alternative)

If automatic setup fails:

```bash
# Create PostgreSQL database
createdb trading_ml

# Run schema setup
psql trading_ml < database-schema.sql

# Or use the setup script
node setup-database.js
```

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run ml-server
```

### Production Mode
```bash
NODE_ENV=production npm run ml-server
```

The server will start on:
- **Dashboard**: http://localhost:8080
- **NinjaTrader TCP**: localhost:9999
- **WebSocket API**: ws://localhost:8080

## 📊 Dependencies Verification

The ML server requires these specific dependencies:

```json
{
  "dependencies": {
    "@tensorflow/tfjs-node": "^4.x",
    "random-forest-classifier": "^0.6.0",
    "ml-xgboost": "*",
    "bull": "^4.x",
    "ioredis": "^5.x",
    "pg": "^8.x",
    "express": "^4.x",
    "socket.io": "^4.x",
    "lru-cache": "^7.x"
  }
}
```

## 🗄️ Database Schema

The system uses PostgreSQL with the following tables:

### ml_predictions
Stores ML model predictions with confidence scores
```sql
CREATE TABLE ml_predictions (
  id SERIAL PRIMARY KEY,
  instrument VARCHAR(50),
  timestamp TIMESTAMP,
  direction VARCHAR(10),
  long_prob DECIMAL(5,4),
  short_prob DECIMAL(5,4),
  confidence DECIMAL(5,4),
  strength DECIMAL(5,4),
  recommendation VARCHAR(20),
  features JSONB,
  model_versions JSONB,
  processing_time INTEGER,
  correct BOOLEAN
);
```

### market_data
Stores real-time market data with technical indicators
```sql
CREATE TABLE market_data (
  instrument VARCHAR(50),
  timestamp TIMESTAMP,
  price DECIMAL(10,2),
  volume INTEGER,
  bid DECIMAL(10,2),
  ask DECIMAL(10,2),
  rsi DECIMAL(5,2),
  ema_alignment DECIMAL(5,4),
  -- Plus 10+ additional technical indicators
  PRIMARY KEY (instrument, timestamp)
);
```

### training_data
Stores labeled data for online learning
```sql
CREATE TABLE training_data (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(50),
  timestamp TIMESTAMP,
  features FLOAT[],
  label JSONB
);
```

## 🤖 ML Models Architecture

### 1. LSTM (Long Short-Term Memory)
- **Purpose**: Time series prediction
- **Input**: 60 timesteps × 15 features
- **Output**: [price_direction, confidence, volatility]
- **Architecture**: 3-layer LSTM with dropout

### 2. Transformer
- **Purpose**: Pattern recognition
- **Input**: 100 timesteps × 20 features
- **Output**: [trend_strength, reversal_prob, breakout_prob, volatility, confidence]
- **Architecture**: CNN-based architecture (as a robust alternative, as Multi-head attention was not available in the current TFJS environment)

### 3. Random Forest
- **Purpose**: Feature importance and classification.
- **Library**: `random-forest-classifier`.
- **Configuration**: 100 estimators, max_depth=10 (for the classifier).
- **Output**: Direction classification with simulated confidence. A simple custom regressor object is also present.

### 4. XGBoost
- **Purpose**: High-performance gradient boosting.
- **Intended Library**: `ml-xgboost` (configured in `package.json`).
- **Current Status**: The server uses a custom-implemented `GradientBoostingClassifier` as a fallback. Full integration of a trained `ml-xgboost` model is a future enhancement.
- **Configuration (for custom fallback)**: nEstimators=50, eta=0.3, max_depth=6.
- **Output (of custom fallback)**: Binary classification probability.

### 5. Deep Q-Network (DQN)
- **Purpose**: Reinforcement learning for trading decisions
- **Input**: 30-dimensional state vector
- **Output**: [BUY, HOLD, SELL] Q-values
- **Architecture**: 4-layer neural network

## 🔧 API Endpoints

### WebSocket Events

#### Client → Server
```javascript
// Request ML prediction
socket.emit('request_ml_prediction', {
  instrument: 'ES',
  price: 4500.25,
  volume: 1000,
  rsi: 65.5,
  timestamp: '2024-01-01T12:00:00Z'
});

// Request model performance
socket.emit('request_model_performance');

// Request model retraining
socket.emit('request_model_retrain', 'lstm');
```

#### Server → Client
```javascript
// ML prediction result
socket.on('ml_prediction_result', (prediction) => {
  console.log(prediction.direction);     // 'LONG' or 'SHORT'
  console.log(prediction.confidence);    // 0.0 to 1.0
  console.log(prediction.strength);      // Signal strength
  console.log(prediction.recommendation); // 'STRONG_SIGNAL', etc.
});

// Model performance metrics
socket.on('model_performance', (metrics) => {
  console.log(metrics.accuracy);
  console.log(metrics.totalPredictions);
});
```

### TCP Protocol (NinjaTrader)

#### Prediction Request
```json
{
  "type": "ml_prediction_request",
  "instrument": "ES",
  "price": 4500.25,
  "volume": 1000,
  "rsi": 65.5,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Prediction Response
```json
{
  "type": "ml_prediction_response",
  "instrument": "ES",
  "direction": "LONG",
  "long_probability": 0.75,
  "short_probability": 0.25,
  "confidence": 0.80,
  "strength": 0.65,
  "recommendation": "STRONG_SIGNAL",
  "processing_time": 150
}
```

## 🧪 Testing

### Test ML System
```bash
npm run test-ml
```

### Test Individual Components
```bash
# Test database connection
node -e "require('./ml-server.js')"

# Test Redis connection
redis-cli ping

# Test model predictions
node test-learning-system.js
```

## 📈 Performance Monitoring

The system tracks:
- **Prediction Accuracy**: Real-time model performance
- **Processing Time**: Average prediction latency
- **Model Contributions**: Ensemble weight distribution
- **Feature Quality**: Input data quality scores

### Performance Views
```sql
-- Recent predictions
SELECT * FROM recent_predictions LIMIT 10;

-- Model accuracy summary
SELECT * FROM model_accuracy_summary;
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d trading_ml
```

#### 2. Redis Connection Error
```bash
# Check Redis service
sudo systemctl status redis

# Test connection
redis-cli ping
```

#### 3. ML Model Loading Error
```bash
# Check TensorFlow installation
node -e "console.log(require('@tensorflow/tfjs-node').version)"

# Clear model cache
rm -rf ./models/
```

#### 4. Memory Issues
- Increase Node.js heap size: `node --max-old-space-size=4096 ml-server.js`
- Monitor memory usage: `node --inspect ml-server.js`

### Performance Optimization

1. **Database Indexing**: Ensure all indexes are created
2. **Redis Caching**: Use appropriate TTL values
3. **Model Batching**: Process multiple predictions together
4. **Feature Caching**: Cache expensive feature calculations

## 🔐 Security Considerations

1. **Database**: Use strong passwords and SSL connections
2. **Redis**: Configure authentication and firewall rules
3. **Network**: Restrict TCP port access to trusted IPs
4. **Monitoring**: Log all prediction requests and responses

## 📚 Advanced Configuration

### Model Ensemble Weights
Adjust in `ml-server.js`:
```javascript
this.ensembleWeights = {
  lstm: 0.3,        // 30%
  transformer: 0.25, // 25%
  randomForest: 0.2, // 20%
  xgboost: 0.15,    // 15%
  dqn: 0.1          // 10%
}
```

### Feature Engineering
Customize in `FeatureEngineer` class:
- Add new technical indicators
- Modify normalization methods
- Implement custom feature extractors

### Online Learning
Configure in `OnlineLearningSystem`:
- Adjust learning buffer size
- Modify update frequency
- Customize performance metrics

## 🚀 Production Deployment

### Docker Setup
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080 9999
CMD ["npm", "run", "ml-server"]
```

### PM2 Process Manager
```bash
npm install -g pm2
pm2 start ml-server.js --name "ml-trading-server"
pm2 startup
pm2 save
```

### Monitoring & Logging
- Use PM2 for process monitoring
- Configure log rotation
- Set up health check endpoints
- Monitor database performance

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Test individual components
4. Check database connectivity

The ML server is designed to be robust and self-healing, with comprehensive error handling and automatic recovery mechanisms. 