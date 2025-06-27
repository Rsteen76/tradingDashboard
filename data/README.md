# Trading System Data Directory

## Overview
This directory contains persistent data storage for the enhanced trading system components.

## Directory Structure

```
data/
├── trade-outcomes.json         # Complete trade lifecycle data
├── performance-metrics.json    # AI Performance monitoring data
├── system-health.json         # System health history
├── alerts-history.json        # Alert history and acknowledgments
├── model-performance.json     # ML model accuracy tracking
└── backups/                   # Automated backups
    ├── daily/
    ├── weekly/
    └── emergency/
```

## Data Files

### trade-outcomes.json
- Complete trade lifecycle tracking
- Entry/exit data with market context
- Performance analytics and patterns
- Success/failure pattern analysis

### performance-metrics.json  
- Real-time system performance data
- Trading performance metrics
- Risk management statistics
- Learning progress tracking

### system-health.json
- CPU, memory, and system health data
- Connection status monitoring
- API latency tracking
- Uptime and availability metrics

### alerts-history.json
- All system alerts and warnings
- Alert acknowledgment status
- Resolution tracking
- Alert frequency analysis

### model-performance.json
- Individual model accuracy tracking
- Ensemble performance data
- Prediction vs outcome analysis
- Model weight adjustments

## Backup Strategy

- **Real-time**: Critical data saved immediately
- **Every 5 minutes**: Performance metrics
- **Hourly**: Complete system state
- **Daily**: Full backup with rotation
- **Weekly**: Archive backup

## Data Retention

- **Real-time data**: 7 days
- **Daily summaries**: 3 months  
- **Weekly summaries**: 1 year
- **Monthly summaries**: Permanent

## Security

- Local storage only
- No sensitive account information
- Encrypted backups (optional)
- Access logging enabled 