#!/bin/bash

echo "🔍 Testing Trading System Status..."
echo

# Function to test if a service is responding
test_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-5}
    
    echo -n "Testing $service_name... "
    
    if curl -s --max-time "$timeout" "$url" >/dev/null 2>&1; then
        echo "✅ RUNNING"
        return 0
    else
        echo "❌ NOT RESPONDING"
        return 1
    fi
}

# Function to test if a port is open
test_port() {
    local service_name=$1
    local port=$2
    
    echo -n "Testing $service_name (port $port)... "
    
    if netstat -an | grep ":$port " | grep LISTEN >/dev/null 2>&1; then
        echo "✅ LISTENING"
        return 0
    else
        echo "❌ NOT LISTENING"
        return 1
    fi
}

echo "📊 Service Status Check:"
echo "========================"

# Test processes
echo
echo "🔍 Process Check:"
if ps aux | grep -E "(node|redis)" | grep -v grep >/dev/null 2>&1; then
    echo "✅ Node.js/Redis processes running"
    ps aux | grep -E "(node|redis)" | grep -v grep | head -5
else
    echo "❌ No Node.js/Redis processes found"
fi

echo
echo "🌐 Service Endpoints:"

# Test ML Server
test_service "ML Server Health" "http://localhost:8080/health" 3

# Test Dashboard
test_service "Trading Dashboard" "http://localhost:3000" 5

echo
echo "📡 Port Status:"

# Test ports
test_port "ML Server Web" "8080"
test_port "Trading Dashboard" "3000" 
test_port "NinjaTrader TCP" "9999"
test_port "Redis Server" "6379"

echo
echo "================================================"
echo "🎯 SYSTEM STATUS SUMMARY"
echo "================================================"

# Count services
services_up=0
services_total=4

if curl -s --max-time 2 "http://localhost:8080/health" >/dev/null 2>&1; then
    ((services_up++))
fi

if curl -s --max-time 2 "http://localhost:3000" >/dev/null 2>&1; then
    ((services_up++))
fi

if netstat -an | grep ":9999 " | grep LISTEN >/dev/null 2>&1; then
    ((services_up++))
fi

if netstat -an | grep ":6379 " | grep LISTEN >/dev/null 2>&1; then
    ((services_up++))
fi

echo "📊 Services: $services_up/$services_total operational"

if [ "$services_up" -eq "$services_total" ]; then
    echo "🎉 All services are running perfectly!"
    echo "🌐 Dashboard: http://localhost:3000"
    echo "🤖 ML Server: http://localhost:8080"
elif [ "$services_up" -gt 0 ]; then
    echo "⚠️ Some services are running, but not all"
    echo "💡 Try: ./stop-all-processes.sh && ./start-complete-system.sh"
else
    echo "❌ No services are running"
    echo "💡 Run: ./start-complete-system.sh"
fi

echo 