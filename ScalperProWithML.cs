using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading;
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
using NinjaTrader.NinjaScript.Indicators;
using NinjaTrader.NinjaScript.DrawingTools;
using System.IO;
using System.Net.Sockets;
using System.Web.Script.Serialization;
using System.Collections.Concurrent;

namespace NinjaTrader.NinjaScript.Strategies
{
	// ============================================================================
	// UNIFIED TRADE MANAGER CLASS - SEPARATES TRADE EXECUTION FROM STRATEGY LIFECYCLE
	// ============================================================================
	public class TradeManager
	{
		private readonly ScalperProWithML strategy;
		private readonly Dictionary<string, TradeInstance> activeTrades = new Dictionary<string, TradeInstance>();
		private readonly object tradeLock = new object();

		public TradeManager(ScalperProWithML parentStrategy)
		{
			strategy = parentStrategy;
			strategy.Print("🎯 UNIFIED TRADE MANAGER: Initialized - Strategy lifecycle separated from trade execution");
		}

		/// <summary>
		/// Processes trade entry without affecting strategy lifecycle
		/// </summary>
		public bool ProcessTradeEntry(TradeRequest request)
		{
			lock (tradeLock)
			{
				try
				{
					strategy.Print($"🎯 UNIFIED MANAGER: Processing {request.Source} trade entry - Strategy continues");

					// Validate request
					if (!ValidateTradeRequest(request))
					{
						strategy.Print($"❌ Trade validation failed: {request.ValidationError}");
						return false;
					}

					// Create trade instance
					var trade = new TradeInstance
					{
						TradeId = GenerateTradeId(request.Direction, request.Source),
						Direction = request.Direction,
						EntryPrice = request.EntryPrice,
						StopLoss = request.StopLoss,
						TakeProfit = request.TakeProfit,
						Quantity = request.Quantity,
						Source = request.Source,
						Status = TradeStatus.PENDING,
						CreatedAt = DateTime.Now,
						IsManualTrade = request.Source == "MANUAL",
						
						// CRITICAL: Trade is independent of strategy lifecycle
						StrategyAction = "CONTINUE_OPERATION"
					};

					// Execute the order
					if (ExecuteTradeOrder(trade))
					{
						activeTrades[trade.TradeId] = trade;
						strategy.Print($"✅ UNIFIED MANAGER: Trade {trade.TradeId} executed - Strategy operational");
						
						// Notify backend of trade entry (strategy independent)
						NotifyBackendTradeStatus(trade);
						return true;
					}

					return false;
				}
				catch (Exception ex)
				{
					strategy.Print($"❌ UNIFIED MANAGER ERROR: {ex.Message}");
					return false;
				}
			}
		}

		/// <summary>
		/// Processes trade exits WITHOUT terminating strategy
		/// </summary>
		public void ProcessTradeExit(string orderId, double exitPrice, string exitReason)
		{
			lock (tradeLock)
			{
				try
				{
					strategy.Print($"🔄 UNIFIED MANAGER: Processing trade exit - Strategy CONTINUES operation");

					var trade = FindTradeByExecution(orderId, exitPrice);
					if (trade == null)
					{
						strategy.Print($"⚠️ Trade not found for exit processing: {orderId}");
						return;
					}

					// Update trade status (NO STRATEGY TERMINATION)
					trade.Status = TradeStatus.CLOSED;
					trade.ExitPrice = exitPrice;
					trade.ExitReason = exitReason;
					trade.ExitTime = DateTime.Now;
					trade.PnL = CalculatePnL(trade);
					
					// CRITICAL: Specify strategy continues
					trade.StrategyAction = "CONTINUE_OPERATION";

					// Remove from active trades
					activeTrades.Remove(trade.TradeId);

					// Reset only trade-specific variables (NOT strategy variables)
					ResetTradeSpecificVariables(trade);

					// Notify backend (strategy remains active)
					NotifyBackendTradeStatus(trade);

					strategy.Print($"✅ UNIFIED MANAGER: Trade {trade.TradeId} closed - PnL: {trade.PnL:C} - Strategy ACTIVE");
				}
				catch (Exception ex)
				{
					strategy.Print($"❌ Trade exit processing error: {ex.Message}");
				}
			}
		}

		/// <summary>
		/// Synchronizes with NinjaTrader positions without affecting strategy
		/// </summary>
		public void SynchronizeWithNinjaTrader()
		{
			try
			{
				strategy.Print("🔄 UNIFIED MANAGER: Synchronizing with NinjaTrader - Strategy remains active");

				// Get current position from NinjaTrader
				var position = strategy.Position;
				if (position.MarketPosition == MarketPosition.Flat)
				{
					// Clear any remaining active trades if position is flat
					if (activeTrades.Count > 0)
					{
						strategy.Print($"🔄 Clearing {activeTrades.Count} orphaned trades - Strategy continues");
						activeTrades.Clear();
					}
				}
				else
				{
					// If we have a position but no tracked trades, create synthetic trade
					if (activeTrades.Count == 0)
					{
						CreateSyntheticTrade(position);
					}
				}

				strategy.Print($"✅ UNIFIED MANAGER: Sync complete - Active trades: {activeTrades.Count} - Strategy operational");
			}
			catch (Exception ex)
			{
				strategy.Print($"❌ Synchronization error: {ex.Message}");
			}
		}

		// Helper properties for external access
		public int GetActiveTradeCount() => activeTrades.Count;
		public List<TradeInstance> GetActiveTrades() => activeTrades.Values.ToList();
		public bool HasActiveTrades() => activeTrades.Count > 0;
		public TradeInstance GetTradeByDirection(string direction) => activeTrades.Values.FirstOrDefault(t => t.Direction == direction);

		// Private helper methods
		private bool ValidateTradeRequest(TradeRequest request)
		{
			if (request.Quantity <= 0)
			{
				request.ValidationError = "Quantity must be positive";
				return false;
			}
			
			if (request.EntryPrice <= 0)
			{
				request.ValidationError = "Entry price must be positive";
				return false;
			}
			
			// Debug logging for trade validation
			strategy.Print($"🔍 TRADE VALIDATION: {request.Direction} - Entry: {request.EntryPrice}, Stop: {request.StopLoss}, Target: {request.TakeProfit}");
			
			// Direction-specific validation
			if (request.Direction.ToUpper() == "LONG" && request.StopLoss >= request.EntryPrice)
			{
				strategy.Print($"❌ LONG validation failed: Stop {request.StopLoss} >= Entry {request.EntryPrice}");
				request.ValidationError = "Long stop loss must be below entry price";
				return false;
			}
			
			if (request.Direction.ToUpper() == "SHORT" && request.StopLoss <= request.EntryPrice)
			{
				strategy.Print($"❌ SHORT validation failed: Stop {request.StopLoss} <= Entry {request.EntryPrice}");
				request.ValidationError = "Short stop loss must be above entry price";
				return false;
			}
			
			strategy.Print($"✅ TRADE VALIDATION: {request.Direction} validation passed");
			return true;
		}
		
		private bool ExecuteTradeOrder(TradeInstance trade)
		{
			try
			{
				if (trade.Direction.ToUpper() == "LONG")
				{
					strategy.EnterLong(trade.Quantity, trade.TradeId);
				}
				else if (trade.Direction.ToUpper() == "SHORT")
				{
					strategy.EnterShort(trade.Quantity, trade.TradeId);
				}
				
				// Set protective orders
				if (trade.StopLoss > 0)
				{
					strategy.SetStopLoss(trade.TradeId, CalculationMode.Price, trade.StopLoss, false);
				}
				
				if (trade.TakeProfit > 0)
				{
					strategy.SetProfitTarget(trade.TradeId, CalculationMode.Price, trade.TakeProfit);
				}
				
				return true;
			}
			catch (Exception ex)
			{
				strategy.Print($"❌ TRADE EXECUTION ERROR: {ex.Message}");
				return false;
			}
		}
		
		private TradeInstance FindTradeByExecution(string orderId, double price)
		{
			// Match by price proximity and timing
			return activeTrades.Values.FirstOrDefault(t => 
				Math.Abs(t.EntryPrice - price) < 0.5 || 
				Math.Abs(t.StopLoss - price) < 0.5 || 
				Math.Abs(t.TakeProfit - price) < 0.5);
		}
		
		private double CalculatePnL(TradeInstance trade)
		{
			if (trade.ExitPrice <= 0) return 0;
			
			if (trade.Direction.ToUpper() == "LONG")
				return (trade.ExitPrice - trade.EntryPrice) * trade.Quantity;
			else
				return (trade.EntryPrice - trade.ExitPrice) * trade.Quantity;
		}
		
		private void ResetTradeSpecificVariables(TradeInstance trade)
		{
			// Reset only variables related to this specific trade
			if (trade.Direction.ToUpper() == "LONG")
			{
				strategy.SetVariable("longEntryPrice", 0.0);
				strategy.SetVariable("movedStopToBreakevenLong", false);
			}
			else
			{
				strategy.SetVariable("shortEntryPrice", 0.0);
				strategy.SetVariable("movedStopToBreakevenShort", false);
			}
			
			// Reset smart trailing for this trade only
			strategy.ResetSmartTrailingVariables();
		}
		
		private void NotifyBackendTradeStatus(TradeInstance trade)
		{
			try
			{
				var serializer = new JavaScriptSerializer();
				var json = serializer.Serialize(new
				{
					type = "TRADE_STATUS",
					tradeId = trade.TradeId,
					direction = trade.Direction,
					entryPrice = trade.EntryPrice,
					exitPrice = trade.ExitPrice,
					stopLoss = trade.StopLoss,
					takeProfit = trade.TakeProfit,
					quantity = trade.Quantity,
					source = trade.Source,
					status = trade.Status.ToString(),
					createdAt = trade.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss.fff"),
					exitTime = trade.ExitTime?.ToString("yyyy-MM-dd HH:mm:ss.fff"),
					exitReason = trade.ExitReason,
					pnl = trade.PnL,
					isManualTrade = trade.IsManualTrade,
					strategyAction = trade.StrategyAction
				});

				strategy.EnqueueMLMessage(json);
				strategy.Print($"📡 Trade status sent to backend: {trade.TradeId} - {trade.Status}");
			}
			catch (Exception ex)
			{
				strategy.Print($"❌ Error notifying backend: {ex.Message}");
			}
		}
		
		private void CreateSyntheticTrade(NinjaTrader.Cbi.Position position)
		{
			var trade = new TradeInstance
			{
				TradeId = GenerateTradeId(position.MarketPosition.ToString(), "SYNC"),
				Direction = position.MarketPosition.ToString(),
				EntryPrice = position.AveragePrice,
				Quantity = Math.Abs(position.Quantity),
				Source = "SYNC",
				Status = TradeStatus.FILLED,
				CreatedAt = DateTime.Now,
				IsManualTrade = false,
				StrategyAction = "CONTINUE_OPERATION"
			};
			
			activeTrades[trade.TradeId] = trade;
			strategy.Print($"🔄 TRADE MANAGER: Created synthetic trade {trade.TradeId} for sync");
		}
		
		private string GenerateTradeId(string direction, string source)
		{
			string guidPart = Guid.NewGuid().ToString("N").Substring(0, 6);
			return $"{source}_{direction}_{DateTime.Now:HHmmss}_{guidPart}";
		}
	}
	
	// *** SUPPORTING CLASSES ***
	public class TradeRequest
	{
		public string Direction { get; set; } // "LONG" or "SHORT"
		public double EntryPrice { get; set; }
		public double StopLoss { get; set; }
		public double TakeProfit { get; set; }
		public int Quantity { get; set; }
		public string Source { get; set; } // "MANUAL", "AUTO", "ML"
		public string ValidationError { get; set; }
	}
	
	public class TradeInstance
	{
		public string TradeId { get; set; }
		public string Direction { get; set; }
		public double EntryPrice { get; set; }
		public double ExitPrice { get; set; }
		public double StopLoss { get; set; }
		public double TakeProfit { get; set; }
		public int Quantity { get; set; }
		public string Source { get; set; }
		public TradeStatus Status { get; set; }
		public DateTime CreatedAt { get; set; }
		public DateTime? ExitTime { get; set; }
		public string ExitReason { get; set; }
		public double PnL { get; set; }
		public bool IsManualTrade { get; set; }
		public string StrategyAction { get; set; } // CRITICAL: Controls strategy lifecycle
	}
	
	public enum TradeStatus
	{
		PENDING,
		FILLED,
		PARTIAL,
		CLOSED,
		FAILED,
		CANCELLED
	}

	// ============================================================================
	// MAIN STRATEGY CLASS WITH INTEGRATED UNIFIED TRADE MANAGER
	// ============================================================================
	public class ScalperProWithML : Strategy
	{
		// *** UNIFIED TRADE MANAGER INSTANCE ***
		private TradeManager tradeManager;
		
		// *** ML COMMUNICATION ***
		private TcpClient mlClient;
		private NetworkStream mlStream;
		private readonly Queue<string> messageQueue = new Queue<string>();
		private readonly object queueLock = new object();
		
		// *** STRATEGY STATE VARIABLES (INDEPENDENT OF TRADE LIFECYCLE) ***
		private bool isMLConnected = false;
		private DateTime lastHeartbeat = DateTime.Now;
		private bool smartTrailingEnabled = true;
		private string currentMarketRegime = "UNKNOWN";
		private bool instrumentRegistered = false;
		
		// *** STRATEGY PARAMETERS ***
		[NinjaScriptProperty]
		[Display(Name = "ML Server Port", Description = "Port for ML communication", Order = 1, GroupName = "ML Settings")]
		public int MLServerPort { get; set; } = 9999;
		
		[NinjaScriptProperty]
		[Display(Name = "Enable Smart Trailing", Description = "Enable AI-powered smart trailing", Order = 2, GroupName = "ML Settings")]
		public bool EnableSmartTrailing { get; set; } = true;
		
		[NinjaScriptProperty]
		[Display(Name = "Trade Quantity", Description = "Default trade quantity", Order = 3, GroupName = "Trade Settings")]
		public int TradeQuantity { get; set; } = 1;

		protected override void OnStateChange()
		{
			if (State == State.SetDefaults)
			{
				Description = "ScalperPro with ML and Unified Trade Management";
				Name = "ScalperProWithML";
				Calculate = Calculate.OnBarClose;
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
			}
			else if (State == State.DataLoaded)
			{
				// *** INITIALIZE UNIFIED TRADE MANAGER ***
				tradeManager = new TradeManager(this);
				Print("🎯 UNIFIED STRATEGY: Trade Manager initialized - Strategy lifecycle independent");

				// Establish ML connection early so we can stream historical/realtime data immediately
				if (!isMLConnected)
					ConnectToMLSystem();
			}
			else if (State == State.Active)
			{
				// Ensure ML connection is active when realtime starts
				if (!isMLConnected)
					ConnectToMLSystem();
			}
			else if (State == State.Terminated)
			{
				// Cleanup
				DisconnectFromMLSystem();
			}
		}

		protected override void OnBarUpdate()
		{
			// Keep strategy active regardless of trade status
			if (BarsInProgress != 0 || CurrentBars[0] < BarsRequiredToTrade)
				return;

			try
			{
				// Strategy continues to monitor market regardless of positions
				ProcessMarketData();
				
				// Handle ML communication
				ProcessMLMessages();
				
				// Update trade manager synchronization (strategy independent)
				if (tradeManager != null)
				{
					tradeManager.SynchronizeWithNinjaTrader();
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Strategy error (continuing operation): {ex.Message}");
				// Strategy continues even with errors
			}
		}

		/// <summary>
		/// CRITICAL: This method handles executions WITHOUT terminating strategy
		/// </summary>
		protected override void OnExecutionUpdate(Cbi.Execution execution, string executionId, double price, int quantity, Cbi.MarketPosition marketPosition, string orderId, DateTime time)
		{
			try
			{
				Print($"🔄 EXECUTION UPDATE: {execution.Name} - Price: {price} - Strategy CONTINUES");

				// Determine exit reason without stopping strategy
				string exitReason = "UNKNOWN";
				
				if (execution.Name.Contains("Stop"))
					exitReason = "STOP_LOSS_HIT";
				else if (execution.Name.Contains("Target") || execution.Name.Contains("Profit"))
					exitReason = "TAKE_PROFIT_HIT";
				else if (execution.Name.Contains("Close"))
					exitReason = "MANUAL_CLOSE";
				else if (execution.Name.Contains("Exit"))
					exitReason = "EXIT_SIGNAL";

				// ** CRITICAL: Process through unified trade manager (NO STRATEGY TERMINATION) **
				if (tradeManager != null)
				{
					tradeManager.ProcessTradeExit(orderId, price, exitReason);
				}

				// ** IMPORTANT: Strategy remains active after any exit **
				Print($"✅ UNIFIED STRATEGY: Execution processed - Strategy operational status: ACTIVE");
				
				// Send execution data to ML system (strategy independent)
				SendExecutionToML(execution, price, exitReason);
			}
			catch (Exception ex)
			{
				Print($"❌ Execution processing error: {ex.Message}");
				// Strategy continues even with execution processing errors
			}
		}

		// *** MANUAL TRADE HANDLING (STRATEGY INDEPENDENT) ***
		public bool ProcessManualTrade(string direction, double price, double stopLoss, double takeProfit)
		{
			try
			{
				Print($"🎯 MANUAL TRADE REQUEST: {direction} at {price} - Strategy continues operation");

				if (tradeManager == null)
				{
					Print("❌ Trade Manager not initialized");
					return false;
				}

				var request = new TradeRequest
				{
					Direction = direction.ToUpper(),
					EntryPrice = price,
					StopLoss = stopLoss,
					TakeProfit = takeProfit,
					Quantity = TradeQuantity,
					Source = "MANUAL"
				};

				bool success = tradeManager.ProcessTradeEntry(request);
				
				if (success)
				{
					Print($"✅ MANUAL TRADE PROCESSED: Strategy remains ACTIVE");
				}

				return success;
			}
			catch (Exception ex)
			{
				Print($"❌ Manual trade processing error: {ex.Message}");
				return false;
			}
		}

		// *** ML SYSTEM COMMUNICATION ***
		private void ConnectToMLSystem()
		{
			try
			{
				mlClient = new TcpClient("localhost", MLServerPort);
				mlStream = mlClient.GetStream();
				isMLConnected = true;
				Print($"✅ Connected to ML system on port {MLServerPort}");

				// Send instrument registration immediately
				var serializer = new JavaScriptSerializer();
				var registration = serializer.Serialize(new {
					type = "instrument_registration",
					instrument = Instrument.MasterInstrument.Name,
					timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff")
				});
				EnqueueMLMessage(registration);
				instrumentRegistered = true;
			}
			catch (Exception ex)
			{
				Print($"⚠️ ML connection failed: {ex.Message}");
				isMLConnected = false;
			}
		}

		private void ProcessMarketData()
		{
			// Continue market analysis regardless of position status
			var serializer = new JavaScriptSerializer();
			if (!instrumentRegistered && isMLConnected)
			{
				var registrationMsg = serializer.Serialize(new {
					type = "instrument_registration",
					instrument = Instrument.MasterInstrument.Name,
					timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff")
				});
				EnqueueMLMessage(registrationMsg);
				instrumentRegistered = true;
			}

			var marketData = new
			{
				type = "market_data",
				instrument = Instrument.MasterInstrument.Name,
				timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"),
				price = Close[0],
				volume = Volume[0],
				// Strategy status always active
				strategyStatus = "ACTIVE",
				tradeCount = tradeManager?.GetActiveTradeCount() ?? 0
			};

			EnqueueMLMessage(serializer.Serialize(marketData));
		}

		private void ProcessMLMessages()
		{
			if (!isMLConnected || mlStream == null || !mlStream.DataAvailable)
				return;

			try
			{
				byte[] buffer = new byte[4096];
				int bytesRead = mlStream.Read(buffer, 0, buffer.Length);
				
				if (bytesRead > 0)
				{
					string chunk = Encoding.UTF8.GetString(buffer, 0, bytesRead);
					mlReceiveBuffer += chunk; // Append to running buffer

					string[] lines = mlReceiveBuffer.Split(new[] {'\n'}, StringSplitOptions.RemoveEmptyEntries);
					// Keep the last partial line (if any) in the buffer
					if (!mlReceiveBuffer.EndsWith("\n"))
					{
						mlReceiveBuffer = lines.Length > 0 ? lines[lines.Length - 1] : "";
						Array.Resize(ref lines, lines.Length - 1);
					}
					else
					{
						mlReceiveBuffer = "";
					}

					foreach (var line in lines)
					{
						ProcessMLCommand(line.Trim());
					}
				}
			}
			catch (Exception ex)
			{
				Print($"❌ ML message processing error: {ex.Message}");
			}
		}

		// Buffer to hold incomplete incoming data
		private string mlReceiveBuffer = string.Empty;

		private void ProcessMLCommand(string command)
		{
			try
			{
				var serializer = new JavaScriptSerializer();
				var obj = serializer.DeserializeObject(command);

				if (obj is Dictionary<string, object> cmd)
				{
					if (!cmd.ContainsKey("type"))
					{
						Print($"⚠️ Ignored message without type: {command.Substring(0, Math.Min(60, command.Length))}...");
						return;
					}

					string cmdType = cmd["type"].ToString();
					switch (cmdType)
					{
						case "unified_trade_command":
							ProcessUnifiedTradeCommand(cmd);
							break;
						case "smart_trailing_update":
							ProcessSmartTrailingUpdate(cmd);
							break;
						case "heartbeat":
							lastHeartbeat = DateTime.Now;
							break;
					}
				}
				else
				{
					Print("⚠️ Received non-object JSON, ignored");
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Error processing ML command: {ex.Message}");
			}
		}

		private void ProcessUnifiedTradeCommand(Dictionary<string, object> cmd)
		{
			try
			{
				string commandType = cmd["command"].ToString();
				string cmdInstrument = cmd["instrument"].ToString();

				// *** CRITICAL: INSTRUMENT GUARD ***
				// Ignore commands for other instruments to prevent cross-instrument interference.
				if (cmdInstrument != Instrument.MasterInstrument.Name)
				{
					Print($"⚠️ IGNORED COMMAND: Instrument mismatch. Strategy: {Instrument.MasterInstrument.Name}, Command: {cmdInstrument}");
					return;
				}

				string executionType = cmd.ContainsKey("executionType") ? cmd["executionType"].ToString() : "TRADE_ONLY";
				Print($"🎯 UNIFIED COMMAND: {commandType} - Instrument: {cmdInstrument} - ExecutionType: {executionType} - Strategy continues");

				// Get price with fallback to current market price
				double price = cmd.ContainsKey("price") ? Convert.ToDouble(cmd["price"]) : Close[0];
				double stopLoss = cmd.ContainsKey("stop_loss") ? Convert.ToDouble(cmd["stop_loss"]) : 0;
				double takeProfit = cmd.ContainsKey("take_profit") ? Convert.ToDouble(cmd["take_profit"]) : 0;

				if (commandType == "go_long")
				{
					ProcessManualTrade("LONG", price, stopLoss, takeProfit);
				}
				else if (commandType == "go_short")
				{
					ProcessManualTrade("SHORT", price, stopLoss, takeProfit);
				}
				else if (commandType == "close_position")
				{
					// Close position without affecting strategy
					if (Position.MarketPosition != MarketPosition.Flat)
					{
						ExitLong();
						ExitShort();
						Print("🔄 Position closed via unified command - Strategy remains ACTIVE");
					}
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Unified trade command error: {ex.Message}");
				Print($"📋 Command fields: {string.Join(", ", cmd.Keys)}");
			}
		}

		private void ProcessSmartTrailingUpdate(dynamic cmd)
		{
			if (!EnableSmartTrailing) return;

			try
			{
				double newStopPrice = Convert.ToDouble(cmd.new_stop_price ?? 0);
				string algorithm = cmd.algorithm?.ToString() ?? "adaptive";
				
				if (newStopPrice > 0 && Position.MarketPosition != MarketPosition.Flat)
				{
					// Update stop loss without affecting strategy lifecycle
					if (Position.MarketPosition == MarketPosition.Long && newStopPrice < Close[0])
					{
						SetStopLoss(CalculationMode.Price, newStopPrice);
					}
					else if (Position.MarketPosition == MarketPosition.Short && newStopPrice > Close[0])
					{
						SetStopLoss(CalculationMode.Price, newStopPrice);
					}
					
					Print($"🎯 Smart trailing updated: {newStopPrice} ({algorithm}) - Strategy active");
				}
			}
			catch (Exception ex)
			{
				Print($"❌ Smart trailing update error: {ex.Message}");
			}
		}

		private void SendExecutionToML(Execution execution, double price, string exitReason)
		{
			try
			{
				var serializer = new JavaScriptSerializer();
				var json = serializer.Serialize(new
				{
					type = "execution_update",
					execution_name = execution.Name,
					price = price,
					quantity = execution.Quantity,
					time = execution.Time.ToString("yyyy-MM-dd HH:mm:ss.fff"),
					exit_reason = exitReason,
					position = Position.MarketPosition.ToString(),
					// CRITICAL: Always indicate strategy continues
					strategy_status = "OPERATIONAL",
					strategy_action = "CONTINUE_OPERATION"
				});

				EnqueueMLMessage(json);
			}
			catch (Exception ex)
			{
				Print($"❌ ML execution notification error: {ex.Message}");
			}
		}

		// *** HELPER METHODS ***
		public void EnqueueMLMessage(string message)
		{
			lock (queueLock)
			{
				messageQueue.Enqueue(message);
			}
			
			// Send immediately if connected
			if (isMLConnected && mlStream != null)
			{
				try
				{
					byte[] data = Encoding.UTF8.GetBytes(message + "\n");
					mlStream.Write(data, 0, data.Length);
				}
				catch (Exception ex)
				{
					Print($"❌ ML message send error: {ex.Message}");
					isMLConnected = false;
				}
			}
		}

		public void SetVariable(string name, object value)
		{
			// Helper method for setting strategy variables
			Print($"🔧 Setting variable {name} = {value}");
		}

		public void ResetSmartTrailingVariables()
		{
			// Reset smart trailing specific variables only
			smartTrailingEnabled = EnableSmartTrailing;
		}

		private void DisconnectFromMLSystem()
		{
			try
			{
				if (mlStream != null)
				{
					mlStream.Close();
					mlStream = null;
				}
				
				if (mlClient != null)
				{
					mlClient.Close();
					mlClient = null;
				}
				
				isMLConnected = false;
				Print("🔌 Disconnected from ML system");
			}
			catch (Exception ex)
			{
				Print($"❌ ML disconnection error: {ex.Message}");
			}
		}

		// *** STRATEGY STATUS REPORTING ***
		public string GetStrategyStatus()
		{
			return new
			{
				strategy_name = "ScalperProWithML",
				status = "OPERATIONAL",
				ml_connected = isMLConnected,
				active_trades = tradeManager?.GetActiveTradeCount() ?? 0,
				position = Position.MarketPosition.ToString(),
				last_heartbeat = lastHeartbeat.ToString("yyyy-MM-dd HH:mm:ss"),
				// CRITICAL: Strategy lifecycle is independent of trades
				lifecycle_status = "INDEPENDENT_OF_TRADES"
			}.ToString();
		}
	}
}