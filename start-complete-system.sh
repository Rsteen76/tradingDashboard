#!/bin/bash

echo "🚀 Starting Complete ScalperPro ML Trading System..."
echo

# Function to kill processes by name
kill_process() {
    local process_name=$1
    echo "🔄 Stopping $process_name processes..."
    
    # Kill Node.js processes
    if [ "$process_name" = "node" ]; then
        pkill -f "node.exe" 2>/dev/null || taskkill //F //IM node.exe 2>/dev/null || true
    # Kill Redis processes
    elif [ "$process_name" = "redis" ]; then
        pkill -f "redis-server" 2>/dev/null || taskkill //F //IM redis-server.exe 2>/dev/null || true
    fi
    
    echo "✅ $process_name processes stopped"
}

# ================================================================
# STEP 1: Kill all existing processes first
# ================================================================
echo "🧹 Cleaning up existing processes..."
kill_process "node"
kill_process "redis"

# Wait for ports to be freed
echo "⏱️ Waiting for ports to be freed..."
sleep 3

# ================================================================
# STEP 2: Check dependencies
# ================================================================
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "🔄 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        read -p "Press any key to continue..."
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

# ================================================================
# STEP 3: Start Redis Server (optional)
# ================================================================
echo "🗄️ Starting Redis server..."
if [ -f "redis/redis-server.exe" ]; then
    cd redis && ./redis-server.exe redis.windows.conf &
    cd ..
    echo "✅ Redis server starting..."
    sleep 3
else
    echo "⚠️ Redis server not found, continuing without Redis"
fi

# ================================================================
# STEP 4: Setup Database (optional)
# ================================================================
echo "🗄️ Setting up database..."
export DATABASE_URL="postgresql://postgres:3191@localhost:5432/trading_ml"

# Try to create database (ignore errors if already exists)
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE trading_ml;" 2>/dev/null || true
psql -U postgres -h localhost -p 5432 -d trading_ml -f database-schema.sql 2>/dev/null || true

echo "✅ Database setup completed (or skipped if PostgreSQL unavailable)"

# ================================================================
# STEP 5: Start ML Server
# ================================================================
echo "🤖 Starting ML Server..."
if [ -f "ml-server.js" ]; then
    # Start ML server in background
    node ml-server.js &
    ML_PID=$!
    echo "✅ ML server starting on ports 8080 (web) and 9999 (NinjaTrader)"
    echo "   Process ID: $ML_PID"
    
    # Wait for ML server to initialize
    echo "⏱️ Waiting for ML server initialization..."
    sleep 15
else
    echo "❌ ml-server.js not found"
    echo "  Make sure you're running this from the correct directory"
    read -p "Press any key to continue..."
    exit 1
fi

# ================================================================
# STEP 6: Start Dashboard
# ================================================================
echo "🌐 Starting Trading Dashboard..."
if [ -f "src/app/page.tsx" ]; then
    # Start dashboard in background
    npm run dev:dashboard &
    DASH_PID=$!
    echo "✅ Trading dashboard starting on port 3000"
    echo "   Process ID: $DASH_PID"
    
    # Wait for dashboard to compile
    echo "⏱️ Waiting for dashboard to compile..."
    sleep 8
else
    echo "❌ Dashboard source files not found"
    echo "  Make sure the src directory exists"
    read -p "Press any key to continue..."
    exit 1
fi

# ================================================================
# STEP 7: Open Browser
# ================================================================
echo "🌏 Opening trading dashboard in browser..."
sleep 3

# Try different ways to open browser
if command -v start >/dev/null 2>&1; then
    start http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000
elif command -v open >/dev/null 2>&1; then
    open http://localhost:3000
else
    echo "   Manual: Please open http://localhost:3000 in your browser"
fi

# ================================================================
# SYSTEM READY
# ================================================================
echo
echo "================================================"
echo "🎉 COMPLETE TRADING SYSTEM STARTED! 🎉"
echo "================================================"
echo
echo "📊 Services Running:"
echo "  🗄️ Redis Server:        localhost:6379"
echo "  🐘 PostgreSQL DB:       localhost:5432/trading_ml"
echo "  🤖 ML Server:           http://localhost:8080"
echo "  🎯 NinjaTrader TCP:     localhost:9999"
echo "  🌐 Trading Dashboard:   http://localhost:3000"
echo
echo "📋 Quick Links:"
echo "  🔍 Health Check:        http://localhost:8080/health"
echo "  📈 ML Metrics:          http://localhost:8080/metrics"
echo "  🌐 Dashboard:           http://localhost:3000"
echo
echo "⚡ The system is now ready for trading!"
echo "  Start your NinjaTrader strategy to begin trading."
echo
echo "🛑 To stop all processes: ./stop-all-processes.sh or Ctrl+C"
echo
echo "Process IDs for manual killing if needed:"
echo "  ML Server: $ML_PID"
echo "  Dashboard: $DASH_PID"
echo

# Wait for user input or Ctrl+C
echo "Press Ctrl+C to stop all processes, or any key to exit this script (processes will continue)..."
read -n 1 