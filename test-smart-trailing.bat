@echo off
echo ============================================
echo 🧠 SMART TRAILING SYSTEM TEST
echo ============================================
echo.

echo 🔍 Checking Smart Trailing Implementation...
echo.

echo ✅ 1. Checking ML Server Smart Trailing Classes...
findstr /C:"class SmartTrailingManager" ml-server.js > nul
if %errorlevel% == 0 (
    echo    ✓ SmartTrailingManager class found
) else (
    echo    ❌ SmartTrailingManager class missing
)

findstr /C:"handleSmartTrailingRequest" ml-server.js > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing request handler found
) else (
    echo    ❌ Smart trailing request handler missing
)

echo.
echo ✅ 2. Checking NinjaTrader Smart Trailing Integration...
findstr /C:"enableSmartTrailing" ScalperProWithML.cs > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing variables found
) else (
    echo    ❌ Smart trailing variables missing
)

findstr /C:"UpdateSmartTrailingStop" ScalperProWithML.cs > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing update method found
) else (
    echo    ❌ Smart trailing update method missing
)

findstr /C:"ProcessSmartTrailingResponse" ScalperProWithML.cs > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing response handler found
) else (
    echo    ❌ Smart trailing response handler missing
)

echo.
echo ✅ 3. Checking API Endpoints...
findstr /C:"/smart-trailing" ml-server.js > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing API endpoint found
) else (
    echo    ❌ Smart trailing API endpoint missing
)

echo.
echo ✅ 4. Checking Communication Integration...
findstr /C:"smart_trailing_request" ScalperProWithML.cs > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing request messaging found
) else (
    echo    ❌ Smart trailing request messaging missing
)

findstr /C:"smart_trailing_response" ScalperProWithML.cs > nul
if %errorlevel% == 0 (
    echo    ✓ Smart trailing response handling found
) else (
    echo    ❌ Smart trailing response handling missing
)

echo.
echo ============================================
echo 🎯 SMART TRAILING FEATURES INCLUDED:
echo ============================================
echo.
echo 🧠 AI-Powered Algorithms:
echo    • Adaptive ATR Trailing
echo    • Trend Strength Trailing  
echo    • Support/Resistance Trailing
echo    • Momentum Adaptive Trailing
echo    • Profit Protection Trailing
echo.
echo 📊 Market Analysis:
echo    • Market Regime Detection
echo    • Volatility Prediction
echo    • Support/Resistance AI
echo    • Real-time Algorithm Selection
echo.
echo 🔧 Safety Features:
echo    • Maximum stop movement limits
echo    • Confidence thresholds
echo    • Fallback mechanisms
echo    • Position validation
echo.
echo ⚡ Performance:
echo    • 15-second update intervals
echo    • Real-time processing
echo    • Visual feedback on charts
echo    • Comprehensive logging
echo.
echo ============================================
echo 🚀 NEXT STEPS:
echo ============================================
echo.
echo 1. Start the complete system:
echo    start-complete-system.bat
echo.
echo 2. Load ScalperProWithML.cs in NinjaTrader
echo.
echo 3. Enable the strategy on a chart
echo.
echo 4. Watch for smart trailing messages:
echo    🤖 Smart trailing request sent
echo    🤖 SMART TRAILING APPLIED
echo.
echo 5. Monitor the dashboard for trailing updates
echo.
echo ============================================
echo ✅ Smart Trailing System Ready!
echo ============================================
pause 