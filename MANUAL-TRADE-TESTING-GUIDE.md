# Manual Trade Testing Guide

## Quick Start
The manual trading system has been completely overhauled to fix the "Order rejected" errors. Here's how to test it:

### 1. Start the System
**Windows:**
```bash
start-manual-trade-system.bat
```

**Linux/Mac:**
```bash
./start-manual-trade-system.sh
```

**Manual Start:**
```bash
# Terminal 1 - Start ML Server
cd server
npm run dev

# Terminal 2 - Start Dashboard  
npm run dev
```

### 2. Open the Dashboard
Navigate to `http://localhost:3000` and locate the **Manual Trade Panel**.

## Manual Trade Panel Features

### 🧠 AI-Enhanced Interface (NEW)
- **AI/ML Optimization Toggle:** Enable AI-powered stop/target optimization
- **Market Regime Display:** Shows current market conditions (Trending/Ranging/Volatile)
- **AI Confidence Level:** Displays AI confidence percentage (0-100%)
- **Dynamic Calculations:** AI adjusts stops/targets based on market conditions

### Traditional Interface
- **Quantity:** Number of contracts to trade
- **Price:** Current market price for calculations
- **Use Stop Loss & Targets:** Toggle for protective orders
- **Stop (pts):** Stop loss in points (AI optimized or manual: default 8)
- **Target (pts):** Take profit in points (AI optimized or manual: default 12)
- **Preview:** Shows calculated stop and target prices

### Example Settings for ES Futures
- **Current Price:** 21900.00
- **Stop Points:** 8 (= 21892.00 for longs, 21908.00 for shorts)
- **Target Points:** 12 (= 21912.00 for longs, 21888.00 for shorts)
- **Risk/Reward:** 1.5:1 ratio

## Testing Scenarios

### Scenario 1: Protected Long Trade
1. Set **Qty:** 1
2. Set **Price:** 21900
3. Check **Use Stop Loss & Targets**
4. Set **Stop:** 8, **Target:** 12
5. Click **Long**

**Expected Result:**
```
📈 EXECUTING ML Long Command: 1 contracts | Stop: 21892.00 | Target: 21912.00 | Reason: Manual Trade
📈 Long market order placed: 1 contracts
📋 Pending stops/targets stored - Stop: 21892.00, Target: 21912.00
✅ ML Long Market Entry succeeded on attempt 1
```

### Scenario 2: Market Order Only
1. Set **Qty:** 1
2. Uncheck **Use Stop Loss & Targets**
3. Click **Long**

**Expected Result:**
```
📈 EXECUTING ML Long Command: 1 contracts | Stop: None | Target: None | Reason: Manual Trade
📈 Long market order placed: 1 contracts
✅ ML Long Market Entry succeeded on attempt 1
```

### Scenario 3: Protected Short Trade
1. Set **Qty:** 1
2. Check **Use Stop Loss & Targets**
3. Click **Short**

**Expected Result:**
```
📉 EXECUTING ML Short Command: 1 contracts | Stop: 21908.00 | Target: 21888.00 | Reason: Manual Trade
```

### Scenario 4: AI-Optimized Long Trade (NEW)
1. Set **Qty:** 1
2. Set **Price:** 21900
3. **Enable** **🧠 Use AI/ML Optimization**
4. Watch AI recommendations appear
5. Click **📈 BUY (AI)**

**Expected Result:**
```
🤖 Requesting AI optimization for long trade...
📈 Executing LONG trade...
✅ LONG trade executed successfully (AI: Ranging/Neutral, 70% conf)
```

### Scenario 5: Close Position
1. Click **Close** (regardless of current position)

**Expected Result:**
```
🔄 Executing ML Close Command: Closing Long position, Reason: Manual Trade
```

## Automated Testing

### 1. AI Optimization Tests (NEW)
```bash
node test-ai-optimization.js
```

**Tests AI Features:**
- AI optimization API endpoint functionality
- Market regime classification accuracy
- Volatility-based stop/target adjustment
- Confidence scoring validation
- Long/short trade optimization
- Fallback system reliability

**Expected Output:**
```
🤖 Starting AI Optimization Tests...

1. Testing server health...
   ✅ Server is healthy and responding

2. Testing long trade AI optimization...
   ✅ Long optimization valid: {"stop":12,"target":18,"ratio":"1.5:1","regime":"Ranging/Neutral","confidence":"70%","system":"Mathematical Fallback"}

3. Testing short trade AI optimization...
   ✅ Short optimization valid: {"stop":12,"target":18,"ratio":"1.5:1","regime":"Ranging/Neutral","confidence":"70%","system":"Mathematical Fallback"}

🎉 All AI optimization tests passed!
✅ Manual Trade Panel is ready to use AI optimization
✅ Smart trailing is active for automated adjustments
```

### 2. Basic Manual Trade Tests
```bash
node test-manual-trades.js
```

**Expected Output:**
```
🚀 Starting Manual Trade Tests...
✅ Connected to ML Trading Server

🧪 Testing Manual Long Trade...
📈 Long trade response: { success: true }

🧪 Testing Manual Close Position...
🔄 Close position response: { success: true }

📊 TEST RESULTS:
================
1. Manual Long Trade: ✅ PASS
2. Manual Close Position: ✅ PASS
3. Manual Short Trade: ✅ PASS
4. Manual Close Position: ✅ PASS
5. Market Order Only: ✅ PASS
6. Manual Close Position: ✅ PASS

Overall: 6/6 tests passed
```

## Troubleshooting

### Issue: "Order rejected" Error
**Cause:** Stop or target prices are invalid (0.00)
**Solution:** 
- Check that stop/target points are > 0 when enabled
- Verify current price is realistic for your instrument
- Ensure NinjaTrader is connected and strategy is running

### Issue: No Response from Manual Trade
**Cause:** Server connection issues
**Solution:**
- Check server console for connection logs
- Verify NinjaTrader is connected on port 9999
- Check Socket.IO connection in browser dev tools

### Issue: Stop/Target Not Set After Fill
**Cause:** OnExecutionUpdate not processing fills
**Solution:**
- Check NinjaTrader logs for execution updates
- Verify pending order variables are set correctly
- Ensure strategy is not terminated prematurely

### Issue: Invalid Quantity Error
**Cause:** Quantity <= 0 in trade panel
**Solution:**
- Set quantity to at least 1
- Check for decimal values that round to 0

## Log Monitoring

### Key Messages to Watch (NinjaTrader Output):
```
✅ Connected to ML Dashboard on localhost:9999
📈 EXECUTING ML Long Command: [quantity] contracts | Stop: [price] | Target: [price]
📋 Pending stops/targets stored - Stop: [price], Target: [price]
✅ ML Long Market Entry succeeded on attempt 1
✅ Entry order 'ML_Long' filled. Placing Stop/Target orders.
🛡️ STOP LOSS SET: [price]
🎯 TAKE PROFIT SET: [price]
```

### Key Messages to Watch (Server Console):
```
✅ NinjaTrader Service initialized
📨 Socket.IO manual_trade received
📤 Trading command sent: go_long
✅ Server listening on port 3001
```

## Advanced Configuration

### Modify Default Values
Edit `src/components/ManualTradePanel.tsx`:
```typescript
const [stopPoints, setStopPoints] = useState(10) // Change default stop
const [targetPoints, setTargetPoints] = useState(15) // Change default target
const [currentPrice, setCurrentPrice] = useState(22000) // Change default price
```

### Adjust Risk Parameters
Edit `ScalperProWithML.cs`:
```csharp
private const double MaxDailyLoss = 2000; // Increase daily loss limit
private const int MaxConsecutiveLosses = 5; // Allow more consecutive losses
```

## Performance Metrics

### Successful Manual Trade Flow:
- **Order Submission:** < 100ms
- **Entry Fill:** 1-3 seconds (market dependent)
- **Stop/Target Placement:** < 500ms after fill
- **Total Time:** 2-4 seconds end-to-end

### Error Recovery:
- **Retry Attempts:** Up to 3 with exponential backoff
- **Timeout Handling:** 5-second order timeout
- **Connection Recovery:** Auto-reconnect on disconnection

## Best Practices

1. **Always Test with Small Quantities:** Start with 1 contract
2. **Monitor Logs:** Watch both NinjaTrader and server logs
3. **Use Realistic Prices:** Set current price close to actual market
4. **Check Connections:** Ensure NinjaTrader strategy is active
5. **Validate Settings:** Review stop/target calculations before trading
6. **Test Market Hours:** Some brokers reject orders outside market hours
7. **Account Permissions:** Ensure account has futures trading permissions

## Support and Debugging

If issues persist:
1. Check all log files for error messages
2. Verify NinjaTrader strategy compilation
3. Test with simulated account first
4. Review broker-specific order requirements
5. Validate instrument tick sizes and minimum increments 