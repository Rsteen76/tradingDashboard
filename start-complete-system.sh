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

# Cross-platform sleep function
do_sleep() {
    local seconds=$1
    if command -v sleep >/dev/null 2>&1; then
        sleep "$seconds"
    else
        # Fallback for Windows Git Bash
        perl -e "select(undef,undef,undef,$seconds)" 2>/dev/null || sleep "$seconds" 2>/dev/null || ping -n "$seconds" 127.0.0.1 >nul 2>&1
    fi
}

# Function to open a new terminal window
open_terminal() {
    local title=$1
    local command=$2
    local working_dir=$3

    # Get the absolute path of the working directory
    local abs_path=$(cd "$working_dir" && pwd)

    # For Git Bash, we need to convert the path to Windows format
    if [ -n "$MSYSTEM" ] || [ "$OS" = "Windows_NT" ]; then
        # Convert /d/path to D:/path format
        abs_path=$(echo "$abs_path" | sed 's/^\/\([a-zA-Z]\)/\1:/' | sed 's/\//\\/g')
        
        # Escape special characters in the command
        local escaped_command=$(echo "$command" | sed 's/[&|<>^]/^&/g')
        
        # Use cmd.exe directly for better Windows compatibility
        cmd.exe /c "start \"ScalperPro - $title\" cmd.exe /k \"cd /d \"$abs_path\" && echo === $title === && $escaped_command\""
    else
        # Unix systems
        if command -v gnome-terminal >/dev/null 2>&1; then
            gnome-terminal --title="ScalperPro - $title" -- bash -c "cd \"$abs_path\" && echo '=== $title ===' && $command; read -p 'Press Enter to close...'"
        elif command -v xterm >/dev/null 2>&1; then
            xterm -T "ScalperPro - $title" -e "cd \"$abs_path\" && echo '=== $title ===' && $command; read -p 'Press Enter to close...'" &
        else
            (cd "$abs_path" && $command) &
            echo "⚠️ Could not open new terminal window for $title, running in background"
        fi
    fi
}

# ================================================================
# STEP 1: Kill all existing processes first
# ================================================================
echo "🧹 Cleaning up existing processes..."
kill_process "node"
kill_process "redis"

# Wait for ports to be freed
echo "⏱️ Waiting for ports to be freed..."
do_sleep 3

# ================================================================
# STEP 2: Check dependencies
# ================================================================
echo "📦 Checking ML Server dependencies..."
cd server
if [ ! -d "node_modules" ]; then
    echo "🔄 Installing ML Server dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install ML Server dependencies"
        cd ..
        read -p "Press any key to continue..."
        exit 1
    fi
else
    echo "✅ ML Server dependencies already installed"
fi
cd ..

echo "📦 Checking Dashboard dependencies..."
if [ ! -d "node_modules" ]; then
    echo "🔄 Installing Dashboard dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Dashboard dependencies"
        read -p "Press any key to continue..."
        exit 1
    fi
else
    echo "✅ Dashboard dependencies already installed"
fi

# ================================================================
# STEP 3: Start Redis Server
# ================================================================
echo "🗄️ Starting Redis server..."
if [ -f "redis/redis-server.exe" ]; then
    # For Redis, we need to be extra careful with Windows paths
    REDIS_PATH=$(cd redis && pwd)
    REDIS_PATH=$(echo "$REDIS_PATH" | sed 's/^\/\([a-zA-Z]\)/\1:/' | sed 's/\//\\/g')
    
    if [ -n "$MSYSTEM" ] || [ "$OS" = "Windows_NT" ]; then
        cmd.exe /c "start \"ScalperPro - Redis Server\" cmd.exe /k \"cd /d \"$REDIS_PATH\" && echo === Redis Server === && redis-server.exe redis.windows.conf\""
    else
        open_terminal "Redis Server" "./redis-server.exe redis.windows.conf" "redis"
    fi
    echo "✅ Redis server starting..."
    do_sleep 3
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
if [ -f "server/src/server.js" ]; then
    SERVER_PATH=$(cd server && pwd)
    SERVER_PATH=$(echo "$SERVER_PATH" | sed 's/^\/\([a-zA-Z]\)/\1:/' | sed 's/\//\\/g')
    
    if [ -n "$MSYSTEM" ] || [ "$OS" = "Windows_NT" ]; then
        cmd.exe /c "start \"ScalperPro - ML Server\" cmd.exe /k \"cd /d \"$SERVER_PATH\" && echo === ML Server === && set NODE_ENV=development && node src/server.js\""
    else
        open_terminal "ML Server" "NODE_ENV=development node src/server.js" "server"
    fi
    echo "✅ ML server starting on ports 3001 (HTTP) and 3002 (WebSocket)"
    
    # Wait for ML server to initialize
    echo "⏱️ Waiting for ML server initialization..."
    do_sleep 10
else
    echo "❌ src/server.js not found"
    echo "  Make sure you're running this from the correct directory"
    read -p "Press any key to continue..."
    exit 1
fi

# ================================================================
# STEP 6: Start Dashboard
# ================================================================
echo "🌐 Starting Trading Dashboard..."
if [ -f "src/app/page.tsx" ]; then
    ROOT_PATH=$(pwd)
    ROOT_PATH=$(echo "$ROOT_PATH" | sed 's/^\/\([a-zA-Z]\)/\1:/' | sed 's/\//\\/g')
    
    if [ -n "$MSYSTEM" ] || [ "$OS" = "Windows_NT" ]; then
        cmd.exe /c "start \"ScalperPro - Trading Dashboard\" cmd.exe /k \"cd /d \"$ROOT_PATH\" && echo === Trading Dashboard === && npm run dev\""
    else
        open_terminal "Trading Dashboard" "npm run dev" "."
    fi
    echo "✅ Trading dashboard starting on port 3000"
    
    # Wait for dashboard to compile
    echo "⏱️ Waiting for dashboard to compile..."
    do_sleep 8
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
do_sleep 3

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
echo "📊 Services Running (each in its own terminal):"
echo "  🗄️ Redis Server:        localhost:6379"
echo "  🐘 PostgreSQL DB:       localhost:5432/trading_ml"
echo "  🤖 ML Server HTTP:      http://localhost:3001"
echo "  🎯 ML Server WebSocket: ws://localhost:3002"
echo "  🌐 Trading Dashboard:   http://localhost:3000"
echo
echo "📋 Quick Links:"
echo "  🔍 Health Check:        http://localhost:3001/health"
echo "  🌐 Dashboard:           http://localhost:3000"
echo
echo "⚡ The system is now ready for trading!"
echo "  Start your NinjaTrader strategy to begin trading."
echo
echo "🛑 To stop all processes: ./stop-all-processes.sh"
echo "   Or close individual terminal windows"
echo

# Keep the main terminal open
echo "Press Enter to close this terminal (other processes will continue)..."
read 