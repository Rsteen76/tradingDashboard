#!/bin/bash

echo "🛑 Stopping all trading system processes..."

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

# Stop Node.js processes (ML Server and Dashboard)
kill_process "node"

# Stop Redis server
kill_process "redis"

echo
echo "✅ All processes stopped successfully!"
echo "   You can restart the system with: ./start-complete-system.sh"
echo

# Wait for user input
read -p "Press any key to continue..." 