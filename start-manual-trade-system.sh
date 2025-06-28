#!/bin/bash

echo "================================================"
echo "          Manual Trade System Startup"
echo "================================================"

echo ""
echo "Starting ML Trading Server..."
cd server
gnome-terminal --title="ML Server" -- bash -c "npm run dev; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run dev"' 2>/dev/null || \
(echo "Starting server in background..." && npm run dev &)

echo ""
echo "Waiting for server to initialize..."
sleep 5

echo ""
echo "Starting Dashboard..."
cd ..
gnome-terminal --title="Dashboard" -- bash -c "npm run dev; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run dev"' 2>/dev/null || \
(echo "Starting dashboard in background..." && npm run dev &)

echo ""
echo "================================================"
echo "   Manual Trade System Started Successfully!"
echo "================================================"
echo ""
echo "Server: http://localhost:3001"
echo "Dashboard: http://localhost:3000"
echo ""
echo "Use the Manual Trade Panel to test trading functionality."
echo ""
echo "To test manually, run: node test-manual-trades.js"
echo ""
read -p "Press Enter to continue..." 