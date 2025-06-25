#!/bin/bash

echo "Starting Complete ScalperPro ML Trading System..."
echo ""

# Start Redis Server
echo "Starting Redis Server..."
cmd //c "start \"Redis Server\" cmd /c \"cd /d d:\\Coding\\TradingDashboard\\redis && redis-server.exe redis.windows.conf\""
sleep 2

# Setup PostgreSQL Database (if needed)
echo "Setting up PostgreSQL Database..."
echo "  Note: Make sure PostgreSQL is installed and running on your system"
echo "  If password fails, set DB_PASSWORD environment variable"
echo ""

# Set the correct PostgreSQL password
export DB_PASSWORD=3191
echo "Using PostgreSQL password: 3191"
echo ""

node setup-database.js
if [ $? -ne 0 ]; then
    echo "Database setup failed - continuing anyway..."
    echo "You can run 'node setup-database.js' manually later"
    echo ""
fi

# Start ML Server
echo "Starting ML Server..."
cmd //c "start \"ML Server\" cmd /c \"cd /d d:\\Coding\\TradingDashboard && node server/ml-server.js\""
sleep 3

# Start Web Dashboard  
echo "Starting Web Dashboard..."
cmd //c "start \"Web Dashboard\" cmd /c \"cd /d d:\\Coding\\TradingDashboard && npm run dev\""
sleep 5

echo ""
echo "Complete Trading System Started!"
echo ""
echo "Active Services:"
echo "  Redis Server: localhost:6379"
echo "  PostgreSQL: localhost:5432/trading_ml"
echo "  ML Server: http://localhost:8080"
echo "  Dashboard: http://localhost:3000"
echo "  NinjaTrader: localhost:9999"
echo ""
echo "System URLs:"
echo "  Dashboard: http://localhost:3000"
echo "  ML API: http://localhost:8080/health"
echo ""
echo "Opening dashboard in browser..."

# Open browser
cmd //c "start http://localhost:3000" 