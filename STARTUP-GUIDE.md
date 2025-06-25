# ScalperPro ML Trading System - Complete Startup Guide

## Required Services

Your trading system needs these 5 services running:

### 1. PostgreSQL Database
- **Install**: Download from https://www.postgresql.org/download/windows/
- **Default**: localhost:5432
- **Setup**: Run `node setup-database.js` (creates `trading_ml` database)

### 2. Redis Server (included locally)
```bash
cd redis
redis-server.exe redis.windows.conf
```

### 3. NinjaTrader (External)
- **Port**: 9999
- **Status**: Should already be running with your trading setup

### 4. ML Server
```bash
node ml-server.js
```
- **Port**: 8080
- **Function**: Processes trading data, ML predictions

### 5. Web Dashboard
```bash
npm run dev
```
- **Port**: 3000
- **URL**: http://localhost:3000

## Quick Start Options

### Option 1: Complete Script (Recommended)
```bash
start-complete-system.bat
```
This starts Redis, sets up database, ML server, and dashboard.

### Option 2: Original Script (Missing Redis/PostgreSQL)
```bash
start-dashboard.bat
```
You need to manually start Redis and ensure PostgreSQL is running.

### Option 3: Manual (4 separate terminals)
1. `cd redis && redis-server.exe redis.windows.conf`
2. `node setup-database.js` (one-time setup)
3. `node ml-server.js`
4. `npm run dev`

## Service Dependencies

```
NinjaTrader (9999) → ML Server (8080) → Dashboard (3000)
                      ↓
                   PostgreSQL (5432)
                   Redis (6379)
```

## Troubleshooting

**Database Issues**: Make sure PostgreSQL is installed and running
**Redis Issues**: Use the local Redis in the `redis/` folder
**Connection Issues**: Check if all ports are available and not blocked
**Loading Issues**: Ensure ML server (port 8080) is running before dashboard

## URLs After Startup

- 🌐 **Dashboard**: http://localhost:3000
- 📡 **ML API Health**: http://localhost:8080/health
- 📊 **Redis**: localhost:6379 (internal)
- 🗄️ **Database**: localhost:5432/trading_ml (internal) 