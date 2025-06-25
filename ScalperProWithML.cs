using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Gui.SuperDom;
using NinjaTrader.Gui.Tools;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.Core.FloatingPoint;
using NinjaTrader.NinjaScript.DrawingTools;
using NinjaTrader.NinjaScript.Indicators;

// ML Dashboard Connection
using System.Net.Sockets;
using System.Collections.Concurrent;
using System.Threading;

//This namespace holds Strategies in this folder and is required. Do not change it.
namespace NinjaTrader.NinjaScript.Strategies
{
	public class ScalperProWithML : Strategy
	{
		#region Variables
		private EMA ema5, ema8, ema13, ema21, ema50;
		private RSI rsi;
		private ADX adx;
		private bool isLongSignal = false;
		private bool isShortSignal = false;
		private double lastSignalPrice = 0;
		private DateTime lastSignalTime = DateTime.MinValue;

		// Trade management
		private double entryPrice = 0;
		private double stopLoss = 0;
		private double target1 = 0;
		private double target2 = 0;

		// For visual display
		private bool showEmaRibbon = true;

		// Time-based exit
		private DateTime entryTime = DateTime.MinValue;

		private double longEntryPrice = 0;
		private double shortEntryPrice = 0;
		private bool movedStopToBreakevenLong = false;
		private bool movedStopToBreakevenShort = false;

		private ATR atr;

		private string logFilePath = @"C:\\LightingScalperPro_TradeLog.csv";

		// Track entry info for logging
		private double lastEntryPrice = 0;
		private DateTime lastEntryTime = DateTime.MinValue;
		private string lastTradeDirection = "";
		private string lastTradeType = "";

		// ML Dashboard Connection Variables - Thread Safe
		private TcpClient tcpClient;
		private NetworkStream stream;
		private volatile bool mlConnected = false;
		private string mlServerHost = "localhost";
		private int mlServerPort = 9999;
		private DateTime strategyStartTime;
		
		// Thread-safe message queue for ML communications
		private readonly ConcurrentQueue<string> mlMessageQueue = new ConcurrentQueue<string>();
		private CancellationTokenSource cancellationTokenSource;
		private Task mlSenderTask;
		private int lastReconnectAttempt = 0;
		private const int ReconnectIntervalMs = 5000;
		
		// Multi-instrument support variables
		private string strategyInstanceId;
		private string instrumentName;
		private int instrumentInstanceCount = 0;
		
		// Performance optimization variables
		private DateTime lastTickUpdate = DateTime.MinValue;
		private DateTime lastIndicatorUpdate = DateTime.MinValue;
		private int tickUpdateIntervalMs = 100;  // 100ms between tick updates
		private int indicatorUpdateIntervalMs = 1000;  // 1 second between indicator updates
		private int tickCount = 0;
		private int lastTickSendMS = 0;
		private int lastMLUpdateMS = 0;
		private const int MLUpdateThrottleMs = 50; // Throttle ML updates to 20Hz max
		
		// Memory leak prevention - Drawing object management
		private readonly Queue<string> drawingObjectTags = new Queue<string>();
		private const int MaxDrawingObjects = 100;
		private int drawingObjectCounter = 0;
		
		// Reusable objects to reduce GC pressure
		private readonly StringBuilder jsonBuilder = new StringBuilder(1024);
		private readonly Dictionary<string, object> reusableDataDict = new Dictionary<string, object>();
		
		// Enhanced signal filtering
		private double minSignalStrength = 60.0;
		private double riskMultiplier = 1.5;
		private TimeSpan maxTradeDuration = TimeSpan.FromMinutes(30);
		private double riskPerTrade = 0.02; // 2% of account per trade
		
		// Position synchronization tracking
		private DateTime lastPositionSyncCheck = DateTime.MinValue;
		private TimeSpan positionSyncInterval = TimeSpan.FromSeconds(10); // Check every 10 seconds
		
		// ML Prediction Variables
		private double mlLongProbability = 0.0;
		private double mlShortProbability = 0.0;
		private double mlConfidenceLevel = 0.0;
		private double mlVolatilityPrediction = 1.0;
		private string mlMarketRegime = "Unknown";
		private DateTime lastMLPredictionTime = DateTime.MinValue;
		private bool useMLPredictions = true;
		private double mlMinConfidence = 0.65; // Minimum ML confidence for trades
		private double mlMaxConfidence = 0.95; // Maximum confidence for position sizing
		#endregion

		#region ML Dashboard Methods - Thread Safe & Optimized
		private void ConnectToMLDashboard()
		{
			try
			{
				if (tcpClient != null && tcpClient.Connected)
					return;

				// Clean up existing connection
				DisconnectFromMLDashboard();

				tcpClient = new TcpClient();
				tcpClient.ReceiveTimeout = 5000;
				tcpClient.SendTimeout = 5000;
				tcpClient.Connect(mlServerHost, mlServerPort);
				stream = tcpClient.GetStream();
				mlConnected = true;
				
				// Initialize instrument-specific tracking
				instrumentName = Instrument.FullName;
				strategyInstanceId = instrumentName + "_" + DateTime.Now.ToString("yyyyMMdd_HHmmss");
				
				Print($"✅ Connected to ML Dashboard on {mlServerHost}:{mlServerPort}");
				Print($"🎯 Strategy Instance: {strategyInstanceId}");
				Print($"📈 Instrument: {instrumentName}");
				
				// Send initial connection handshake with instrument info
				SendInstrumentRegistration();
			}
			catch (Exception ex)
			{
				mlConnected = false;
				Print("❌ Failed to connect to ML Dashboard: " + ex.Message);
			}
		}
		
		private void StartMLSenderTask()
		{
			cancellationTokenSource = new CancellationTokenSource();
			mlSenderTask = Task.Factory.StartNew(ProcessMLMessageQueue, 
				cancellationTokenSource.Token, 
				TaskCreationOptions.LongRunning, 
				TaskScheduler.Default);
		}
		
		private async Task ProcessMLMessageQueue()
		{
			while (!cancellationTokenSource.IsCancellationRequested)
			{
				try
				{
					// Handle reconnection if needed
					if (!mlConnected)
					{
						int currentTime = Environment.TickCount;
						if (currentTime - lastReconnectAttempt > ReconnectIntervalMs)
						{
							lastReconnectAttempt = currentTime;
							try
							{
								ConnectToMLDashboard();
							}
							catch
							{
								// Swallow exception and retry later
							}
						}
						await Task.Delay(1000, cancellationTokenSource.Token);
						continue;
					}

					// Process queued messages
					while (mlMessageQueue.TryDequeue(out string message))
					{
						try
						{
							if (stream != null && stream.CanWrite)
							{
								byte[] bytes = Encoding.UTF8.GetBytes(message);
								await stream.WriteAsync(bytes, 0, bytes.Length, cancellationTokenSource.Token);
								await stream.FlushAsync(cancellationTokenSource.Token);
							}
						}
						catch (Exception ex)
						{
							Print($"❌ Error sending to ML Dashboard: {ex.Message}");
							mlConnected = false;
							break; // Exit inner loop to trigger reconnection
						}
					}

					// Small yield to prevent CPU spinning
					await Task.Delay(5, cancellationTokenSource.Token);
				}
				catch (OperationCanceledException)
				{
					break; // Expected when cancellation is requested
				}
				catch (Exception ex)
				{
					Print($"❌ ML sender task error: {ex.Message}");
					await Task.Delay(1000, cancellationTokenSource.Token);
				}
			}
		}
		
		private void EnqueueMLMessage(string message)
		{
			if (message != null)
			{
				mlMessageQueue.Enqueue(message + "\n");
			}
		}
		
		private void SendInstrumentRegistration()
		{
			reusableDataDict.Clear();
			reusableDataDict["strategy_instance_id"] = strategyInstanceId;
			reusableDataDict["instrument_name"] = instrumentName;
			reusableDataDict["strategy_name"] = "ScalperProWithML";
			reusableDataDict["tick_size"] = TickSize;
			reusableDataDict["point_value"] = Instrument.MasterInstrument.PointValue;
			reusableDataDict["session_start"] = strategyStartTime.ToString("yyyy-MM-dd HH:mm:ss");
			reusableDataDict["calculate_mode"] = "OnEachTick";
			reusableDataDict["order_quantity"] = OrderQuantity;
			reusableDataDict["risk_reward_ratio"] = RiskRewardRatio;
			reusableDataDict["connection_time"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");

			string json = CreateOptimizedJsonString("instrument_registration", instrumentName, 
				DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
			EnqueueMLMessage(json);
			Print($"📡 Registered instrument {instrumentName} with dashboard");
		}

		private void SendToMLDashboard(string jsonData)
		{
			// Deprecated - use EnqueueMLMessage instead
			EnqueueMLMessage(jsonData);
		}

		private string CreateOptimizedJsonString(string type, string instrument, string timestamp, Dictionary<string, object> data)
		{
			jsonBuilder.Clear();
			jsonBuilder.Append("{");
			jsonBuilder.AppendFormat("\"type\":\"{0}\",", type);
			jsonBuilder.AppendFormat("\"timestamp\":\"{0}\",", timestamp);
			jsonBuilder.AppendFormat("\"instrument\":\"{0}\"", instrument);
			
			foreach (var kvp in data)
			{
				jsonBuilder.Append(",");
				if (kvp.Value is string)
					jsonBuilder.AppendFormat("\"{0}\":\"{1}\"", kvp.Key, kvp.Value);
				else if (kvp.Value is bool)
					jsonBuilder.AppendFormat("\"{0}\":{1}", kvp.Key, kvp.Value.ToString().ToLower());
				else
					jsonBuilder.AppendFormat("\"{0}\":{1}", kvp.Key, kvp.Value);
			}
			
			jsonBuilder.Append("}");
			return jsonBuilder.ToString();
		}

		private string CreateJsonString(string type, string instrument, string timestamp, Dictionary<string, object> data)
		{
			// Use optimized version
			return CreateOptimizedJsonString(type, instrument, timestamp, data);
		}

		private void SendSignalToML(string direction, string signalType, bool executed = false, string blockReason = null)
		{
			// Throttle ML updates to prevent spam
			int currentTime = Environment.TickCount;
			if (currentTime - lastMLUpdateMS < MLUpdateThrottleMs)
				return;
			lastMLUpdateMS = currentTime;

			reusableDataDict.Clear();
			reusableDataDict["direction"] = direction;
			reusableDataDict["price"] = Close[0];
			reusableDataDict["signal_type"] = signalType;
			reusableDataDict["executed"] = executed;
			reusableDataDict["regime"] = GetHTFBias() ? "Bullish" : "Bearish";
			reusableDataDict["rsi"] = Math.Round(rsi[0], 2);
			reusableDataDict["atr"] = Math.Round(atr[0], 4);
			reusableDataDict["adx"] = 0;
			reusableDataDict["volume_ratio"] = Math.Round(Volume[0] / ((Volume[0] + Volume[1]) / 2.0), 2);
			reusableDataDict["ema_alignment"] = Math.Round(GetEMAAlignment(), 1);
			reusableDataDict["signal_strength"] = Math.Round(CalculateSignalStrength(), 1);
			reusableDataDict["ml_probability"] = 0.0;

			if (!string.IsNullOrEmpty(blockReason))
				reusableDataDict["block_reason"] = blockReason;

			string json = CreateOptimizedJsonString("signal", Instrument.FullName, 
				DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
			EnqueueMLMessage(json);
		}

		private void SendTradeToML(string direction, double entryPrice, double exitPrice, double pnl, string exitReason = "Target/Stop")
		{
			reusableDataDict.Clear();
			reusableDataDict["direction"] = direction;
			reusableDataDict["entry_price"] = entryPrice;
			reusableDataDict["exit_price"] = exitPrice;
			reusableDataDict["pnl"] = Math.Round(pnl, 2);
			reusableDataDict["quantity"] = OrderQuantity;
			reusableDataDict["entry_time"] = lastEntryTime.ToString("yyyy-MM-dd HH:mm:ss.fff");
			reusableDataDict["exit_time"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
			reusableDataDict["stop_price"] = stopLoss;
			reusableDataDict["target1_price"] = target1;
			reusableDataDict["target2_price"] = target2;
			reusableDataDict["exit_reason"] = exitReason;
			reusableDataDict["regime"] = GetHTFBias() ? "Bullish" : "Bearish";
			reusableDataDict["rsi"] = Math.Round(rsi[0], 2);
			reusableDataDict["atr"] = Math.Round(atr[0], 4);
			reusableDataDict["adx"] = 0;
			reusableDataDict["volume_ratio"] = Math.Round(Volume[0] / ((Volume[0] + Volume[1]) / 2.0), 2);
			reusableDataDict["mae"] = Math.Round(CalculateMAE(), 2);
			reusableDataDict["mfe"] = Math.Round(CalculateMFE(), 2);
			reusableDataDict["actual_rr"] = Math.Round(Math.Abs(pnl / (entryPrice - stopLoss)), 2);
			reusableDataDict["trade_type"] = lastTradeType;

			string json = CreateOptimizedJsonString("trade", Instrument.FullName, 
				DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
			EnqueueMLMessage(json);
		}

		private void SendMarketDataToML()
		{
			try
			{
				// Throttle market data updates
				int currentTime = Environment.TickCount;
				if (currentTime - lastMLUpdateMS < MLUpdateThrottleMs)
					return;
				lastMLUpdateMS = currentTime;

				reusableDataDict.Clear();
				reusableDataDict["price"] = Close[0];
				reusableDataDict["ema5"] = ema5[0];
				reusableDataDict["ema8"] = ema8[0];
				reusableDataDict["ema13"] = ema13[0];
				reusableDataDict["ema21"] = ema21[0];
				reusableDataDict["ema50"] = ema50[0];
				reusableDataDict["rsi"] = rsi[0];
				reusableDataDict["atr"] = atr[0];
				reusableDataDict["adx"] = adx != null ? adx[0] : 25;
				reusableDataDict["volume"] = Volume[0];
				reusableDataDict["volume_ratio"] = CalculateVolumeRatio();
				reusableDataDict["regime"] = GetHTFBias() ? "Bullish" : "Bearish";

				string json = CreateOptimizedJsonString("market_data", Instrument.FullName,
					DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"), reusableDataDict);
				EnqueueMLMessage(json);
			}
			catch (Exception ex)
			{
				Print($"Error sending market data: {ex.Message}");
			}
		}

		private void SendStrategyStatusToML()
		{
			try
			{				// Calculate comprehensive strategy status metrics with multi-instrument support
				var statusData = new Dictionary<string, object>
				{
					{"strategy_instance_id", strategyInstanceId},
					{"strategy_name", "ScalperProWithML"},
					{"instrument", instrumentName},
					{"timestamp", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")},
					{"current_price", Close[0]},
								// Position information - Using validated position data
				{"position", GetActualPositionStatus()},
				{"position_size", GetActualPositionSize()},
				{"unrealized_pnl", GetActualUnrealizedPnL()},
				
				// Position synchronization status
				{"entry_price", entryPrice},
				{"last_entry_price", lastEntryPrice},
				{"last_trade_direction", lastTradeDirection},
				{"stop_loss", stopLoss},
				{"target1", target1},
				{"target2", target2},
				{"position_synced", (GetActualPositionStatus() == "Flat" && entryPrice == 0) || 
								   (GetActualPositionStatus() != "Flat" && entryPrice != 0)},
				
				// Debug logging - remove after testing
				{"debug_strategy_position", Position?.MarketPosition.ToString() ?? "null"},
				{"debug_strategy_quantity", Position?.Quantity ?? 0},
					
					// Multi-instrument context  
					{"tick_size", TickSize},
					{"point_value", Instrument.MasterInstrument.PointValue},
					{"state", State.ToString()},
					{"tick_count_session", tickCount},
					{"bars_processed", CurrentBar},
					
					// Signal strength and probabilities
					{"overall_signal_strength", CalculateOverallSignalStrength()},
					{"signal_probability_long", CalculateSignalProbability(true)},
					{"signal_probability_short", CalculateSignalProbability(false)},
					
					// EMA Analysis
					{"ema_alignment_score", CalculateEMAAlignmentScore()},
					{"ema_alignment_strength", GetEMAAlignmentStrength()},
					{"ema_trend_direction", GetEMATrendDirection()},
					
					// RSI Analysis
					{"rsi_current", rsi[0]},
					{"rsi_zone", GetRSIZone()},
					{"rsi_distance_to_signal", CalculateRSIDistanceToSignal()},
					
					// Market context
					{"htf_bias", GetHTFBias() ? "Bullish" : "Bearish"},
					{"volatility_state", GetVolatilityState()},
					{"market_regime", GetMarketRegime()},
					
					// Next potential levels
					{"next_long_entry_level", CalculateNextLongEntry()},
					{"next_short_entry_level", CalculateNextShortEntry()},
					{"stop_level_long", CalculateStopLevel(true)},
					{"stop_level_short", CalculateStopLevel(false)},
					
					// Strategy metrics
					{"time_since_last_signal", CalculateTimeSinceLastSignal()},
					{"strategy_uptime", CalculateStrategyUptime()},
					{"connection_status", "Connected"}
				};

				string json = CreateJsonString("strategy_status", instrumentName,
					DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"), statusData);
				SendToMLDashboard(json);
			}
			catch (Exception ex)
			{
				Print($"Error sending strategy status: {ex.Message}");
			}
		}
		
		// === SAFE DRAWING METHODS - Memory Leak Prevention ===
		
		private void SafeDrawText(string tag, string text, int barsAgo, double y, Brush textBrush = null)
		{
			try
			{
				string fullTag = $"text_{drawingObjectCounter++}_{tag}";
				Draw.Text(this, fullTag, text, barsAgo, y, textBrush ?? Brushes.White);
				
				drawingObjectTags.Enqueue(fullTag);
				if (drawingObjectTags.Count > MaxDrawingObjects)
				{
					string oldTag = drawingObjectTags.Dequeue();
					RemoveDrawObject(oldTag);
				}
			}
			catch (Exception ex)
			{
				Print($"Error drawing text: {ex.Message}");
			}
		}

		private void SafeDrawLine(string tag, int startBarsAgo, double startY, int endBarsAgo, double endY, Brush brush = null)
		{
			try
			{
				string fullTag = $"line_{drawingObjectCounter++}_{tag}";
				Draw.Line(this, fullTag, startBarsAgo, startY, endBarsAgo, endY, brush ?? Brushes.Yellow);
				
				drawingObjectTags.Enqueue(fullTag);
				if (drawingObjectTags.Count > MaxDrawingObjects)
				{
					string oldTag = drawingObjectTags.Dequeue();
					RemoveDrawObject(oldTag);
				}
			}
			catch (Exception ex)
			{
				Print($"Error drawing line: {ex.Message}");
			}
		}

		private void SafeDrawRectangle(string tag, int startBarsAgo, double startY, int endBarsAgo, double endY, Brush brush = null)
		{
			try
			{
				string fullTag = $"rect_{drawingObjectCounter++}_{tag}";
				Draw.Rectangle(this, fullTag, startBarsAgo, startY, endBarsAgo, endY, brush ?? Brushes.Gray);
				
				drawingObjectTags.Enqueue(fullTag);
				if (drawingObjectTags.Count > MaxDrawingObjects)
				{
					string oldTag = drawingObjectTags.Dequeue();
					RemoveDrawObject(oldTag);
				}
			}
			catch (Exception ex)
			{
				Print($"Error drawing rectangle: {ex.Message}");
			}
		}

		private void ClearAllDrawingObjects()
		{
			try
			{
				while (drawingObjectTags.Count > 0)
				{
					string tag = drawingObjectTags.Dequeue();
					RemoveDrawObject(tag);
				}
				drawingObjectCounter = 0;
			}
			catch (Exception ex)
			{
				Print($"Error clearing drawing objects: {ex.Message}");
			}
		}
		
		// === SIGNAL ANALYSIS METHODS ===
		
		private double CalculateOverallSignalStrength()
		{
			try
			{
				double emaWeight = 0.4;
				double rsiWeight = 0.3;
				double adxWeight = 0.2;
				double volumeWeight = 0.1;
				
				double emaScore = CalculateEMAAlignmentScore();
				double rsiScore = CalculateRSISignalScore();
				double adxScore = Math.Min(100, (adx != null ? adx[0] : 25) * 2.5); // Scale ADX to 0-100
				double volumeScore = Math.Min(100, CalculateVolumeRatio() * 50);
				
				return (emaScore * emaWeight + rsiScore * rsiWeight + adxScore * adxWeight + volumeScore * volumeWeight);
			}
			catch
			{
				return 0;
			}
		}
		
		private double CalculateSignalProbability(bool isLong)
		{
			try
			{
				double probability = 50; // Base probability
				
				// EMA alignment factor
				if (isLong && IsEMABullishAlignment())
					probability += 20;
				else if (!isLong && IsEMABearishAlignment())
					probability += 20;
				else
					probability -= 10;
				
				// RSI factor
				if (isLong && rsi[0] < 40)
					probability += 15;
				else if (!isLong && rsi[0] > 60)
					probability += 15;
				else if ((isLong && rsi[0] > 70) || (!isLong && rsi[0] < 30))
					probability -= 20;
				
				// HTF bias factor
				bool htfBias = GetHTFBias();
				if ((isLong && htfBias) || (!isLong && !htfBias))
					probability += 10;
				else
					probability -= 5;
				
				return Math.Max(0, Math.Min(100, probability));
			}
			catch
			{
				return 50;
			}
		}
		
		private double CalculateEMAAlignmentScore()
		{
			try
			{
				double score = 0;
				double[] emas = { ema5[0], ema8[0], ema13[0], ema21[0], ema50[0] };
				
				// Check bullish alignment (5 > 8 > 13 > 21 > 50)
				bool bullishAlignment = true;
				bool bearishAlignment = true;
				
				for (int i = 0; i < emas.Length - 1; i++)
				{
					if (emas[i] <= emas[i + 1])
						bullishAlignment = false;
					if (emas[i] >= emas[i + 1])
						bearishAlignment = false;
				}
				
				if (bullishAlignment)
					score = 100;
				else if (bearishAlignment)
					score = 100;
				else
				{
					// Calculate partial alignment
					int alignedPairs = 0;
					for (int i = 0; i < emas.Length - 1; i++)
					{
						if (emas[i] > emas[i + 1] || emas[i] < emas[i + 1])
							alignedPairs++;
					}
					score = (alignedPairs / (double)(emas.Length - 1)) * 100;
				}
				
				return score;
			}
			catch
			{
				return 0;
			}
		}
		
		private string GetEMAAlignmentStrength()
		{
			double score = CalculateEMAAlignmentScore();
			if (score >= 80) return "Strong";
			if (score >= 60) return "Moderate";
			if (score >= 40) return "Weak";
			return "None";
		}
		
		private string GetEMATrendDirection()
		{
			try
			{
				if (IsEMABullishAlignment()) return "Bullish";
				if (IsEMABearishAlignment()) return "Bearish";
				return "Sideways";
			}
			catch
			{
				return "Unknown";
			}
		}
		
		private bool IsEMABullishAlignment()
		{
			return ema5[0] > ema8[0] && ema8[0] > ema13[0] && ema13[0] > ema21[0];
		}
		
		private bool IsEMABearishAlignment()
		{
			return ema5[0] < ema8[0] && ema8[0] < ema13[0] && ema13[0] < ema21[0];
		}
		
		private double CalculateRSISignalScore()
		{
			try
			{
				double rsiVal = rsi[0];
				if (rsiVal < 30 || rsiVal > 70) return 80; // High signal potential
				if (rsiVal < 40 || rsiVal > 60) return 60; // Medium signal potential
				return 20; // Low signal potential
			}
			catch
			{
				return 0;
			}
		}
		
		private string GetRSIZone()
		{
			try
			{
				double rsiVal = rsi[0];
				if (rsiVal >= 70) return "Overbought";
				if (rsiVal <= 30) return "Oversold";
				if (rsiVal >= 45 && rsiVal <= 55) return "Neutral";
				return rsiVal > 50 ? "Bullish" : "Bearish";
			}
			catch
			{
				return "Unknown";
			}
		}
		
		private double CalculateRSIDistanceToSignal()
		{
			try
			{
				double rsiVal = rsi[0];
				double distanceToOversold = Math.Abs(rsiVal - 30);
				double distanceToOverbought = Math.Abs(rsiVal - 70);
				return Math.Min(distanceToOversold, distanceToOverbought);
			}
			catch
			{
				return 25;
			}
		}
		
		private string GetVolatilityState()
		{
			try
			{
				double atrVal = atr[0];
				double avgPrice = (High[0] + Low[0] + Close[0]) / 3;
				double atrPercent = (atrVal / avgPrice) * 100;
				
				if (atrPercent > 2.0) return "High";
				if (atrPercent > 1.0) return "Normal";
				return "Low";
			}
			catch
			{
				return "Unknown";
			}
		}
		
		private string GetMarketRegime()
		{
			try
			{
				bool bullishEMA = IsEMABullishAlignment();
				bool bearishEMA = IsEMABearishAlignment();
				double adxVal = adx != null ? adx[0] : 25;
				
				if (adxVal > 25)
				{
					if (bullishEMA) return "Trending Bullish";
					if (bearishEMA) return "Trending Bearish";
					return "Trending";
				}
				return "Ranging";
			}
			catch
			{
				return "Unknown";
			}
		}
		
		private double CalculateNextLongEntry()
		{
			try
			{
				// Simple calculation - could be enhanced
				return ema8[0] + (atr[0] * 0.5);
			}
			catch
			{
				return 0;
			}
		}
		
		private double CalculateNextShortEntry()
		{
			try
			{
				// Simple calculation - could be enhanced
				return ema8[0] - (atr[0] * 0.5);
			}
			catch
			{
				return 0;
			}
		}
		
		private double CalculateStopLevel(bool isLong)
		{
			try
			{
				double stopDistance = atr[0] * ATRMultiplier;
				return isLong ? Close[0] - stopDistance : Close[0] + stopDistance;
			}
			catch
			{
				return 0;
			}
		}
		
		private double CalculateTimeSinceLastSignal()
		{
			try
			{
				// Simple implementation - could track actual signal times
				return (DateTime.Now - Time[0]).TotalMinutes;
			}
			catch
			{
				return 0;
			}
		}
		
		private double CalculateStrategyUptime()
		{
			try
			{
				return (DateTime.Now - strategyStartTime).TotalMinutes;
			}
			catch
			{
				return 0;
			}
		}

		private double CalculateVolumeRatio()
		{
			// Simple volume ratio calculation
			if (CurrentBar < 20) return 1.0;
			
			double avgVolume = 0;
			for (int i = 1; i <= 20; i++)
			{
				avgVolume += Volume[i];
			}
			avgVolume /= 20;
			
			return avgVolume > 0 ? Volume[0] / avgVolume : 1.0;
		}

		private double GetEMAAlignment()
		{
			// Simple EMA alignment score (0-100)
			double score = 0;
			if (ema5[0] > ema8[0]) score += 25;
			if (ema8[0] > ema13[0]) score += 25;
			if (ema13[0] > ema21[0]) score += 25;
			if (ema21[0] > ema50[0]) score += 25;
			return score;
		}

		private double CalculateSignalStrength()
		{
			// Basic signal strength calculation (0-100)
			double strength = 0;
			
			// EMA alignment component (40%)
			strength += GetEMAAlignment() * 0.4;
			
			// RSI component (30%)
			if (rsi[0] > 30 && rsi[0] < 70)
				strength += 30;
			else if (rsi[0] > 20 && rsi[0] < 80)
				strength += 15;
			
			// Volume component (30%)
			if (CurrentBar > 0)
			{
				double volRatio = Volume[0] / Math.Max(Volume[1], 1);
				if (volRatio > 1.2)
					strength += 30;
				else if (volRatio > 1.0)
					strength += 15;
			}
			
			return Math.Min(100, strength);
		}

		private double CalculateMAE()
		{
			// Maximum Adverse Excursion - requires position tracking
			// Simplified calculation for current implementation
			if (Position.MarketPosition == MarketPosition.Long && lastEntryPrice > 0)
			{
				return Math.Max(0, lastEntryPrice - Low[0]);
			}
			else if (Position.MarketPosition == MarketPosition.Short && lastEntryPrice > 0)
			{
				return Math.Max(0, High[0] - lastEntryPrice);
			}
			return 0;
		}

		private double CalculateMFE()
		{
			// Maximum Favorable Excursion - requires position tracking
			// Simplified calculation for current implementation
			if (Position.MarketPosition == MarketPosition.Long && lastEntryPrice > 0)
			{
				return Math.Max(0, High[0] - lastEntryPrice);
			}
			else if (Position.MarketPosition == MarketPosition.Short && lastEntryPrice > 0)
			{
				return Math.Max(0, lastEntryPrice - Low[0]);
			}
			return 0;
		}

		private void SendTickDataToML(MarketDataEventArgs tickData)
		{
			if (!EnableMLDashboard || !mlConnected)
				return;

			try
			{
				// Ultra-light tick data payload for maximum performance
				var tickJson = new StringBuilder();
				tickJson.Append("{");
				tickJson.AppendFormat("\"type\":\"tick_data\",");
				tickJson.AppendFormat("\"timestamp\":\"{0}\",", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
				tickJson.AppendFormat("\"instrument\":\"{0}\",", Instrument.FullName);
				tickJson.AppendFormat("\"price\":{0},", tickData.Price);
				tickJson.AppendFormat("\"volume\":{0},", tickData.Volume);
				tickJson.AppendFormat("\"bid\":{0},", tickData.Bid);
				tickJson.AppendFormat("\"ask\":{0},", tickData.Ask);
				tickJson.AppendFormat("\"tick_count\":{0},", tickCount);
				tickJson.AppendFormat("\"spread\":{0}", Math.Round(tickData.Ask - tickData.Bid, 4));
				tickJson.Append("}");
				
				SendToMLDashboard(tickJson.ToString());
			}
			catch (Exception ex)
			{
				if (tickCount % 1000 == 0)
					Print($"❌ Tick data send error: {ex.Message}");
			}
		}

		private void UpdateRealTimeTickDisplay()
		{
			if (State != State.Realtime)
				return;

			try
			{
				// Ultra-responsive display updates
				string positionInfo = Position.MarketPosition == MarketPosition.Flat ? "NO POSITION" :
					string.Format("{0} {1} @ {2:0.00}", Position.MarketPosition, Position.Quantity, Position.AveragePrice);
				
				Draw.TextFixed(this, "PositionInfo", positionInfo, TextPosition.TopRight);
				
				if (Position.MarketPosition != MarketPosition.Flat)
				{
					string plInfo = string.Format("P/L: ${0:0.00}", Position.GetUnrealizedProfitLoss(PerformanceUnit.Currency));
					Draw.TextFixed(this, "PLInfo", plInfo, TextPosition.TopRight);
				}

				// Show tick performance metrics
				string tickInfo = string.Format("TICK MODE | Ticks: {0} | Rate: {1}/sec", 
					tickCount, 
					Math.Round(tickCount / Math.Max((DateTime.Now - strategyStartTime).TotalSeconds, 1), 1));
				Draw.TextFixed(this, "TickInfo", tickInfo, TextPosition.TopLeft);
				
				string mlStatus = mlConnected ? "ML: TICK CONNECTED" : "ML: Disconnected";
				Draw.TextFixed(this, "MLStatus", mlStatus, TextPosition.TopLeft);

				// Enhanced strategy status with tick data
				if (EnableMLDashboard && mlConnected && tickCount % 10 == 0)
				{
					SendOptimizedStrategyStatus();
				}
			}
			catch (Exception ex)
			{
				if (tickCount % 1000 == 0)
					Print($"❌ Display update error: {ex.Message}");
			}
		}

		private void UpdateIndicatorDisplays()
		{
			if (!ShowEmaRibbon || CurrentBar < BarsRequiredToTrade)
				return;

			try
			{
				Values[0][0] = ema5[0];
				Values[1][0] = ema8[0];
				Values[2][0] = ema13[0];
				Values[3][0] = ema21[0];
				Values[4][0] = ema50[0];

				// Optimized ribbon coloring for tick mode
				bool bullishAlignment = ema5[0] > ema8[0] && ema8[0] > ema13[0] && ema13[0] > ema21[0];
				bool bearishAlignment = ema5[0] < ema8[0] && ema8[0] < ema13[0] && ema13[0] < ema21[0];

				Brush ribbonColor = bullishAlignment ? Brushes.LimeGreen : 
								   bearishAlignment ? Brushes.Red : Brushes.Gray;

				for (int i = 0; i < 4; i++)
				{
					PlotBrushes[i][0] = ribbonColor;
				}

				PlotBrushes[4][0] = Close[0] > ema50[0] ? Brushes.LimeGreen : Brushes.Crimson;
				
				// Show current indicator values
				string emaInfo = string.Format("EMA5: {0:F2} | EMA8: {1:F2} | RSI: {2:F1}", 
					ema5[0], ema8[0], rsi[0]);
				Draw.TextFixed(this, "Indicators", emaInfo, TextPosition.TopLeft);
			}
			catch (Exception ex)
			{
				Print($"❌ Indicator display error: {ex.Message}");
			}
		}

		private void SendOptimizedStrategyStatus()
		{
			if (!EnableMLDashboard || !mlConnected)
				return;

			try
			{
				// Enhanced strategy status with tick data metrics
				var statusJson = new StringBuilder();
				statusJson.Append("{");
				statusJson.AppendFormat("\"type\":\"strategy_status\",");
				statusJson.AppendFormat("\"timestamp\":\"{0}\",", DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
				statusJson.AppendFormat("\"instrument\":\"{0}\",", Instrument.FullName);
				statusJson.AppendFormat("\"strategy_name\":\"ScalperProWithML_TICK\",");
				statusJson.AppendFormat("\"current_price\":{0},", Close[0]);				statusJson.AppendFormat("\"position\":\"{0}\",", GetActualPositionStatus());
				statusJson.AppendFormat("\"position_size\":{0},", GetActualPositionSize());
				statusJson.AppendFormat("\"unrealized_pnl\":{0},", GetActualUnrealizedPnL());
				statusJson.AppendFormat("\"overall_signal_strength\":{0},", CalculateOverallSignalStrength());
				statusJson.AppendFormat("\"rsi_current\":{0},", Math.Round(rsi[0], 2));
				statusJson.AppendFormat("\"tick_count\":{0},", tickCount);
				statusJson.AppendFormat("\"tick_rate\":{0},", Math.Round(tickCount / Math.Max((DateTime.Now - strategyStartTime).TotalSeconds, 1), 1));
				statusJson.AppendFormat("\"update_frequency\":\"TICK_BASED\",");
				statusJson.AppendFormat("\"ema_alignment_score\":{0},", CalculateEMAAlignmentScore());
				statusJson.AppendFormat("\"htf_bias\":\"{0}\",", GetHTFBias() ? "Bullish" : "Bearish");
				statusJson.AppendFormat("\"ml_long_probability\":{0},", Math.Round(mlLongProbability, 3));
				statusJson.AppendFormat("\"ml_short_probability\":{0},", Math.Round(mlShortProbability, 3));
				statusJson.AppendFormat("\"ml_confidence\":{0},", Math.Round(mlConfidenceLevel, 3));
				statusJson.AppendFormat("\"ml_market_regime\":\"{0}\",", mlMarketRegime);
				statusJson.AppendFormat("\"ml_enabled\":{0}", useMLPredictions.ToString().ToLower());
				statusJson.Append("}");
				
				SendToMLDashboard(statusJson.ToString());
			}
			catch (Exception ex)
			{
				Print($"❌ Optimized status send error: {ex.Message}");
			}
		}

		private void DisconnectFromMLDashboard()
		{
			try
			{
				mlConnected = false;
				
				// Cancel and wait for ML sender task
				if (cancellationTokenSource != null)
				{
					cancellationTokenSource.Cancel();
					if (mlSenderTask != null && !mlSenderTask.IsCompleted)
					{
						mlSenderTask.Wait(2000); // Wait up to 2 seconds
					}
					cancellationTokenSource.Dispose();
					cancellationTokenSource = null;
				}

				// Close network streams
				if (stream != null)
				{
					stream.Close();
					stream.Dispose();
					stream = null;
				}
				if (tcpClient != null)
				{
					tcpClient.Close();
					tcpClient = null;
				}
				
				// Clear drawing objects to prevent memory leaks
				ClearAllDrawingObjects();
				
				Print("🔌 Disconnected from ML Dashboard");
			}
			catch (Exception ex)
			{
				Print("❌ Error disconnecting from ML Dashboard: " + ex.Message);
			}
		}
		
		#region ML PREDICTION METHODS
		
		private void RequestMLPrediction()
		{
			try
			{
				if (!EnableMLDashboard || !mlConnected)
					return;
					
				// Send market data for ML prediction
				reusableDataDict.Clear();
				reusableDataDict["request_type"] = "prediction";
				reusableDataDict["price"] = Close[0];
				reusableDataDict["ema5"] = ema5[0];
				reusableDataDict["ema8"] = ema8[0];
				reusableDataDict["ema13"] = ema13[0];
				reusableDataDict["ema21"] = ema21[0];
				reusableDataDict["ema50"] = ema50[0];
				reusableDataDict["rsi"] = rsi[0];
				reusableDataDict["atr"] = atr[0];
				reusableDataDict["volume"] = Volume[0];
				reusableDataDict["high"] = High[0];
				reusableDataDict["low"] = Low[0];
				reusableDataDict["signal_strength"] = CalculateOverallSignalStrength();
				reusableDataDict["ema_alignment"] = GetEMAAlignment();
				reusableDataDict["timestamp"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
				
				string json = CreateOptimizedJsonString("ml_prediction_request", Instrument.FullName, 
					DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
				EnqueueMLMessage(json);
			}
			catch (Exception ex)
			{
				Print($"Error requesting ML prediction: {ex.Message}");
			}
		}
		
		private bool GetMLSignalConfirmation(string direction)
		{
			if (!useMLPredictions || !mlConnected)
			{
				Print($"🤖 ML predictions disabled or not connected - using traditional signals only");
				return true; // Allow traditional signals if ML not available
			}
			
			// Check if ML prediction is recent (within last 30 seconds)
			if ((DateTime.Now - lastMLPredictionTime).TotalSeconds > 30)
			{
				Print($"🤖 ML prediction stale ({(DateTime.Now - lastMLPredictionTime).TotalSeconds:F0}s old) - requesting new prediction");
				RequestMLPrediction();
				return false; // Don't trade on stale predictions
			}
			
			double requiredProbability = direction.ToLower() == "long" ? mlLongProbability : mlShortProbability;
			bool confidenceCheck = mlConfidenceLevel >= mlMinConfidence;
			bool probabilityCheck = requiredProbability >= mlMinConfidence;
			
			Print($"🤖 ML ANALYSIS: {direction.ToUpper()} | Probability: {requiredProbability:P1} | Confidence: {mlConfidenceLevel:P1} | Regime: {mlMarketRegime}");
			
			if (confidenceCheck && probabilityCheck)
			{
				Print($"✅ ML CONFIRMS {direction.ToUpper()} signal - Probability: {requiredProbability:P1}, Confidence: {mlConfidenceLevel:P1}");
				return true;
			}
			else
			{
				string reason = !confidenceCheck ? $"Low confidence ({mlConfidenceLevel:P1} < {mlMinConfidence:P1})" : 
								$"Low probability ({requiredProbability:P1} < {mlMinConfidence:P1})";
				Print($"❌ ML BLOCKS {direction.ToUpper()} signal - {reason}");
				return false;
			}
		}
		
		private double GetMLAdjustedPositionSize(int baseQuantity)
		{
			if (!useMLPredictions || mlConfidenceLevel == 0)
				return baseQuantity;
				
			// Scale position size based on ML confidence (0.5x to 1.5x)
			double confidenceMultiplier = 0.5 + (mlConfidenceLevel * 1.0);
			confidenceMultiplier = Math.Max(0.5, Math.Min(1.5, confidenceMultiplier));
			
			int adjustedQuantity = Math.Max(1, (int)(baseQuantity * confidenceMultiplier));
			
			Print($"🤖 ML POSITION SIZING: Base={baseQuantity}, Confidence={mlConfidenceLevel:P1}, Multiplier={confidenceMultiplier:F2}, Final={adjustedQuantity}");
			
			return adjustedQuantity;
		}
		
		private double GetMLAdjustedStopLoss(double baseStopLoss, bool isLong)
		{
			if (!useMLPredictions || mlVolatilityPrediction == 0)
				return baseStopLoss;
				
			// Adjust stop loss based on ML volatility prediction
			double currentPrice = Close[0];
			double stopDistance = Math.Abs(currentPrice - baseStopLoss);
			
			// Scale stop distance by ML volatility prediction (0.7x to 1.3x)
			double volatilityMultiplier = 0.7 + (mlVolatilityPrediction * 0.6);
			volatilityMultiplier = Math.Max(0.7, Math.Min(1.3, volatilityMultiplier));
			
			double adjustedStopDistance = stopDistance * volatilityMultiplier;
			double adjustedStopLoss = isLong ? currentPrice - adjustedStopDistance : currentPrice + adjustedStopDistance;
			
			Print($"🤖 ML STOP ADJUSTMENT: Base={baseStopLoss:F2}, Volatility={mlVolatilityPrediction:F2}, Multiplier={volatilityMultiplier:F2}, Final={adjustedStopLoss:F2}");
			
			return adjustedStopLoss;
		}
		
		private double GetMLAdjustedTarget(double baseTarget, bool isLong)
		{
			if (!useMLPredictions || mlConfidenceLevel == 0)
				return baseTarget;
				
			// Adjust target based on ML confidence and market regime
			double currentPrice = Close[0];
			double targetDistance = Math.Abs(baseTarget - currentPrice);
			
			// Scale target distance by ML confidence (0.8x to 1.4x)
			double confidenceMultiplier = 0.8 + (mlConfidenceLevel * 0.6);
			
			// Additional adjustment for market regime
			if (mlMarketRegime == "Trending")
				confidenceMultiplier *= 1.2; // Extend targets in trending markets
			else if (mlMarketRegime == "Ranging")
				confidenceMultiplier *= 0.9; // Reduce targets in ranging markets
				
			confidenceMultiplier = Math.Max(0.8, Math.Min(1.4, confidenceMultiplier));
			
			double adjustedTargetDistance = targetDistance * confidenceMultiplier;
			double adjustedTarget = isLong ? currentPrice + adjustedTargetDistance : currentPrice - adjustedTargetDistance;
			
			Print($"🤖 ML TARGET ADJUSTMENT: Base={baseTarget:F2}, Confidence={mlConfidenceLevel:F2}, Regime={mlMarketRegime}, Final={adjustedTarget:F2}");
			
			return adjustedTarget;
		}
		
		// Simulate ML predictions (replace with actual ML model integration)
		private void UpdateMLPredictions()
		{
			try
			{
				// This would be replaced with actual ML model predictions
				// For now, simulate based on technical indicators with some ML-like logic
				
				double emaStrength = GetEMAAlignment();
				double rsiStrength = (rsi[0] - 50) / 50.0; // Normalize RSI around 50
				double momentumStrength = (Close[0] - Close[5]) / Close[5]; // 5-bar momentum
				double volatilityLevel = atr[0] / Close[0]; // Normalized ATR
				
				// Simulate ML long probability
				mlLongProbability = Math.Max(0, Math.Min(1, 
					0.5 + (emaStrength * 0.3) + (Math.Max(0, -rsiStrength) * 0.2) + (Math.Max(0, momentumStrength) * 0.3)));
				
				// Simulate ML short probability  
				mlShortProbability = Math.Max(0, Math.Min(1,
					0.5 + (-emaStrength * 0.3) + (Math.Max(0, rsiStrength) * 0.2) + (Math.Max(0, -momentumStrength) * 0.3)));
				
				// Simulate confidence based on signal clarity
				double signalClarity = Math.Abs(mlLongProbability - mlShortProbability);
				mlConfidenceLevel = Math.Min(0.95, 0.5 + (signalClarity * 0.8));
				
				// Simulate volatility prediction
				mlVolatilityPrediction = Math.Max(0.5, Math.Min(1.5, volatilityLevel * 20)); // Scale volatility
				
				// Simulate market regime detection
				if (Math.Abs(emaStrength) > 0.3)
					mlMarketRegime = "Trending";
				else if (volatilityLevel < 0.01)
					mlMarketRegime = "Ranging";
				else
					mlMarketRegime = "Transitional";
				
				lastMLPredictionTime = DateTime.Now;
				
				Print($"🤖 ML UPDATE: Long={mlLongProbability:P1}, Short={mlShortProbability:P1}, Confidence={mlConfidenceLevel:P1}, Regime={mlMarketRegime}");
			}
			catch (Exception ex)
			{
				Print($"Error updating ML predictions: {ex.Message}");
			}
		}
		
		#endregion

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Description = "Strategy version of LightingScalperPro with ML Dashboard integration - Optimized";
				Name = "ScalperProWithML";
				Calculate = Calculate.OnEachTick;
				EntriesPerDirection = 1;
				EntryHandling = EntryHandling.AllEntries;
				IsExitOnSessionCloseStrategy = true;
				
				ExitOnSessionCloseSeconds = 30;
				IsFillLimitOnTouch = false;
				MaximumBarsLookBack = MaximumBarsLookBack.TwoHundredFiftySix;
				OrderFillResolution = OrderFillResolution.Standard;
				Slippage = 0;
				StartBehavior = StartBehavior.WaitUntilFlat;
				TimeInForce = TimeInForce.Gtc;
				TraceOrders = false;
				RealtimeErrorHandling = RealtimeErrorHandling.StopCancelClose;
				StopTargetHandling = StopTargetHandling.PerEntryExecution;
				BarsRequiredToTrade = 20;
				IsInstantiatedOnEachOptimizationIteration = true;

				// User parameters
				OrderQuantity = 1;
				RiskRewardRatio = 2.0;
				MinSignalSeparation = 10;
				ATRMultiplier = 1.5;
				RSIPeriod = 14;
				RSIOverbought = 70;
				RSIOversold = 30;
				ShowEmaRibbon = true;
				MaxHTFExtensionATR = 1.5;

				// New parameter defaults
				EntryFlexibilityPercent = 20;
				MinEMAsAligned = 3;
				RSIBuffer = 5;

				// ML Dashboard parameters
				MLServerHost = "localhost";
				MLServerPort = 9999;
				EnableMLDashboard = true;
				
				// Enhanced strategy parameters
				MinSignalStrength = 60.0;
				RiskMultiplier = 1.5;
				MaxTradeDurationMinutes = 30;
				RiskPerTrade = 0.02; // 2% of account per trade
				
				// ML parameters
				UseMLPredictions = true;
				MLMinConfidence = 0.65;
				
				// Initialize strategy start time
				strategyStartTime = DateTime.Now;

				// Add plots for visual display
				AddPlot(new Stroke(Brushes.LimeGreen, 2), PlotStyle.Line, "EMA5");
				AddPlot(new Stroke(Brushes.Gold, 2), PlotStyle.Line, "EMA8");
				AddPlot(new Stroke(Brushes.Orange, 2), PlotStyle.Line, "EMA13");
				AddPlot(new Stroke(Brushes.Red, 2), PlotStyle.Line, "EMA21");
				AddPlot(new Stroke(Brushes.Blue, 2), PlotStyle.Line, "EMA50");
			}
			else if (State == State.Configure)
			{
				// Clear any existing indicators
				ClearOutputWindow();

				// Initialize EMAs
				ema5 = EMA(5);
				ema8 = EMA(8);
				ema13 = EMA(13);
				ema21 = EMA(21);
				ema50 = EMA(50);
				
				// Initialize RSI
				rsi = RSI(RSIPeriod, 1);
				
				// Initialize ADX
				adx = ADX(14);

				Print("Strategy configured - Indicators initialized");
			}
			else if (State == State.DataLoaded)
			{
				// Verify indicator initialization
				if (ema5 == null || ema8 == null || ema13 == null || ema21 == null || ema50 == null || rsi == null)
				{
					Print("Error: Indicators not properly initialized");
					return;
				}

				Print("Data loaded - All indicators verified");
				atr = ATR(14);

				// Synchronize with existing account position on startup
				SynchronizeWithAccountPosition();

				// Connect to ML Dashboard and start background task
				if (EnableMLDashboard)
				{
					ConnectToMLDashboard();
					StartMLSenderTask();
				}
			}
			else if (State == State.Historical)
			{
				Print("Processing historical data...");
			}
			else if (State == State.Realtime)
			{
				Print("Transitioning to real-time processing");
				SafeDrawText("ModeIndicator", "REAL-TIME MODE", 0, High[0] + (2 * TickSize));
				
				// Final position synchronization check when going live
				SynchronizeWithAccountPosition();
				
				// Load and display historical trades from CSV
				LoadHistoricalTradesFromCSV();
				
				// Ensure ML Dashboard connection is active
				if (EnableMLDashboard && !mlConnected)
				{
					ConnectToMLDashboard();
				}
			}
			else if (State == State.Terminated)
			{
				// Cleanup ML Dashboard connection and resources
				DisconnectFromMLDashboard();
				Print("Strategy terminated - All resources cleaned up");
			}
		}
		protected override void OnBarUpdate()
		{
			if (CurrentBar < BarsRequiredToTrade)
				return;

			// Validate and synchronize position data to prevent display issues
			if (State == State.Realtime)
			{
				ValidateAndResetPositionIfNeeded();
				
				// Periodic position synchronization check (every 10 seconds)
				if (DateTime.Now - lastPositionSyncCheck > positionSyncInterval)
				{
					lastPositionSyncCheck = DateTime.Now;
					PerformPeriodicPositionCheck();
				}
			}

			DrawExtensionLines();

			// Send market data and strategy status to ML Dashboard every bar
			if (EnableMLDashboard && mlConnected && State == State.Realtime)
			{
				SendMarketDataToML();
				SendStrategyStatusToML();
				
				// Update ML predictions every bar
				UpdateMLPredictions();
			}

			// Display mode and status
			if (State == State.Historical)
			{
				// Historical processing
			}
			else if (State == State.Realtime)			{
				Draw.TextFixed(this, "ModeIndicator", "REAL-TIME MODE", TextPosition.TopRight);
				
				string positionInfo = GetActualPositionStatus() == "Flat" ? "NO POSITION" :
					string.Format("{0} {1} @ {2:0.00}", GetActualPositionStatus(), GetActualPositionSize(), 
					Position != null ? Position.AveragePrice : 0.0);
				
				Draw.TextFixed(this, "PositionInfo", positionInfo, TextPosition.TopRight);
				
				if (GetActualPositionStatus() != "Flat")
				{
					string plInfo = string.Format("P/L: ${0:0.00}", GetActualUnrealizedPnL());
					Draw.TextFixed(this, "PLInfo", plInfo, TextPosition.TopRight);
				}

				// ML Dashboard status
				string mlStatus = mlConnected ? "ML: Connected" : "ML: Disconnected";
				Draw.TextFixed(this, "MLStatus", mlStatus, TextPosition.TopLeft);
			}

			try
			{
				// Check if we're in real-time and indicators are ready
				if (State != State.Historical && (ema5 == null || rsi == null))
				{
					Print("Warning: Indicators not ready in real-time");
					return;
				}

				if (CurrentBar < BarsRequiredToTrade)
				{
					if (CurrentBar % 5 == 0)
						Print("Warming up... Bars processed: " + CurrentBar);
					return;
				}

				// Plot EMAs if enabled
				if (ShowEmaRibbon)
				{
					Values[0][0] = ema5[0];
					Values[1][0] = ema8[0];
					Values[2][0] = ema13[0];
					Values[3][0] = ema21[0];
					Values[4][0] = ema50[0];

					// Ribbon coloring logic (match indicator)
					bool bullishAlignment = ema5[0] > ema8[0] && ema8[0] > ema13[0] && ema13[0] > ema21[0];
					bool bearishAlignment = ema5[0] < ema8[0] && ema8[0] < ema13[0] && ema13[0] < ema21[0];

					if (bullishAlignment)
					{
						PlotBrushes[0][0] = Brushes.LimeGreen;
						PlotBrushes[1][0] = Brushes.LimeGreen;
						PlotBrushes[2][0] = Brushes.LimeGreen;
						PlotBrushes[3][0] = Brushes.LimeGreen;
					}
					else if (bearishAlignment)
					{
						PlotBrushes[0][0] = Brushes.Red;
						PlotBrushes[1][0] = Brushes.Red;
						PlotBrushes[2][0] = Brushes.Red;
						PlotBrushes[3][0] = Brushes.Red;
					}
					else
					{
						PlotBrushes[0][0] = Brushes.Gray;
						PlotBrushes[1][0] = Brushes.Gray;
						PlotBrushes[2][0] = Brushes.Gray;
						PlotBrushes[3][0] = Brushes.Gray;
					}

					// Color the EMA50 line based on HTF bias
					if (Close[0] > ema50[0])
					{
						PlotBrushes[4][0] = Brushes.LimeGreen;
					}
					else
					{
						PlotBrushes[4][0] = Brushes.Crimson;
					}

					// Show current values
					string emaInfo = string.Format("EMA5: {0:F2}\nEMA8: {1:F2}\nRSI: {2:F2}", 
						ema5[0], ema8[0], rsi[0]);
					Draw.TextFixed(this, "Indicators", emaInfo, TextPosition.TopLeft);
				}

				// Prevent new entries if a position is already open
				if (Position.MarketPosition != MarketPosition.Flat)
					return;

				// Process signals in both historical and real-time
				bool htfBullish = GetHTFBias();
				
				// Check for trade signals
				CheckForLongSignal(htfBullish);
				CheckForShortSignal(htfBullish);
				
				// Execute trades
				if (isLongSignal)
				{
					Print(string.Format("Long signal detected at {0} - Price: {1}, RSI: {2}", 
						Time[0], Close[0], rsi[0]));
					
					// Send signal to ML Dashboard
					if (EnableMLDashboard && mlConnected)
					{
						SendSignalToML("Long", "Standard", true);
					}
					
					ExecuteLongTrade();
					isLongSignal = false;
				}
				
				if (isShortSignal)
				{
					Print(string.Format("Short signal detected at {0} - Price: {1}, RSI: {2}", 
						Time[0], Close[0], rsi[0]));
					
					// Send signal to ML Dashboard
					if (EnableMLDashboard && mlConnected)
					{
						SendSignalToML("Short", "Standard", true);
					}
					
					ExecuteShortTrade();
					isShortSignal = false;
				}

				// Check for time-based exit
				if (State == State.Realtime && Position.MarketPosition != MarketPosition.Flat)
				{
					if ((Time[0] - entryTime).TotalMinutes >= 30)
					{
						Print("Time stop triggered - Closing position after 30 minutes");
						ExitLong();
						ExitShort();
						return;
					}
				}
			}
			catch (Exception ex)
			{
				Print("Error in OnBarUpdate: " + ex.Message);
			}
		}

		protected override void OnMarketData(MarketDataEventArgs marketDataUpdate)
		{
			// TICK-BASED ULTRA-RESPONSIVE PROCESSING
			if (State != State.Realtime || CurrentBar < BarsRequiredToTrade)
				return;

			try
			{
				tickCount++;
				DateTime now = DateTime.Now;
				
				// Send ultra-responsive tick data to ML dashboard (throttled for performance)
				if (EnableMLDashboard && mlConnected && 
					(now - lastTickUpdate).TotalMilliseconds >= tickUpdateIntervalMs)
				{
					SendTickDataToML(marketDataUpdate);
					lastTickUpdate = now;
				}				// Update real-time display every few ticks for performance
				if (tickCount % 5 == 0)
				{
					UpdateRealTimeTickDisplay();
				}

				// Validate position every 100 ticks to catch any synchronization issues
				if (tickCount % 100 == 0)
				{
					ValidateAndResetPositionIfNeeded();
				}

				// Update indicators less frequently to prevent CPU overload
				if ((now - lastIndicatorUpdate).TotalMilliseconds >= indicatorUpdateIntervalMs)
				{
					if (ShowEmaRibbon)
					{
						UpdateIndicatorDisplays();
					}
					lastIndicatorUpdate = now;
				}
			}
			catch (Exception ex)
			{
				// Don't spam error logs on every tick
				if (tickCount % 1000 == 0)
					Print("❌ Tick processing error: " + ex.Message);
			}
		}

		// ... (Include all the original methods from your strategy)
		private bool GetHTFBias()
		{
			return Close[0] > ema50[0];
		}

		private void CheckForLongSignal(bool htfBullish)
		{
			if (!htfBullish) return;
			
			// Check signal strength filter first
			double signalStrength = CalculateOverallSignalStrength();
			if (signalStrength < minSignalStrength)
			{
				if (EnableMLDashboard && mlConnected)
				{
					SendSignalToML("Long", "Standard", false, $"Signal strength too low: {signalStrength:F1}");
				}
				return;
			}
			
			if (Close[0] > ema50[0] + MaxHTFExtensionATR * atr[0])
			{
				// Send blocked signal to ML Dashboard
				if (EnableMLDashboard && mlConnected)
				{
					SendSignalToML("Long", "Standard", false, "Too far from HTF EMA");
				}
				return;
			}

			double flexThreshold = TickSize * (EntryFlexibilityPercent / 100.0);
			int alignedCount = 0;
			if (Math.Abs(ema5[0] - ema8[0]) <= flexThreshold || ema5[0] > ema8[0]) alignedCount++;
			if (Math.Abs(ema8[0] - ema13[0]) <= flexThreshold || ema8[0] > ema13[0]) alignedCount++;
			if (Math.Abs(ema13[0] - ema21[0]) <= flexThreshold || ema13[0] > ema21[0]) alignedCount++;

			bool emaAligned = alignedCount >= MinEMAsAligned;
			bool rsiCondition = rsi[0] > (RSIOversold - RSIBuffer) && rsi[0] < (RSIOverbought + RSIBuffer);
			bool recentCrossover = (ema5[1] <= ema8[1] + flexThreshold && ema5[0] > ema8[0]) ||
								 (Math.Abs(ema5[0] - ema8[0]) <= flexThreshold && ema5[1] < ema8[1]);
			bool pullbackEntry = (Close[1] <= ema8[1] + flexThreshold && Close[0] > ema8[0]) ||
							   (Math.Abs(Close[0] - ema8[0]) <= flexThreshold && Close[1] < ema8[1]);
			bool signalSeparation = Math.Abs(Close[0] - lastSignalPrice) >= MinSignalSeparation * TickSize ||
								  (Time[0] - lastSignalTime).TotalMinutes >= 5;
			
			if ((recentCrossover || pullbackEntry) && emaAligned && rsiCondition && signalSeparation)
			{
				// ML CONFIRMATION CHECK
				if (!GetMLSignalConfirmation("long"))
				{
					// Send blocked signal to ML Dashboard
					if (EnableMLDashboard && mlConnected)
					{
						SendSignalToML("Long", "ML_Blocked", false, "ML model blocked signal");
					}
					return;
				}
				
				isLongSignal = true;
				lastSignalPrice = Close[0];
				lastSignalTime = Time[0];
				
				// Use safe drawing to prevent memory leaks
				SafeDrawText("LongSignal" + CurrentBar, "🤖↑ ML+LONG", 0, Low[0] - (2 * TickSize), Brushes.LimeGreen);
				
				// Send confirmed signal to ML Dashboard
				if (EnableMLDashboard && mlConnected)
				{
					SendSignalToML("Long", "ML_Confirmed", true, null);
				}
			}
		}

		private void CheckForShortSignal(bool htfBullish)
		{
			if (htfBullish && Close[0] > ema21[0]) return;
			
			// Check signal strength filter first
			double signalStrength = CalculateOverallSignalStrength();
			if (signalStrength < minSignalStrength)
			{
				if (EnableMLDashboard && mlConnected)
				{
					SendSignalToML("Short", "Standard", false, $"Signal strength too low: {signalStrength:F1}");
				}
				return;
			}
			
			if (Close[0] < ema50[0] - MaxHTFExtensionATR * atr[0])
			{
				// Send blocked signal to ML Dashboard
				if (EnableMLDashboard && mlConnected)
				{
					SendSignalToML("Short", "Standard", false, "Too far from HTF EMA");
				}
				return;
			}

			double flexThreshold = TickSize * (EntryFlexibilityPercent / 100.0);
			int alignedCount = 0;
			if (Math.Abs(ema5[0] - ema8[0]) <= flexThreshold || ema5[0] < ema8[0]) alignedCount++;
			if (Math.Abs(ema8[0] - ema13[0]) <= flexThreshold || ema8[0] < ema13[0]) alignedCount++;
			if (Math.Abs(ema13[0] - ema21[0]) <= flexThreshold || ema13[0] < ema21[0]) alignedCount++;

			bool emaAligned = alignedCount >= MinEMAsAligned;
			bool rsiCondition = rsi[0] < (RSIOverbought + RSIBuffer) && rsi[0] > (RSIOversold - RSIBuffer);
			bool recentCrossover = (ema5[1] >= ema8[1] - flexThreshold && ema5[0] < ema8[0]) ||
								 (Math.Abs(ema5[0] - ema8[0]) <= flexThreshold && ema5[1] > ema8[1]);
			bool pullbackEntry = (Close[1] >= ema8[1] - flexThreshold && Close[0] < ema8[0]) ||
							   (Math.Abs(Close[0] - ema8[0]) <= flexThreshold && Close[1] > ema8[1]);
			bool signalSeparation = Math.Abs(Close[0] - lastSignalPrice) >= MinSignalSeparation * TickSize ||
								  (Time[0] - lastSignalTime).TotalMinutes >= 5;
			
			if ((recentCrossover || pullbackEntry) && emaAligned && rsiCondition && signalSeparation)
			{
				// ML CONFIRMATION CHECK
				if (!GetMLSignalConfirmation("short"))
				{
					// Send blocked signal to ML Dashboard
					if (EnableMLDashboard && mlConnected)
					{
						SendSignalToML("Short", "ML_Blocked", false, "ML model blocked signal");
					}
					return;
				}
				
				isShortSignal = true;
				lastSignalPrice = Close[0];
				lastSignalTime = Time[0];
				
				// Use safe drawing to prevent memory leaks
				SafeDrawText("ShortSignal" + CurrentBar, "🤖↓ ML+SHORT", 0, High[0] + (2 * TickSize), Brushes.Red);
				
				// Send confirmed signal to ML Dashboard
				if (EnableMLDashboard && mlConnected)
				{
					SendSignalToML("Short", "ML_Confirmed", true, null);
				}
			}
		}
		
		private void ExecuteLongTrade()
		{
			// Prevent multiple entries
			if (Position.MarketPosition != MarketPosition.Flat)
			{
				Print("⚠️ Already in position - skipping long entry");
				return;
			}
			
			// Dynamic ATR-based stop loss and risk management
			double atrRisk = atr[0] * riskMultiplier;
			double baseStopLoss = Math.Min(Low[0], Math.Min(Low[1], ema13[0])) - atrRisk;
			
			// ML-ADJUSTED STOP LOSS
			double stopLoss = GetMLAdjustedStopLoss(baseStopLoss, true);
			
			// Account-based position sizing
			double accountValue = Account.Get(AccountItem.NetLiquidation, Currency.UsDollar);
			double riskDollars = accountValue * riskPerTrade;
			double riskPerShare = Close[0] - stopLoss;
			int dynamicQuantity = Math.Max(1, (int)(riskDollars / (riskPerShare * Instrument.MasterInstrument.PointValue)));
			int baseQuantity = Math.Min(dynamicQuantity, OrderQuantity); // Cap at max order quantity
			
			// ML-ADJUSTED POSITION SIZE
			int finalQuantity = (int)GetMLAdjustedPositionSize(baseQuantity);
			
			double baseTarget1 = Close[0] + (atrRisk * 1.5);
			double baseTarget2 = Close[0] + (atrRisk * 2.5);
			
			// ML-ADJUSTED TARGETS
			double target1 = GetMLAdjustedTarget(baseTarget1, true);
			double target2 = GetMLAdjustedTarget(baseTarget2, true);
			
			this.stopLoss = stopLoss;
			this.target1 = target1;
			this.target2 = target2;
			entryTime = Time[0];
			
			// Use safe drawing methods to prevent memory leaks
			SafeDrawText("LongEntry" + CurrentBar, "LONG ENTRY", 0, Low[0] - 4 * TickSize, Brushes.LimeGreen);
			SafeDrawLine("EntryLine" + CurrentBar, 0, Close[0], 10, Close[0], Brushes.Cyan);
			SafeDrawLine("StopLine" + CurrentBar, 0, stopLoss, 10, stopLoss, Brushes.Red);
			SafeDrawLine("T1Line" + CurrentBar, 0, target1, 10, target1, Brushes.Gold);
			SafeDrawLine("T2Line" + CurrentBar, 0, target2, 10, target2, Brushes.LimeGreen);
			
			// Time-based exit monitoring
			DateTime maxExitTime = entryTime.Add(maxTradeDuration);
			
			if (finalQuantity > 1)
			{
				int firstTargetQuantity = (int)Math.Ceiling(finalQuantity * 0.6);
				int secondTargetQuantity = finalQuantity - firstTargetQuantity;
				
				// First position with T1 target and stop
				EnterLong(firstTargetQuantity, "Long Entry T1");
				SetStopLoss("Long Entry T1", CalculationMode.Price, stopLoss, false);
				SetProfitTarget("Long Entry T1", CalculationMode.Price, target1);
				TrackEntry("Long", "T1", Close[0]);
				
				// Second position with T2 target and separate stop
				EnterLong(secondTargetQuantity, "Long Entry T2");
				SetStopLoss("Long Entry T2", CalculationMode.Price, stopLoss, false);
				SetProfitTarget("Long Entry T2", CalculationMode.Price, target2);
				TrackEntry("Long", "T2", Close[0]);
				
				longEntryPrice = Close[0];
				movedStopToBreakevenLong = false;
				
				Print($"✅ LONG ENTRY: T1 Qty={firstTargetQuantity} @ {target1:F2}, T2 Qty={secondTargetQuantity} @ {target2:F2}");
				Print($"🛡️ STOPS: Both positions protected @ {stopLoss:F2}");
			}
			else
			{
				// Simple single entry
				EnterLong(finalQuantity);
				SetStopLoss(CalculationMode.Price, stopLoss);
				SetProfitTarget(CalculationMode.Price, target2);
				TrackEntry("Long", "Single", Close[0]);
				
				Print($"✅ LONG ENTRY: Qty={finalQuantity}, Target={target2:F2}, Stop={stopLoss:F2}");
			}
			
			// Reset signal flags to prevent double entries
			isLongSignal = false;
			longEntryPrice = Close[0];
			
			// Send to ML Dashboard
			if (EnableMLDashboard && mlConnected)
			{
				reusableDataDict.Clear();
				reusableDataDict["entry_price"] = Close[0];
				reusableDataDict["stop_loss"] = stopLoss;
				reusableDataDict["target1"] = target1;
				reusableDataDict["target2"] = target2;
				reusableDataDict["quantity"] = finalQuantity;
				reusableDataDict["risk_reward"] = Math.Round((target2 - Close[0]) / (Close[0] - stopLoss), 2);
				reusableDataDict["atr_risk"] = Math.Round(atrRisk, 4);
				reusableDataDict["max_exit_time"] = maxExitTime.ToString("yyyy-MM-dd HH:mm:ss");
				
				string json = CreateOptimizedJsonString("trade_entry", Instrument.FullName, 
					DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
				EnqueueMLMessage(json);
			}
		}
		
		private void ExecuteShortTrade()
		{
			// Prevent multiple entries
			if (Position.MarketPosition != MarketPosition.Flat)
			{
				Print("⚠️ Already in position - skipping short entry");
				return;
			}
			
			// Dynamic ATR-based stop loss and risk management
			double atrRisk = atr[0] * riskMultiplier;
			double baseStopLoss = Math.Max(High[0], Math.Max(High[1], ema13[0])) + atrRisk;
			
			// ML-ADJUSTED STOP LOSS
			double stopLoss = GetMLAdjustedStopLoss(baseStopLoss, false);
			
			// Account-based position sizing
			double accountValue = Account.Get(AccountItem.NetLiquidation, Currency.UsDollar);
			double riskDollars = accountValue * riskPerTrade;
			double riskPerShare = stopLoss - Close[0];
			int dynamicQuantity = Math.Max(1, (int)(riskDollars / (riskPerShare * Instrument.MasterInstrument.PointValue)));
			int baseQuantity = Math.Min(dynamicQuantity, OrderQuantity); // Cap at max order quantity
			
			// ML-ADJUSTED POSITION SIZE
			int finalQuantity = (int)GetMLAdjustedPositionSize(baseQuantity);
			
			double baseTarget1 = Close[0] - (atrRisk * 1.5);
			double baseTarget2 = Close[0] - (atrRisk * 2.5);
			
			// ML-ADJUSTED TARGETS
			double target1 = GetMLAdjustedTarget(baseTarget1, false);
			double target2 = GetMLAdjustedTarget(baseTarget2, false);
			
			this.stopLoss = stopLoss;
			this.target1 = target1;
			this.target2 = target2;
			entryTime = Time[0];
			
			// Use safe drawing methods to prevent memory leaks
			SafeDrawText("ShortEntry" + CurrentBar, "SHORT ENTRY", 0, High[0] + 4 * TickSize, Brushes.Red);
			SafeDrawLine("EntryLine" + CurrentBar, 0, Close[0], 10, Close[0], Brushes.Cyan);
			SafeDrawLine("StopLine" + CurrentBar, 0, stopLoss, 10, stopLoss, Brushes.Red);
			SafeDrawLine("T1Line" + CurrentBar, 0, target1, 10, target1, Brushes.Gold);
			SafeDrawLine("T2Line" + CurrentBar, 0, target2, 10, target2, Brushes.LimeGreen);
			
			// Time-based exit monitoring
			DateTime maxExitTime = entryTime.Add(maxTradeDuration);
			
			if (finalQuantity > 1)
			{
				int firstTargetQuantity = (int)Math.Ceiling(finalQuantity * 0.6);
				int secondTargetQuantity = finalQuantity - firstTargetQuantity;
				
				// First position with T1 target and stop
				EnterShort(firstTargetQuantity, "Short Entry T1");
				SetStopLoss("Short Entry T1", CalculationMode.Price, stopLoss, false);
				SetProfitTarget("Short Entry T1", CalculationMode.Price, target1);
				TrackEntry("Short", "T1", Close[0]);
				
				// Second position with T2 target and separate stop
				EnterShort(secondTargetQuantity, "Short Entry T2");
				SetStopLoss("Short Entry T2", CalculationMode.Price, stopLoss, false);
				SetProfitTarget("Short Entry T2", CalculationMode.Price, target2);
				TrackEntry("Short", "T2", Close[0]);
				
				shortEntryPrice = Close[0];
				movedStopToBreakevenShort = false;
				
				Print($"✅ SHORT ENTRY: T1 Qty={firstTargetQuantity} @ {target1:F2}, T2 Qty={secondTargetQuantity} @ {target2:F2}");
				Print($"🛡️ STOPS: Both positions protected @ {stopLoss:F2}");
			}
			else
			{
				// Simple single entry
				EnterShort(finalQuantity);
				SetStopLoss(CalculationMode.Price, stopLoss);
				SetProfitTarget(CalculationMode.Price, target2);
				TrackEntry("Short", "Single", Close[0]);
				
				Print($"✅ SHORT ENTRY: Qty={finalQuantity}, Target={target2:F2}, Stop={stopLoss:F2}");
			}
			
			// Reset signal flags to prevent double entries
			isShortSignal = false;
			shortEntryPrice = Close[0];
			
			// Send to ML Dashboard
			if (EnableMLDashboard && mlConnected)
			{
				reusableDataDict.Clear();
				reusableDataDict["entry_price"] = Close[0];
				reusableDataDict["stop_loss"] = stopLoss;
				reusableDataDict["target1"] = target1;
				reusableDataDict["target2"] = target2;
				reusableDataDict["quantity"] = finalQuantity;
				reusableDataDict["risk_reward"] = Math.Round((Close[0] - target2) / (stopLoss - Close[0]), 2);
				reusableDataDict["atr_risk"] = Math.Round(atrRisk, 4);
				reusableDataDict["max_exit_time"] = maxExitTime.ToString("yyyy-MM-dd HH:mm:ss");
				
				string json = CreateOptimizedJsonString("trade_entry", Instrument.FullName, 
					DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
				EnqueueMLMessage(json);
			}
		}

		protected override void OnExecutionUpdate(Cbi.Execution execution, string executionId, double price, int quantity, Cbi.MarketPosition marketPosition, string orderId, DateTime time)
		{
			base.OnExecutionUpdate(execution, executionId, price, quantity, marketPosition, orderId, time);

			// Simple execution logging
			Print($"🔄 EXECUTION: {execution.Order?.Name ?? "Unknown"} - {execution.Order?.OrderState} @ {price:F2}, Qty={quantity}");
			
			// Handle entry fills - track entry price
			if (execution.Order != null && execution.Order.OrderState == OrderState.Filled)
			{
				if (execution.Order.OrderAction == OrderAction.Buy)
				{
					longEntryPrice = execution.Order.AverageFillPrice;
					Print($"✅ LONG FILLED @ {longEntryPrice:F2}");
				}
				else if (execution.Order.OrderAction == OrderAction.SellShort)
				{
					shortEntryPrice = execution.Order.AverageFillPrice;
					Print($"✅ SHORT FILLED @ {shortEntryPrice:F2}");
				}
			}

			// Log trade when position is closed
			if (execution.Order != null && (execution.Order.OrderState == OrderState.Filled || execution.Order.OrderState == OrderState.PartFilled))
			{
				if (marketPosition == MarketPosition.Flat)
				{
					double pnl = (lastTradeDirection == "Long") ? 
						(price - lastEntryPrice) * execution.Quantity :
						(lastEntryPrice - price) * execution.Quantity;
					
					// Send trade to ML Dashboard
					if (EnableMLDashboard && mlConnected)
					{
						SendTradeToML(lastTradeDirection, lastEntryPrice, price, pnl);
					}
					
					// Draw exit marker
					string exitName = "Exit" + CurrentBar;
					Brush exitColor = pnl >= 0 ? Brushes.LimeGreen : Brushes.Red;
					
					if (lastTradeDirection == "Long")
					{
						Draw.Diamond(this, exitName, false, 0, High[0] + 2 * TickSize, exitColor);
						Draw.Text(this, "ExitText" + CurrentBar, 
							string.Format("EXIT {0:+0.00;-0.00}", pnl), 
							0, High[0] + 4 * TickSize, exitColor);
					}
					else
					{
						Draw.Diamond(this, exitName, false, 0, Low[0] - 2 * TickSize, exitColor);
						Draw.Text(this, "ExitText" + CurrentBar, 
							string.Format("EXIT {0:+0.00;-0.00}", pnl), 
							0, Low[0] - 4 * TickSize, exitColor);
					}
					
					Draw.Line(this, "TradeLine" + CurrentBar, false, 
						Time[0], price, lastEntryTime, lastEntryPrice, 
						exitColor, DashStyleHelper.Solid, 1);
					
					TrackExitAndLog(price);
				}
			}			// Enhanced position state tracking
			Print($"🔄 EXECUTION FINAL: Strategy Position = {Position?.MarketPosition}, Execution MarketPos = {marketPosition}");
			
			if (Position.MarketPosition == MarketPosition.Flat)
			{
				Print($"🔄 POSITION WENT FLAT - Resetting all variables");
				
				// Reset all position-related variables when position becomes flat
				ResetPositionVariables();
				
				// Log the position reset for debugging
				Print($"🔄 Position reset to FLAT - All position variables cleared at {DateTime.Now:HH:mm:ss.fff}");
				
				// Force synchronization check
				SynchronizeWithAccountPosition();
			}
			else if (Position.MarketPosition != MarketPosition.Flat)
			{
				// Update entry tracking for existing positions
				if (entryPrice == 0 && Position.AveragePrice > 0)
				{
					Print($"🔄 UPDATING entry tracking: {Position.MarketPosition} @ {Position.AveragePrice:F2}");
					entryPrice = Position.AveragePrice;
					lastEntryPrice = Position.AveragePrice;
					lastTradeDirection = Position.MarketPosition.ToString();
					entryTime = DateTime.Now;
					lastEntryTime = DateTime.Now;
				}
			}
		}

		private void TrackExitAndLog(double exitPrice)
		{
			double pnl = (lastTradeDirection == "Long") ? (exitPrice - lastEntryPrice) : (lastEntryPrice - exitPrice);
			LogTrade(
				lastTradeDirection,
				lastTradeType,
				lastEntryPrice,
				exitPrice,
				pnl,
				ema5[0], ema8[0], ema13[0], ema21[0], ema50[0],
				rsi[0], atr[0],
				lastEntryTime,
				Time[0]
			);
		}

		private void LogTrade(string direction, string tradeType, double entry, double exit, double pnl, double ema5, double ema8, double ema13, double ema21, double ema50, double rsi, double atr, DateTime entryTime, DateTime exitTime)
		{
			string logLine = $"{entryTime},{exitTime},{direction},{tradeType},{entry},{exit},{pnl},{ema5},{ema8},{ema13},{ema21},{ema50},{rsi},{atr}";
			System.IO.File.AppendAllText(logFilePath, logLine + Environment.NewLine);
		}

		private void TrackEntry(string direction, string tradeType, double entryPrice)
		{
			lastEntryPrice = entryPrice;
			lastEntryTime = Time[0];
			lastTradeDirection = direction;
			lastTradeType = tradeType;
		}

		protected void DrawExtensionLines()
		{
			if (CurrentBar < BarsRequiredToTrade) return;
			if (ema50 == null || atr == null) return;
			if (CurrentBar == 0) return;

			double longExtPrev = ema50[1] + MaxHTFExtensionATR * atr[1];
			double longExtCurr = ema50[0] + MaxHTFExtensionATR * atr[0];
			double shortExtPrev = ema50[1] - MaxHTFExtensionATR * atr[1];
			double shortExtCurr = ema50[0] - MaxHTFExtensionATR * atr[0];

			Draw.Line(this, "LongExtensionLine" + CurrentBar, false, 1, longExtPrev, 0, longExtCurr, Brushes.MediumPurple, DashStyleHelper.Solid, 2);
			Draw.Line(this, "ShortExtensionLine" + CurrentBar, false, 1, shortExtPrev, 0, shortExtCurr, Brushes.OrangeRed, DashStyleHelper.Solid, 2);
		}

		#region Properties
		[NinjaScriptProperty]
		[Range(1, int.MaxValue)]
		[Display(Name="Order Quantity", Description="Number of contracts to trade.", Order=1, GroupName="Parameters")]
		public int OrderQuantity { get; set; }

		[NinjaScriptProperty]
		[Range(1.0, 5.0)]
		[Display(Name = "Risk:Reward Ratio", Description = "Target risk to reward ratio", Order = 2, GroupName = "Parameters")]
		public double RiskRewardRatio { get; set; }

		[NinjaScriptProperty]
		[Range(5, 50)]
		[Display(Name = "Min Signal Separation", Description = "Minimum ticks between signals", Order = 3, GroupName = "Parameters")]
		public int MinSignalSeparation { get; set; }

		[NinjaScriptProperty]
		[Range(0.5, 3.0)]
		[Display(Name = "ATR Multiplier", Description = "Multiplier for stop loss calculation", Order = 4, GroupName = "Parameters")]
		public double ATRMultiplier { get; set; }

		[NinjaScriptProperty]
		[Range(5, 25)]
		[Display(Name = "RSI Period", Description = "RSI calculation period", Order = 5, GroupName = "Parameters")]
		public int RSIPeriod { get; set; }

		[NinjaScriptProperty]
		[Range(60, 85)]
		[Display(Name = "RSI Overbought", Description = "RSI overbought level", Order = 6, GroupName = "Parameters")]
		public double RSIOverbought { get; set; }

		[NinjaScriptProperty]
		[Range(15, 40)]
		[Display(Name = "RSI Oversold", Description = "RSI oversold level", Order = 7, GroupName = "Parameters")]
		public double RSIOversold { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Show EMA Ribbon", Description = "Display EMA lines on chart", Order = 8, GroupName = "Visual")]
		public bool ShowEmaRibbon { get; set; }

		[NinjaScriptProperty]
		[Range(0.5, 5.0)]
		[Display(Name = "Max HTF Extension (ATR)", Description = "Max allowed extension above/below HTF EMA (in ATR multiples)", Order = 9, GroupName = "Parameters")]
		public double MaxHTFExtensionATR { get; set; }

		[NinjaScriptProperty]
		[Range(0, 100)]
		[Display(Name = "Entry Flexibility %", Description = "Percentage to relax EMA alignment requirements", Order = 10, GroupName = "Entry Parameters")]
		public int EntryFlexibilityPercent { get; set; }

		[NinjaScriptProperty]
		[Range(2, 4)]
		[Display(Name = "Min EMAs Aligned", Description = "Minimum number of EMAs that must be aligned", Order = 11, GroupName = "Entry Parameters")]
		public int MinEMAsAligned { get; set; }

		[NinjaScriptProperty]
		[Range(0, 20)]
		[Display(Name = "RSI Buffer", Description = "Buffer zone around RSI levels", Order = 12, GroupName = "Entry Parameters")]
		public int RSIBuffer { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "Enable ML Dashboard", Description = "Connect to ML Dashboard for analytics", Order = 13, GroupName = "ML Dashboard")]
		public bool EnableMLDashboard { get; set; }

		[NinjaScriptProperty]
		[Display(Name = "ML Server Host", Description = "ML Dashboard server hostname", Order = 14, GroupName = "ML Dashboard")]
		public string MLServerHost { get; set; }

		[NinjaScriptProperty]
		[Range(1000, 65535)]
		[Display(Name = "ML Server Port", Description = "ML Dashboard server port", Order = 15, GroupName = "ML Dashboard")]
		public int MLServerPort { get; set; }

		// Enhanced strategy parameters
		[NinjaScriptProperty]
		[Display(Name="Min Signal Strength", Description="Minimum signal strength required for entry (0-100)", Order=16, GroupName="Enhanced")]
		public double MinSignalStrength 
		{ 
			get { return minSignalStrength; } 
			set { minSignalStrength = value; } 
		}

		[NinjaScriptProperty]
		[Display(Name="Risk Multiplier", Description="ATR-based risk multiplier for stop calculation", Order=17, GroupName="Enhanced")]
		public double RiskMultiplier 
		{ 
			get { return riskMultiplier; } 
			set { riskMultiplier = value; } 
		}

		[NinjaScriptProperty]
		[Display(Name="Max Trade Duration (Minutes)", Description="Maximum time to hold a trade before forced exit", Order=18, GroupName="Enhanced")]
		public int MaxTradeDurationMinutes 
		{ 
			get { return (int)maxTradeDuration.TotalMinutes; } 
			set { maxTradeDuration = TimeSpan.FromMinutes(value); } 
		}

		[NinjaScriptProperty]
		[Display(Name="Risk Per Trade (%)", Description="Percentage of account to risk per trade (0.01 = 1%)", Order=19, GroupName="Enhanced")]
		public double RiskPerTrade 
		{ 
			get { return riskPerTrade; } 
			set { riskPerTrade = Math.Max(0.001, Math.Min(0.10, value)); } // Cap between 0.1% and 10%
		}
		
		[NinjaScriptProperty]
		[Display(Name="Use ML Predictions", Description="Enable ML-based signal confirmation and adjustments", Order=20, GroupName="Machine Learning")]
		public bool UseMLPredictions 
		{ 
			get { return useMLPredictions; } 
			set { useMLPredictions = value; } 
		}
		
		[NinjaScriptProperty]
		[Range(0.5, 1.0)]
		[Display(Name="ML Min Confidence", Description="Minimum ML confidence required for trades (0.65 = 65%)", Order=21, GroupName="Machine Learning")]
		public double MLMinConfidence 
		{ 
			get { return mlMinConfidence; } 
			set { mlMinConfidence = Math.Max(0.5, Math.Min(1.0, value)); } 
		}
		#endregion

		#region POSITION SYNCHRONIZATION AND HISTORICAL TRADES
		
		private void SynchronizeWithAccountPosition()
		{
			try
			{
				Print("🔄 SYNCHRONIZING with account position...");
				Print($"🔄 Strategy State: {State}");
				Print($"🔄 Account Status: {(Account != null ? "Available" : "NULL")}");
				Print($"🔄 Position Status: {(Position != null ? "Available" : "NULL")}");
				
				// Get actual account position with enhanced debugging
				string actualPosition = GetActualPositionStatus();
				int actualSize = GetActualPositionSize();
				double actualUnrealizedPnL = GetActualUnrealizedPnL();
				
				Print($"📊 Account Position Status: {actualPosition}");
				Print($"📊 Account Position Size: {actualSize}");
				Print($"📊 Account Unrealized P&L: ${actualUnrealizedPnL:F2}");
				
				// Enhanced position detection for existing positions
				if (actualPosition != "Flat" && actualSize > 0)
				{
					Print($"🔍 FOUND EXISTING POSITION: {actualPosition} {actualSize}");
					
					if (entryPrice == 0 || lastEntryPrice == 0)
					{
						Print("⚠️ DETECTED EXISTING POSITION - Strategy variables not synchronized!");
						
						// Try multiple approaches to get position data
						double positionPrice = 0;
						MarketPosition positionDirection = MarketPosition.Flat;
						
						// Method 1: Account positions
						if (Account != null && Account.Positions != null)
						{
							var accountPosition = Account.Positions.FirstOrDefault(p => 
								p.Instrument.FullName == Instrument.FullName) ??
								Account.Positions.FirstOrDefault(p => 
								p.Instrument.MasterInstrument.Name == Instrument.MasterInstrument.Name) ??
								Account.Positions.FirstOrDefault(p => 
								p.Instrument.MasterInstrument.Name.Contains(Instrument.MasterInstrument.Name.Substring(0, Math.Min(3, Instrument.MasterInstrument.Name.Length))));
							
							if (accountPosition != null)
							{
								positionPrice = accountPosition.AveragePrice;
								positionDirection = accountPosition.MarketPosition;
								Print($"📍 Found account position: {positionDirection} @ {positionPrice:F2}");
							}
						}
						
						// Method 2: Fallback to strategy position
						if (positionPrice == 0 && Position != null && Position.MarketPosition != MarketPosition.Flat)
						{
							positionPrice = Position.AveragePrice;
							positionDirection = Position.MarketPosition;
							Print($"📍 Using strategy position: {positionDirection} @ {positionPrice:F2}");
						}
						
						// Method 3: Last resort - use current price and infer direction from actualPosition
						if (positionPrice == 0)
						{
							positionPrice = Close[0];
							positionDirection = actualPosition == "Long" ? MarketPosition.Long : MarketPosition.Short;
							Print($"📍 Inferring position: {positionDirection} @ current price {positionPrice:F2}");
						}
						
						// Synchronize strategy variables
						if (positionPrice > 0)
						{
							entryPrice = positionPrice;
							lastEntryPrice = positionPrice;
							lastEntryTime = DateTime.Now; // Approximate since we don't have exact entry time
							entryTime = DateTime.Now;
							
							// Set direction based on position
							if (positionDirection == MarketPosition.Long)
							{
								lastTradeDirection = "Long";
								longEntryPrice = positionPrice;
								Print($"✅ SYNCHRONIZED Long position @ {positionPrice:F2}");
							}
							else if (positionDirection == MarketPosition.Short)
							{
								lastTradeDirection = "Short";
								shortEntryPrice = positionPrice;
								Print($"✅ SYNCHRONIZED Short position @ {positionPrice:F2}");
							}
							
							// Calculate approximate stops and targets based on ATR
							if (atr != null && atr.IsValidDataPoint(0))
							{
								double atrValue = atr[0];
								if (positionDirection == MarketPosition.Long)
								{
									stopLoss = positionPrice - (atrValue * riskMultiplier);
									target1 = positionPrice + (atrValue * 1.5);
									target2 = positionPrice + (atrValue * 2.5);
								}
								else
								{
									stopLoss = positionPrice + (atrValue * riskMultiplier);
									target1 = positionPrice - (atrValue * 1.5);
									target2 = positionPrice - (atrValue * 2.5);
								}
								Print($"✅ CALCULATED Stop: {stopLoss:F2}, T1: {target1:F2}, T2: {target2:F2}");
							}
							else
							{
								Print("⚠️ ATR not available - cannot calculate stops and targets");
							}
							
							Print("🎯 POSITION SYNCHRONIZATION COMPLETE");
						}
						else
						{
							Print("❌ Could not determine position price for synchronization");
						}
					}
					else
					{
						Print("✅ Position already synchronized - Strategy variables match account");
						Print($"   Entry Price: {entryPrice:F2}, Direction: {lastTradeDirection}");
					}
				}
				else if (actualPosition == "Flat" && actualSize == 0)
				{
					// Ensure strategy variables are reset
					Print("✅ Account is FLAT - Ensuring strategy variables are reset");
					ResetPositionVariables();
				}
				else
				{
					Print($"⚠️ Inconsistent position data - Status: {actualPosition}, Size: {actualSize}");
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Error synchronizing with account position: {ex.Message}");
				Print($"❌ Stack trace: {ex.StackTrace}");
			}
		}
		
		private void ResetPositionVariables()
		{
			entryPrice = 0;
			stopLoss = 0;
			target1 = 0;
			target2 = 0;
			longEntryPrice = 0;
			shortEntryPrice = 0;
			movedStopToBreakevenLong = false;
			movedStopToBreakevenShort = false;
			lastEntryPrice = 0;
			entryTime = DateTime.MinValue;
			lastEntryTime = DateTime.MinValue;
			lastTradeDirection = "";
			lastTradeType = "";
			
			Print("🔄 All position variables reset to FLAT state");
		}
		
		private void LoadHistoricalTradesFromCSV()
		{
			try
			{
				if (!System.IO.File.Exists(logFilePath))
				{
					Print("📈 No historical trade log found - Starting fresh");
					return;
				}
				
				string[] lines = System.IO.File.ReadAllLines(logFilePath);
				Print($"📈 Loading {lines.Length} historical trades from CSV...");
				
				int tradesLoaded = 0;
				int tradesDisplayed = 0;
				
				foreach (string line in lines)
				{
					if (string.IsNullOrWhiteSpace(line)) continue;
					
					try
					{
						// Parse CSV: EntryTime,ExitTime,Direction,TradeType,Entry,Exit,PnL,EMA5,EMA8,EMA13,EMA21,EMA50,RSI,ATR
						string[] parts = line.Split(',');
						if (parts.Length >= 7)
						{
							DateTime entryTime = DateTime.Parse(parts[0]);
							DateTime exitTime = DateTime.Parse(parts[1]);
							string direction = parts[2];
							double entryPrice = double.Parse(parts[4]);
							double exitPrice = double.Parse(parts[5]);
							double pnl = double.Parse(parts[6]);
							
							// Only display trades from today or recent days
							if (entryTime.Date >= DateTime.Now.AddDays(-7).Date)
							{
								// Find the bar index for entry time (approximate)
								int entryBarIndex = GetBarIndexFromTime(entryTime);
								int exitBarIndex = GetBarIndexFromTime(exitTime);
								
								if (entryBarIndex >= 0 && exitBarIndex >= 0)
								{
									// Draw historical trade markers
									DrawHistoricalTrade(direction, entryPrice, exitPrice, pnl, entryBarIndex, exitBarIndex, tradesDisplayed);
									tradesDisplayed++;
								}
							}
							
							tradesLoaded++;
						}
					}
					catch (Exception lineEx)
					{
						// Skip malformed lines
						Print($"⚠️ Skipping malformed trade line: {lineEx.Message}");
					}
				}
				
				Print($"✅ Loaded {tradesLoaded} historical trades, displayed {tradesDisplayed} recent trades");
				
				// Send historical trade summary to ML Dashboard
				if (EnableMLDashboard && mlConnected)
				{
					SendHistoricalTradeSummaryToML(tradesLoaded, tradesDisplayed);
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Error loading historical trades: {ex.Message}");
			}
		}
		
		private int GetBarIndexFromTime(DateTime targetTime)
		{
			try
			{
				// Search for the closest bar to the target time
				for (int i = Math.Min(CurrentBar, 1000); i >= 0; i--)
				{
					if (i < CurrentBar && Time[i] <= targetTime)
					{
						return i;
					}
				}
				return -1; // Not found
			}
			catch
			{
				return -1;
			}
		}
		
		private void DrawHistoricalTrade(string direction, double entryPrice, double exitPrice, double pnl, int entryBarIndex, int exitBarIndex, int tradeIndex)
		{
			try
			{
				string entryTag = $"HistEntry_{tradeIndex}";
				string exitTag = $"HistExit_{tradeIndex}";
				string lineTag = $"HistLine_{tradeIndex}";
				string textTag = $"HistText_{tradeIndex}";
				
				Brush entryColor = direction == "Long" ? Brushes.CadetBlue : Brushes.DarkOrange;
				Brush exitColor = pnl >= 0 ? Brushes.MediumSeaGreen : Brushes.Crimson;
				
				// Draw entry marker
				if (direction == "Long")
				{
					SafeDrawText(entryTag, "H▲", entryBarIndex, entryPrice - (4 * TickSize), entryColor);
				}
				else
				{
					SafeDrawText(entryTag, "H▼", entryBarIndex, entryPrice + (4 * TickSize), entryColor);
				}
				
				// Draw exit marker
				if (direction == "Long")
				{
					SafeDrawText(exitTag, "H◆", exitBarIndex, exitPrice + (2 * TickSize), exitColor);
				}
				else
				{
					SafeDrawText(exitTag, "H◆", exitBarIndex, exitPrice - (2 * TickSize), exitColor);
				}
				
				// Draw trade line
				SafeDrawLine(lineTag, entryBarIndex, entryPrice, exitBarIndex, exitPrice, exitColor);
				
				// Draw P&L text
				SafeDrawText(textTag, $"H${pnl:+0.00;-0.00}", exitBarIndex, 
					direction == "Long" ? exitPrice + (6 * TickSize) : exitPrice - (6 * TickSize), 
					exitColor);
			}
			catch (Exception ex)
			{
				Print($"Error drawing historical trade: {ex.Message}");
			}
		}
		
		private void SendHistoricalTradeSummaryToML(int totalTrades, int displayedTrades)
		{
			try
			{
				reusableDataDict.Clear();
				reusableDataDict["totalHistoricalTrades"] = totalTrades;
				reusableDataDict["displayedTrades"] = displayedTrades;
				reusableDataDict["logFilePath"] = logFilePath;
				reusableDataDict["syncedAt"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
				
				string jsonData = CreateOptimizedJsonString("historicalTradeSummary", 
					instrumentName, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"), reusableDataDict);
				
				EnqueueMLMessage(jsonData);
				Print($"📊 Sent historical trade summary to ML Dashboard: {totalTrades} total, {displayedTrades} displayed");
			}
			catch (Exception ex)
			{
				Print($"Error sending historical trade summary: {ex.Message}");
			}
		}
		
		private void PerformPeriodicPositionCheck()
		{
			try
			{
				// Lightweight position check without full sync
				string currentPosition = GetActualPositionStatus();
				int currentSize = GetActualPositionSize();
				
				// Check for position changes that weren't captured by normal flow
				bool positionChanged = false;
				
				if (currentPosition == "Flat" && currentSize == 0)
				{
					// If account is flat but strategy variables indicate position
					if (entryPrice != 0 || lastEntryPrice != 0)
					{
						Print("🔄 PERIODIC CHECK: Position closed externally - resetting strategy variables");
						ResetPositionVariables();
						positionChanged = true;
					}
				}
				else if (currentPosition != "Flat" && currentSize > 0)
				{
					// If account has position but strategy doesn't know about it
					if (entryPrice == 0 || lastEntryPrice == 0)
					{
						Print("🔄 PERIODIC CHECK: New position detected - triggering sync");
						SynchronizeWithAccountPosition();
						positionChanged = true;
					}
					

				}
				
				// Update ML dashboard if position changed
				if (positionChanged && EnableMLDashboard && mlConnected)
				{
					SendStrategyStatusToML();
				}
			}
			catch (Exception ex)
			{
				Print($"Error in periodic position check: {ex.Message}");
			}
		}
		
		private void EnsureAllPositionsHaveStops()
		{
			try
			{
				// Check if we have any positions without stop losses
				if (Position.Quantity != 0)
				{
					// Count active stop loss orders
					int activeStops = 0;
					int activePositions = Math.Abs(Position.Quantity);
					
					foreach (var order in Account.Orders)
					{
						if (order.Instrument == Instrument && 
							order.OrderState == OrderState.Working && 
							order.OrderType == OrderType.StopMarket)
						{
							activeStops++;
						}
					}
					
					Print($"🛡️ STOP CHECK: Positions={activePositions}, Active Stops={activeStops}");
					
					// If we have positions but no stops, apply emergency stops
					if (activeStops == 0 && activePositions > 0)
					{
						Print($"🚨 EMERGENCY: {activePositions} positions without stops! Applying emergency stops...");
						
						if (Position.MarketPosition == MarketPosition.Long)
						{
							double emergencyStop = Position.AveragePrice - (atr[0] * riskMultiplier);
							SetStopLoss(CalculationMode.Price, emergencyStop);
							Print($"🛡️ Applied emergency LONG stop @ {emergencyStop:F2}");
						}
						else if (Position.MarketPosition == MarketPosition.Short)
						{
							double emergencyStop = Position.AveragePrice + (atr[0] * riskMultiplier);
							SetStopLoss(CalculationMode.Price, emergencyStop);
							Print($"🛡️ Applied emergency SHORT stop @ {emergencyStop:F2}");
						}
					}
					else if (activeStops < activePositions)
					{
						Print($"⚠️ WARNING: Only {activeStops} stops for {activePositions} positions!");
						
						// Try to apply additional stops for unprotected positions
						if (Position.MarketPosition == MarketPosition.Long && !movedStopToBreakevenLong)
						{
							double protectiveStop = Math.Min(stopLoss, Position.AveragePrice - (atr[0] * riskMultiplier));
							SetStopLoss(CalculationMode.Price, protectiveStop);
							Print($"🛡️ Applied additional LONG stop @ {protectiveStop:F2}");
						}
						else if (Position.MarketPosition == MarketPosition.Short && !movedStopToBreakevenShort)
						{
							double protectiveStop = Math.Max(stopLoss, Position.AveragePrice + (atr[0] * riskMultiplier));
							SetStopLoss(CalculationMode.Price, protectiveStop);
							Print($"🛡️ Applied additional SHORT stop @ {protectiveStop:F2}");
						}
					}
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Error ensuring stops: {ex.Message}");
			}
		}

		#endregion

		#region POSITION VALIDATION METHODS
		private string GetActualPositionStatus()
		{
			try
			{
				Print($"🔍 DEBUG: Getting position status for instrument: {Instrument?.FullName ?? "NULL"}");
				
				// Method 1: Check Account.Positions collection with multiple matching approaches
				if (Account != null && Account.Positions != null)
				{
					Print($"🔍 DEBUG: Account has {Account.Positions.Count()} total positions");
					
					// Try multiple instrument matching approaches
					var accountPosition = Account.Positions.FirstOrDefault(p => 
						p.Instrument.FullName == Instrument.FullName) ??
						Account.Positions.FirstOrDefault(p => 
						p.Instrument.MasterInstrument.Name == Instrument.MasterInstrument.Name) ??
						Account.Positions.FirstOrDefault(p => 
						p.Instrument.MasterInstrument.Name.Contains(Instrument.MasterInstrument.Name.Substring(0, Math.Min(3, Instrument.MasterInstrument.Name.Length))));
					
					// Debug: Print all positions in account
					foreach (var pos in Account.Positions)
					{
						Print($"🔍 DEBUG: Account position - Instrument: {pos.Instrument.FullName}, Position: {pos.MarketPosition}, Qty: {pos.Quantity}");
					}
					
					if (accountPosition != null)
					{
						Print($"🔍 DEBUG: Found matching account position: {accountPosition.MarketPosition} Qty: {accountPosition.Quantity}");
						
						// Validate account position consistency
						if (accountPosition.Quantity == 0)
						{
							Print("✅ Account position is FLAT (Quantity = 0)");
							return "Flat";
						}
						
						// Check for mismatch between MarketPosition and actual quantity
						if (accountPosition.MarketPosition == MarketPosition.Flat && accountPosition.Quantity != 0)
						{
							Print($"⚠️ WARNING: Account position mismatch - MarketPosition is Flat but Quantity is {accountPosition.Quantity}. Returning Flat.");
							return "Flat";
						}
						
						if (accountPosition.MarketPosition != MarketPosition.Flat && accountPosition.Quantity == 0)
						{
							Print($"⚠️ WARNING: Account position mismatch - MarketPosition is {accountPosition.MarketPosition} but Quantity is 0. Returning Flat.");
							return "Flat";
						}
						
						string result = accountPosition.MarketPosition.ToString();
						Print($"✅ Using account position: {result} with Qty: {accountPosition.Quantity}");
						return result;
					}
					else
					{
						Print("🔍 DEBUG: No matching account position found");
					}
				}
				else
				{
					Print("🔍 DEBUG: Account or Account.Positions is null");
				}
				
				// Method 2: Fallback to strategy position but validate it
				if (Position != null)
				{
					Print($"🔍 DEBUG: Strategy position: {Position.MarketPosition} Qty: {Position.Quantity}");
					
					// Check if strategy thinks it has a position but quantity is 0
					if (Position.MarketPosition != MarketPosition.Flat && Position.Quantity == 0)
					{
						Print("WARNING: Strategy position mismatch detected - Position shows " + 
							Position.MarketPosition + " but Quantity is 0. Resetting to FLAT.");
						return "Flat";
					}
					
					string result = Position.MarketPosition.ToString();
					Print($"⚠️ Using strategy position: {result}");
					return result;
				}
				else
				{
					Print("🔍 DEBUG: Strategy Position is null");
				}
				
				Print("🔍 DEBUG: No position found anywhere, returning Flat");
				return "Flat";
			}
			catch (Exception ex)
			{
				Print($"❌ Error getting actual position: {ex.Message}");
				Print($"❌ Stack trace: {ex.StackTrace}");
				return "Flat";
			}
		}
				private int GetActualPositionSize()
		{
			try
			{
				// Use the same matching logic as GetActualPositionStatus
				if (Account != null && Account.Positions != null)
				{
					// Try multiple instrument matching approaches
					var accountPosition = Account.Positions.FirstOrDefault(p => 
						p.Instrument.FullName == Instrument.FullName) ??
						Account.Positions.FirstOrDefault(p => 
						p.Instrument.MasterInstrument.Name == Instrument.MasterInstrument.Name) ??
						Account.Positions.FirstOrDefault(p => 
						p.Instrument.MasterInstrument.Name.Contains(Instrument.MasterInstrument.Name.Substring(0, Math.Min(3, Instrument.MasterInstrument.Name.Length))));
					
					if (accountPosition != null)
					{
						Print($"🔍 DEBUG: Account position size: {Math.Abs(accountPosition.Quantity)}");
						
						// Additional validation: if MarketPosition is Flat, quantity should be 0
						if (accountPosition.MarketPosition == MarketPosition.Flat)
						{
							if (accountPosition.Quantity != 0)
							{
								Print($"⚠️ WARNING: Account position size mismatch - MarketPosition is Flat but Quantity is {accountPosition.Quantity}. Returning 0.");
								return 0;
							}
						}
						
						return Math.Abs(accountPosition.Quantity);
					}
				}
				
				// Fallback to strategy position
				if (Position != null)
				{
					Print($"🔍 DEBUG: Strategy position size: {Math.Abs(Position.Quantity)}");
					
					// Additional validation: if MarketPosition is Flat, quantity should be 0
					if (Position.MarketPosition == MarketPosition.Flat)
					{
						if (Position.Quantity != 0)
						{
							Print($"⚠️ WARNING: Strategy position size mismatch - MarketPosition is Flat but Quantity is {Position.Quantity}. Returning 0.");
							return 0;
						}
					}
					
					return Math.Abs(Position.Quantity);
				}
				
				Print("🔍 DEBUG: No position found for size calculation, returning 0");
				return 0;
			}
			catch (Exception ex)
			{
				Print($"❌ Error getting actual position size: {ex.Message}");
				return 0;
			}
		}
		
		private double GetActualUnrealizedPnL()
		{
			try
			{
				// Get the actual P&L from account
				if (Account != null && Account.Positions != null)
				{
					var accountPosition = Account.Positions.FirstOrDefault(p => 
						p.Instrument.FullName == Instrument.FullName);
					
					if (accountPosition != null)
					{
						return accountPosition.GetUnrealizedProfitLoss(PerformanceUnit.Currency, Close[0]);
					}
				}
				
				// Fallback to strategy position
				if (Position != null && Position.MarketPosition != MarketPosition.Flat)
				{
					return Position.GetUnrealizedProfitLoss(PerformanceUnit.Currency, Close[0]);
				}
				
				return 0.0;
			}
			catch (Exception ex)
			{
				Print($"Error getting actual unrealized PnL: {ex.Message}");
				return 0.0;
			}
		}
				private void ValidateAndResetPositionIfNeeded()
		{
			try
			{
				// Check for position synchronization issues
				string actualPosition = GetActualPositionStatus();
				int actualSize = GetActualPositionSize();
				
				// Enhanced validation with detailed logging
				if (actualPosition == "Flat" && actualSize == 0)
				{
					// Check if strategy variables are still holding old position data
					bool needsReset = (entryPrice != 0 || stopLoss != 0 || target1 != 0 || target2 != 0 || 
									   longEntryPrice != 0 || shortEntryPrice != 0 || lastEntryPrice != 0);
					
					if (needsReset)
					{
						Print($"🔄 POSITION MISMATCH DETECTED - Position is FLAT but variables still set:");
						Print($"   entryPrice: {entryPrice}, stopLoss: {stopLoss}, target1: {target1}, target2: {target2}");
						Print($"   longEntryPrice: {longEntryPrice}, shortEntryPrice: {shortEntryPrice}");
						Print($"   lastEntryPrice: {lastEntryPrice}, entryTime: {entryTime}");
						
						// Use the new reset method
						ResetPositionVariables();
						
						Print("✅ Position validation: All position data reset to FLAT state");
					}
				}
				else if (actualPosition != "Flat" && actualSize > 0)
				{
					// Position is not flat - validate consistency and sync if needed
					if (entryPrice == 0 || lastEntryPrice == 0)
					{
						Print($"⚠️ WARNING: Position is {actualPosition} but strategy variables not set. Attempting re-sync...");
						SynchronizeWithAccountPosition();
					}
					else
					{
						// Position tracking looks good
						Print($"✅ Position tracking validated: {actualPosition} {actualSize} @ {entryPrice:F2}");
					}
				}
			}
			catch (Exception ex)
			{
				Print($"Error in position validation: {ex.Message}");
			}
		}
		
		#endregion
		
		// === END POSITION VALIDATION METHODS ===
		
		#endregion
	}
}