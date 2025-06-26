// 🧠 Smart Trailing Stop Integration for ScalperProWithML.cs
// Add these methods and variables to your existing strategy

#region Smart Trailing Variables
private SmartTrailingState smartTrailing = new SmartTrailingState();
private DateTime lastTrailingUpdate = DateTime.MinValue;
private TimeSpan trailingUpdateInterval = TimeSpan.FromSeconds(15); // Update every 15 seconds
private bool enableSmartTrailing = true;
private double maxStopMovementATR = 0.5; // Maximum stop movement per update (in ATR)
private double minTrailingConfidence = 0.6; // Minimum AI confidence to act on trailing updates
#endregion

#region Smart Trailing Classes
private class SmartTrailingState
{
    public double CurrentStopPrice { get; set; }
    public string ActiveAlgorithm { get; set; } = "none";
    public DateTime LastUpdate { get; set; } = DateTime.MinValue;
    public double Confidence { get; set; } = 0.0;
    public string Reasoning { get; set; } = "";
    public bool IsActive { get; set; } = false;
    public int UpdateCount { get; set; } = 0;
}
#endregion

#region Smart Trailing Methods

private void InitializeSmartTrailing()
{
    smartTrailing = new SmartTrailingState();
    Print("🧠 Smart Trailing System initialized");
}

private void RequestSmartTrailingUpdate()
{
    if (!enableSmartTrailing || !mlConnected || Position.MarketPosition == MarketPosition.Flat)
        return;
    
    // Throttle requests
    if ((DateTime.Now - lastTrailingUpdate) < trailingUpdateInterval)
        return;
    
    try
    {
        // Prepare position data for ML analysis
        lock (dictLock)
        {
            reusableDataDict.Clear();
            reusableDataDict["request_type"] = "smart_trailing";
            reusableDataDict["position_id"] = strategyInstanceId + "_" + DateTime.Now.Ticks;
            reusableDataDict["direction"] = Position.MarketPosition.ToString().ToLower();
            reusableDataDict["entry_price"] = Position.AveragePrice;
            reusableDataDict["current_price"] = Close[0];
            reusableDataDict["current_stop"] = smartTrailing.CurrentStopPrice;
            reusableDataDict["position_size"] = Position.Quantity;
            reusableDataDict["unrealized_pnl"] = Position.GetUnrealizedProfitLoss(PerformanceUnit.Currency);
            reusableDataDict["time_in_position"] = (DateTime.Now - entryTime).TotalMinutes;
            
            // Market data for AI analysis
            reusableDataDict["atr"] = atr[0];
            reusableDataDict["price"] = Close[0];
            reusableDataDict["ema5"] = ema5[0];
            reusableDataDict["ema8"] = ema8[0];
            reusableDataDict["ema13"] = ema13[0];
            reusableDataDict["ema21"] = ema21[0];
            reusableDataDict["ema50"] = ema50[0];
            reusableDataDict["rsi"] = rsi[0];
            reusableDataDict["volume"] = Volume[0];
            reusableDataDict["high"] = High[0];
            reusableDataDict["low"] = Low[0];
            
            // Price history for analysis (last 20 bars)
            var priceHistory = new List<double>();
            var volumeHistory = new List<long>();
            for (int i = Math.Min(19, CurrentBar); i >= 0; i--)
            {
                priceHistory.Add(Close[i]);
                volumeHistory.Add(Volume[i]);
            }
            reusableDataDict["price_history"] = priceHistory.ToArray();
            reusableDataDict["volume_history"] = volumeHistory.ToArray();
            
            string json = CreateOptimizedJsonString("smart_trailing_request", Instrument.FullName,
                DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
            EnqueueMLMessage(json);
        }
        
        lastTrailingUpdate = DateTime.Now;
        Print($"🧠 Requested smart trailing update for {Position.MarketPosition} position @ {Close[0]:F2}");
    }
    catch (Exception ex)
    {
        Print($"❌ Error requesting smart trailing update: {ex.Message}");
    }
}

private void ProcessMLTrailingUpdate(Dictionary<string, object> trailingData)
{
    try
    {
        double newStopPrice = ParseDouble(trailingData, "stopPrice", 0);
        string algorithm = ParseString(trailingData, "algorithm", "default");
        double confidence = ParseDouble(trailingData, "confidence", 0.5);
        string reasoning = ParseString(trailingData, "reasoning", "");
        
        Print($"🧠 ML TRAILING UPDATE: {algorithm} suggests stop @ {newStopPrice:F2} (confidence: {confidence:P1})");
        Print($"📝 Reasoning: {reasoning}");
        
        // Validate confidence threshold
        if (confidence < minTrailingConfidence)
        {
            Print($"⚠️ Trailing update rejected: Low confidence ({confidence:P1} < {minTrailingConfidence:P1})");
            return;
        }
        
        // Validate the new stop (must be better than current)
        if (!IsValidTrailingUpdate(newStopPrice))
        {
            Print($"⚠️ Trailing update rejected: Invalid stop movement");
            return;
        }
        
        // Apply the trailing update
        UpdateTrailingStop(newStopPrice, algorithm, confidence, reasoning);
        
    }
    catch (Exception ex)
    {
        Print($"❌ Error processing trailing update: {ex.Message}");
    }
}

private bool IsValidTrailingUpdate(double newStopPrice)
{
    if (Position.MarketPosition == MarketPosition.Flat)
        return false;
    
    // First trailing update - initialize
    if (smartTrailing.CurrentStopPrice == 0)
    {
        smartTrailing.CurrentStopPrice = stopLoss; // Use initial stop loss
        smartTrailing.IsActive = true;
        Print($"🧠 Smart trailing initialized with stop @ {smartTrailing.CurrentStopPrice:F2}");
    }
    
    double currentStop = smartTrailing.CurrentStopPrice;
    double maxMovement = atr[0] * maxStopMovementATR;
    
    if (Position.MarketPosition == MarketPosition.Long)
    {
        // Long position: stop can only move up, and not too much at once
        if (newStopPrice <= currentStop)
        {
            Print($"⚠️ Long trailing rejected: New stop {newStopPrice:F2} not higher than current {currentStop:F2}");
            return false;
        }
        
        if (newStopPrice > currentStop + maxMovement)
        {
            Print($"⚠️ Long trailing capped: Requested {newStopPrice:F2}, max allowed {currentStop + maxMovement:F2}");
            // Cap the movement but still allow the update
            return true;
        }
        
        return true;
    }
    else if (Position.MarketPosition == MarketPosition.Short)
    {
        // Short position: stop can only move down, and not too much at once
        if (newStopPrice >= currentStop)
        {
            Print($"⚠️ Short trailing rejected: New stop {newStopPrice:F2} not lower than current {currentStop:F2}");
            return false;
        }
        
        if (newStopPrice < currentStop - maxMovement)
        {
            Print($"⚠️ Short trailing capped: Requested {newStopPrice:F2}, max allowed {currentStop - maxMovement:F2}");
            // Cap the movement but still allow the update
            return true;
        }
        
        return true;
    }
    
    return false;
}

private void UpdateTrailingStop(double newStopPrice, string algorithm, double confidence, string reasoning)
{
    try
    {
        double currentStop = smartTrailing.CurrentStopPrice;
        double maxMovement = atr[0] * maxStopMovementATR;
        
        // Apply movement limits
        if (Position.MarketPosition == MarketPosition.Long)
        {
            newStopPrice = Math.min(newStopPrice, currentStop + maxMovement);
            newStopPrice = Math.max(newStopPrice, currentStop); // Ensure it only moves up
        }
        else if (Position.MarketPosition == MarketPosition.Short)
        {
            newStopPrice = Math.max(newStopPrice, currentStop - maxMovement);
            newStopPrice = Math.min(newStopPrice, currentStop); // Ensure it only moves down
        }
        
        // Update the actual stop order
        SetStopLoss(CalculationMode.Price, newStopPrice);
        
        // Update tracking state
        smartTrailing.CurrentStopPrice = newStopPrice;
        smartTrailing.ActiveAlgorithm = algorithm;
        smartTrailing.LastUpdate = DateTime.Now;
        smartTrailing.Confidence = confidence;
        smartTrailing.Reasoning = reasoning;
        smartTrailing.UpdateCount++;
        
        // Visual feedback on chart
        string displayText = $"🧠 {algorithm.ToUpper()}\nStop: {newStopPrice:F2}\nConf: {confidence:P0}";
        Draw.TextFixed(this, "SmartTrailing", displayText, TextPosition.BottomRight);
        
        // Draw trailing stop line
        string lineTag = "TrailingLine_" + smartTrailing.UpdateCount;
        Draw.Line(this, lineTag, 0, newStopPrice, 10, newStopPrice, 
            Position.MarketPosition == MarketPosition.Long ? Brushes.LimeGreen : Brushes.Red);
        
        // Log the update
        Print($"✅ SMART TRAILING UPDATED:");
        Print($"   Algorithm: {algorithm}");
        Print($"   Old Stop: {currentStop:F2} -> New Stop: {newStopPrice:F2}");
        Print($"   Movement: {Math.Abs(newStopPrice - currentStop):F4} ({Math.Abs(newStopPrice - currentStop) / atr[0]:F2} ATR)");
        Print($"   Confidence: {confidence:P1}");
        Print($"   Update #: {smartTrailing.UpdateCount}");
        
        // Send confirmation back to ML server
        SendTrailingConfirmationToML(newStopPrice, algorithm, confidence);
        
    }
    catch (Exception ex)
    {
        Print($"❌ Error updating trailing stop: {ex.Message}");
    }
}

private void SendTrailingConfirmationToML(double appliedStopPrice, string algorithm, double confidence)
{
    try
    {
        lock (dictLock)
        {
            reusableDataDict.Clear();
            reusableDataDict["type"] = "trailing_confirmation";
            reusableDataDict["applied_stop_price"] = appliedStopPrice;
            reusableDataDict["algorithm_used"] = algorithm;
            reusableDataDict["confidence"] = confidence;
            reusableDataDict["position_direction"] = Position.MarketPosition.ToString();
            reusableDataDict["current_price"] = Close[0];
            reusableDataDict["update_count"] = smartTrailing.UpdateCount;
            reusableDataDict["time_applied"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
            
            string json = CreateOptimizedJsonString("trailing_confirmation", Instrument.FullName,
                DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
            EnqueueMLMessage(json);
        }
    }
    catch (Exception ex)
    {
        Print($"❌ Error sending trailing confirmation: {ex.Message}");
    }
}

private void CheckSmartTrailingTriggers()
{
    if (!enableSmartTrailing || Position.MarketPosition == MarketPosition.Flat)
        return;
    
    try
    {
        // Trigger conditions for requesting trailing updates
        bool shouldUpdate = false;
        string triggerReason = "";
        
        // 1. Time-based trigger (regular intervals)
        if ((DateTime.Now - lastTrailingUpdate) >= trailingUpdateInterval)
        {
            shouldUpdate = true;
            triggerReason = "scheduled_update";
        }
        
        // 2. Significant price movement trigger
        if (smartTrailing.IsActive && smartTrailing.CurrentStopPrice > 0)
        {
            double priceMovement = Position.MarketPosition == MarketPosition.Long
                ? Close[0] - smartTrailing.CurrentStopPrice
                : smartTrailing.CurrentStopPrice - Close[0];
            
            double movementInATR = priceMovement / atr[0];
            
            if (movementInATR > 0.5) // Price moved more than 0.5 ATR in favorable direction
            {
                shouldUpdate = true;
                triggerReason = $"price_movement_{movementInATR:F1}_atr";
            }
        }
        
        // 3. Volatility spike trigger
        if (CurrentBar > 0 && Volume[0] > Volume[1] * 1.5) // Volume spike
        {
            shouldUpdate = true;
            triggerReason = "volatility_spike";
        }
        
        // 4. Trend change trigger (EMA crossover)
        if (CurrentBar > 0 && 
            ((ema5[1] <= ema8[1] && ema5[0] > ema8[0]) || 
             (ema5[1] >= ema8[1] && ema5[0] < ema8[0])))
        {
            shouldUpdate = true;
            triggerReason = "trend_change";
        }
        
        if (shouldUpdate)
        {
            Print($"🎯 Smart trailing trigger: {triggerReason}");
            RequestSmartTrailingUpdate();
        }
    }
    catch (Exception ex)
    {
        Print($"❌ Error checking trailing triggers: {ex.Message}");
    }
}

private void ResetSmartTrailing()
{
    smartTrailing = new SmartTrailingState();
    lastTrailingUpdate = DateTime.MinValue;
    Print("🧠 Smart trailing system reset");
}

private void DisplaySmartTrailingStatus()
{
    if (!enableSmartTrailing || Position.MarketPosition == MarketPosition.Flat)
        return;
    
    try
    {
        string statusText = "🧠 SMART TRAILING STATUS\n";
        statusText += $"Active: {smartTrailing.IsActive}\n";
        statusText += $"Algorithm: {smartTrailing.ActiveAlgorithm}\n";
        statusText += $"Current Stop: {smartTrailing.CurrentStopPrice:F2}\n";
        statusText += $"Confidence: {smartTrailing.Confidence:P0}\n";
        statusText += $"Updates: {smartTrailing.UpdateCount}\n";
        statusText += $"Last Update: {(DateTime.Now - smartTrailing.LastUpdate).TotalSeconds:F0}s ago";
        
        Draw.TextFixed(this, "SmartTrailingStatus", statusText, TextPosition.TopRight);
        
        // Show distance to stop
        if (smartTrailing.CurrentStopPrice > 0)
        {
            double distanceToStop = Position.MarketPosition == MarketPosition.Long
                ? Close[0] - smartTrailing.CurrentStopPrice
                : smartTrailing.CurrentStopPrice - Close[0];
            
            double distanceInATR = distanceToStop / atr[0];
            
            string distanceText = $"Stop Distance: {distanceToStop:F4} ({distanceInATR:F2} ATR)";
            Draw.TextFixed(this, "StopDistance", distanceText, TextPosition.BottomLeft);
        }
    }
    catch (Exception ex)
    {
        Print($"❌ Error displaying trailing status: {ex.Message}");
    }
}

#endregion

#region Integration Points

// Add to OnBarUpdate() method:
private void OnBarUpdate_SmartTrailing()
{
    if (State == State.Realtime && enableSmartTrailing)
    {
        CheckSmartTrailingTriggers();
        DisplaySmartTrailingStatus();
    }
}

// Add to ProcessMLResponse() method:
private void ProcessMLResponse_SmartTrailing(Dictionary<string, object> response)
{
    if (response.ContainsKey("type"))
    {
        string messageType = response["type"].ToString();
        
        if (messageType == "smart_trailing_response")
        {
            ProcessMLTrailingUpdate(response);
        }
    }
}

// Add to OnExecutionUpdate() method:
private void OnExecutionUpdate_SmartTrailing(MarketPosition marketPosition)
{
    if (marketPosition == MarketPosition.Flat)
    {
        // Position closed - reset smart trailing
        ResetSmartTrailing();
    }
    else if (smartTrailing.CurrentStopPrice == 0 && Position.MarketPosition != MarketPosition.Flat)
    {
        // New position opened - initialize smart trailing
        smartTrailing.CurrentStopPrice = stopLoss;
        smartTrailing.IsActive = true;
        Print($"🧠 Smart trailing activated for new {Position.MarketPosition} position");
    }
}

#endregion

#region Properties (Add to existing properties section)

[NinjaScriptProperty]
[Display(Name="Enable Smart Trailing", Description="Enable AI-powered smart trailing stops", Order=23, GroupName="Smart Trailing")]
public bool EnableSmartTrailing 
{ 
    get { return enableSmartTrailing; } 
    set { enableSmartTrailing = value; } 
}

[NinjaScriptProperty]
[Range(0.1, 2.0)]
[Display(Name="Max Stop Movement (ATR)", Description="Maximum stop movement per update in ATR multiples", Order=24, GroupName="Smart Trailing")]
public double MaxStopMovementATR 
{ 
    get { return maxStopMovementATR; } 
    set { maxStopMovementATR = Math.Max(0.1, Math.Min(2.0, value)); } 
}

[NinjaScriptProperty]
[Range(0.3, 1.0)]
[Display(Name="Min Trailing Confidence", Description="Minimum AI confidence required for trailing updates", Order=25, GroupName="Smart Trailing")]
public double MinTrailingConfidence 
{ 
    get { return minTrailingConfidence; } 
    set { minTrailingConfidence = Math.Max(0.3, Math.Min(1.0, value)); } 
}

[NinjaScriptProperty]
[Range(5, 120)]
[Display(Name="Trailing Update Interval (sec)", Description="Interval between trailing stop updates", Order=26, GroupName="Smart Trailing")]
public int TrailingUpdateIntervalSeconds
{
    get { return (int)trailingUpdateInterval.TotalSeconds; }
    set { trailingUpdateInterval = TimeSpan.FromSeconds(Math.Max(5, Math.Min(120, value))); }
}

#endregion 