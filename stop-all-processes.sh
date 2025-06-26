#!/bin/bash

echo "🛑 Stopping All Trading System Processes..."
echo

# Function to kill processes by name
kill_process() {
    local process_name=$1
    local display_name=$2
    
    echo "🔄 Stopping $display_name processes..."
    
    case "$process_name" in
        "node")
            # Kill Node.js processes (try multiple methods)
            pkill -f "node" 2>/dev/null || true
            pkill -f "node.exe" 2>/dev/null || true
            taskkill //F //IM node.exe 2>/dev/null || true
            ;;
        "redis")
            # Kill Redis processes
            pkill -f "redis-server" 2>/dev/null || true
            pkill -f "redis-server.exe" 2>/dev/null || true
            taskkill //F //IM redis-server.exe 2>/dev/null || true
            ;;
    esac
    
    echo "✅ $display_name processes stopped"
}

# Kill all Node.js processes (ML server + Dashboard)
kill_process "node" "Node.js"

# Kill Redis Server
kill_process "redis" "Redis Server"

# Kill specific command windows (Windows specific)
if command -v taskkill >/dev/null 2>&1; then
    echo "🔄 Cleaning up command windows..."
    taskkill //F //FI "WINDOWTITLE eq ML*" 2>/dev/null || true
    taskkill //F //FI "WINDOWTITLE eq Dashboard*" 2>/dev/null || true
    taskkill //F //FI "WINDOWTITLE eq Redis*" 2>/dev/null || true
    echo "✅ Command windows cleaned up"
fi

# Wait for processes to fully terminate
echo "⏱️ Waiting for processes to terminate..."
sleep 2

# Check if any processes are still running
echo "🔍 Checking for remaining processes..."

if command -v pgrep >/dev/null 2>&1; then
    # Linux/Unix style check
    if pgrep -f "node" >/dev/null 2>&1; then
        echo "⚠️ Some Node.js processes may still be running"
    else
        echo "✅ No Node.js processes detected"
    fi
    
    if pgrep -f "redis-server" >/dev/null 2>&1; then
        echo "⚠️ Some Redis processes may still be running"
    else
        echo "✅ No Redis processes detected"
    fi
elif command -v tasklist >/dev/null 2>&1; then
    # Windows style check
    if tasklist | grep -i "node.exe" >/dev/null 2>&1; then
        echo "⚠️ Some Node.js processes may still be running"
        echo "   You can manually kill them with: taskkill //F //IM node.exe"
    else
        echo "✅ No Node.js processes detected"
    fi
    
    if tasklist | grep -i "redis-server.exe" >/dev/null 2>&1; then
        echo "⚠️ Some Redis processes may still be running"
        echo "   You can manually kill them with: taskkill //F //IM redis-server.exe"
    else
        echo "✅ No Redis processes detected"
    fi
fi

echo
echo "================================================"
echo "🎯 PROCESS CLEANUP COMPLETED"
echo "================================================"
echo
echo "📊 Stopped Services:"
echo "  ❌ Node.js processes (ML Server + Dashboard)"
echo "  ❌ Redis Server"
echo "  ❌ Command windows"
echo
echo "💡 Ports should now be available:"
echo "  📶 Port 3000 (Dashboard)"
echo "  📶 Port 8080 (ML Server Web)"
echo "  📶 Port 9999 (NinjaTrader TCP)"
echo "  📶 Port 6379 (Redis)"
echo
echo "✅ All trading system processes have been stopped!"
echo "   You can now restart the system with start-complete-system.sh"
echo

read -p "Press any key to exit..." 