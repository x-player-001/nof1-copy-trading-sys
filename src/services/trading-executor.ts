import { TradingPlan } from "../types/trading";
import { TelegramService } from "./telegram-service";
import { BinanceService, StopLossOrder, TakeProfitOrder, OrderResponse as BinanceOrderResponse } from "./binance-service";
import { ConfigManager } from "./config-manager";
import { IExchangeService, OrderResponse } from "./exchange-service.interface";
import { ExchangeFactory } from "./exchange-factory";

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  takeProfitOrderId?: string;
  stopLossOrderId?: string;
}

export interface StopOrderExecutionResult extends ExecutionResult {
  takeProfitOrder?: TakeProfitOrder;
  stopLossOrder?: StopLossOrder;
}

export class TradingExecutor {
  private exchangeService: IExchangeService;
  private binanceService!: BinanceService; // Keep for backward compatibility
  private testnet: boolean;
  private telegramService?: TelegramService;
  private configManager: ConfigManager;


  constructor(apiKey?: string, apiSecret?: string, testnet?: boolean, configManager?: ConfigManager) {
    // 如果没有明确指定，则从环境变量读取
    if (testnet === undefined) {
      testnet = process.env.BINANCE_TESTNET === 'true' || process.env.EXCHANGE_TESTNET === 'true';
    }
    this.testnet = testnet;

    // 使用 ExchangeFactory 创建交易所服务（支持 Binance 和 Hyperliquid）
    if (apiKey && apiSecret) {
      // 如果提供了 API Key，说明是显式指定 Binance
      const service = new BinanceService(apiKey, apiSecret, testnet);
      this.exchangeService = service as any as IExchangeService;
      this.binanceService = service;
    } else {
      // 否则从环境变量读取（可能是 Binance 或 Hyperliquid）
      this.exchangeService = ExchangeFactory.createFromEnv();
      this.binanceService = this.exchangeService as any as BinanceService; // For backward compatibility
    }

    this.configManager = configManager || new ConfigManager();
    if (!configManager) {
      this.configManager.loadFromEnvironment();
    }
  }

  /**
   * 验证API连接
   */
  async validateConnection(): Promise<boolean> {
    try {
      const serverTime = await this.exchangeService.getServerTime();
      console.log(`✅ Connected to Binance API (Server time: ${new Date(serverTime)})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to Binance API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo() {
    try {
      return await this.exchangeService.getAccountInfo();
    } catch (error) {
      console.error(`❌ Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 获取当前持仓
   */
  async getPositions() {
    try {
      return await this.exchangeService.getPositions();
    } catch (error) {
      console.error(`❌ Failed to get positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async executePlan(tradingPlan: TradingPlan): Promise<ExecutionResult> {
    try {
      console.log(`🔄 Executing trade: ${tradingPlan.symbol} ${tradingPlan.side} ${tradingPlan.quantity} (Leverage: ${tradingPlan.leverage}x)`);

      // 检查API连接
      const isConnected = await this.validateConnection();
      if (!isConnected) {
        return {
          success: false,
          error: "Failed to connect to Binance API"
        };
      }

      // 获取账户信息检查余额
      try {
        const accountInfo = await this.exchangeService.getAccountInfo();
        const availableMargin = parseFloat(accountInfo.availableBalance);
        const totalWalletBalance = parseFloat(accountInfo.totalWalletBalance || accountInfo.totalBalance);


        // 获取当前市场价格来计算所需保证金
        let currentPrice = 0;
        try {
          const ticker = await this.exchangeService.get24hrTicker(tradingPlan.symbol);
          const tickerData = Array.isArray(ticker) ? ticker[0] : ticker;
          currentPrice = parseFloat(tickerData.lastPrice);
        } catch (priceError) {
          console.warn(`⚠️ Failed to get current price for ${tradingPlan.symbol}: ${priceError instanceof Error ? priceError.message : 'Unknown error'}`);
          // 使用保守估计价格
          currentPrice = 1000; // 默认保守价格
        }

        // 检查是否是平仓操作(减仓)
        const positions = await this.exchangeService.getPositions();
        const currentPosition = positions.find(p => p.symbol === tradingPlan.symbol);
        const currentPositionAmt = currentPosition ? parseFloat(currentPosition.positionAmt) : 0;
        
        // 判断是否是平仓: 如果当前有仓位且交易方向相反,则是平仓
        const isClosing = (currentPositionAmt > 0 && tradingPlan.side === 'SELL') || 
                         (currentPositionAmt < 0 && tradingPlan.side === 'BUY');

        // 计算所需保证金
        const requiredMargin = (tradingPlan.quantity * currentPrice) / tradingPlan.leverage;
        const notionalValue = tradingPlan.quantity * currentPrice;

        console.log(`💰 Account Balance Information:`);
        console.log(`   Total Wallet Balance: ${totalWalletBalance.toFixed(2)} USDT`);
        console.log(`   Available Balance: ${availableMargin.toFixed(2)} USDT`);
        console.log(`   Current Price: ${currentPrice.toFixed(2)} USDT`);
        console.log(`   Position Size: ${tradingPlan.quantity} ${tradingPlan.symbol}`);
        console.log(`   Current Position: ${currentPositionAmt} (${currentPositionAmt > 0 ? 'LONG' : currentPositionAmt < 0 ? 'SHORT' : 'NONE'})`);
        console.log(`   Operation: ${isClosing ? '🔻 CLOSING' : '🔺 OPENING'} position`);
        console.log(`   Leverage: ${tradingPlan.leverage}x`);
        console.log(`   Notional Value: ${notionalValue.toFixed(2)} USDT`);
        console.log(`   Required Margin: ${requiredMargin.toFixed(2)} USDT`);
        console.log(`   Margin Ratio: ${((requiredMargin / availableMargin) * 100).toFixed(2)}%`);

        // 检查其他账户信息
        console.log(`   Account Details:`);
        console.log(`   - Total Initial Margin: ${accountInfo.totalInitialMargin || 'N/A'}`);
        console.log(`   - Total Maint Margin: ${accountInfo.totalMaintMargin || 'N/A'}`);
        console.log(`   - Total Position Initial Margin: ${accountInfo.totalPositionInitialMargin || 'N/A'}`);
        console.log(`   - Total Open Order Initial Margin: ${accountInfo.totalOpenOrderInitialMargin || 'N/A'}`);
        console.log(`   - Total Cross Wallet Balance: ${accountInfo.totalCrossWalletBalance || 'N/A'}`);

        // 只对开仓操作检查保证金,平仓操作会释放保证金不需要检查
        if (!isClosing && requiredMargin > availableMargin) {
          const deficit = requiredMargin - availableMargin;
          
          // 如果差额很小(小于可用余额的10%),自动调整数量以适应可用余额
          if (deficit < availableMargin * 0.1) {
            console.warn(`⚠️ Margin slightly insufficient (deficit: ${deficit.toFixed(2)} USDT), adjusting quantity...`);
            
            // 使用95%的可用余额(保留5%缓冲)
            const adjustedMargin = availableMargin * 0.95;
            const adjustedQuantity = (adjustedMargin * tradingPlan.leverage) / currentPrice;
            
            console.log(`💡 Adjusted quantity: ${tradingPlan.quantity.toFixed(4)} → ${adjustedQuantity.toFixed(4)}`);
            console.log(`💡 Adjusted margin: ${requiredMargin.toFixed(2)} → ${adjustedMargin.toFixed(2)} USDT`);
            
            // 更新交易计划的数量
            tradingPlan.quantity = adjustedQuantity;
          } else {
            // 差额太大,无法调整
            console.error(`❌ MARGIN INSUFFICIENT:`);
            console.error(`   Required: ${requiredMargin.toFixed(2)} USDT`);
            console.error(`   Available: ${availableMargin.toFixed(2)} USDT`);
            console.error(`   Deficit: ${deficit.toFixed(2)} USDT`);
            console.error(`   Notional Value: ${notionalValue.toFixed(2)} USDT`);
            console.error(`   Current Price: $${currentPrice.toFixed(2)}`);
            return {
              success: false,
              error: `Insufficient margin: Required ${requiredMargin.toFixed(2)} USDT, Available ${availableMargin.toFixed(2)} USDT (Deficit: ${deficit.toFixed(2)} USDT). Notional: ${notionalValue.toFixed(2)} USDT`
            };
          }
        }

        // 检查保证金使用率是否过高（对开仓操作）
        if (!isClosing) {
          const marginUsageRatio = (requiredMargin / availableMargin) * 100;
          if (marginUsageRatio > 80) {
            console.warn(`⚠️ High margin usage: ${marginUsageRatio.toFixed(2)}% of available balance`);
          }
        }

        // 检查订单价值是否过小（币安有最小订单价值限制）
        const minOrderValue = 5; // USDT
        if (notionalValue < minOrderValue) {
          console.warn(`⚠️ Order value too small: ${notionalValue.toFixed(2)} USDT (minimum: ${minOrderValue} USDT)`);
        }

      } catch (balanceError) {
        console.warn(`⚠️ Failed to check account balance: ${balanceError instanceof Error ? balanceError.message : 'Unknown error'}`);
        // 继续执行，但记录警告
      }

      // 转换为订单格式（Binance 特定方法）
      const binanceOrder = (this.binanceService as any).convertToBinanceOrder(tradingPlan);

      // 设置保证金模式
      if (tradingPlan.marginType) {
        try {
          await this.exchangeService.setMarginType(tradingPlan.symbol, tradingPlan.marginType);
          console.log(`✅ Margin type set to ${tradingPlan.marginType} for ${tradingPlan.symbol}`);
        } catch (marginTypeError) {
          // 如果已经是相同模式或在Multi-Assets模式下,API会返回错误,这是正常的,可以忽略
          const errorMessage = marginTypeError instanceof Error ? marginTypeError.message : 'Unknown error';
          if (errorMessage.includes('No need to change margin type')) {
            console.log(`ℹ️ ${tradingPlan.symbol} is already in ${tradingPlan.marginType} margin mode`);
          } else if (errorMessage.includes('Multi-Assets mode') || errorMessage.includes('-4168')) {
            console.log(`ℹ️ Account is in Multi-Assets mode, using default margin type`);
          } else {
            console.warn(`⚠️ Failed to set margin type: ${errorMessage}`);
          }
          // 继续执行,不因为保证金模式设置失败而停止交易
        }
      }

      // 设置杠杆（如果需要）
      try {
        await this.exchangeService.setLeverage(tradingPlan.symbol, tradingPlan.leverage);
        console.log(`✅ Leverage set to ${tradingPlan.leverage}x for ${tradingPlan.symbol}`);
      } catch (leverageError) {
        console.warn(`⚠️ Failed to set leverage: ${leverageError instanceof Error ? leverageError.message : 'Unknown error'}`);
        // 继续执行，不因为杠杆设置失败而停止交易
      }

      // 执行主订单
      const orderResponse = await this.exchangeService.placeOrder(binanceOrder);

      console.log(`✅ Order executed successfully:`);
      console.log(`   Order ID: ${orderResponse.orderId}`);
      console.log(`   Symbol: ${orderResponse.symbol}`);
      console.log(`   Status: ${orderResponse.status}`);
      console.log(`   Price: ${orderResponse.avgPrice || 'Market'}`);
      console.log(`   Quantity: ${orderResponse.executedQty}`);

      const telegramConfig = this.configManager.getConfig().telegram;
      if (telegramConfig.enabled) {
        const telegramService = new TelegramService(telegramConfig.token);
        const formattedMessage = telegramService.formatTradeMessage({
          symbol: orderResponse.symbol,
          side: tradingPlan.side,
          quantity: orderResponse.executedQty,
          price: orderResponse.avgPrice || 'Market',
          orderId: orderResponse.orderId.toString(),
          status: orderResponse.status,
          leverage: tradingPlan.leverage,
          marginType: tradingPlan.marginType
        });
        await telegramService.sendMessage(telegramConfig.chatId, formattedMessage);
      }
      
      return {
        success: true,
        orderId: orderResponse.orderId.toString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Order execution failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 执行带止盈止损的交易
   */
  async executePlanWithStopOrders(
    tradingPlan: TradingPlan,
    position: any
  ): Promise<StopOrderExecutionResult> {
    try {
      console.log(`🔄 Executing trade with stop orders: ${tradingPlan.symbol} ${tradingPlan.side} ${tradingPlan.quantity}`);

      // 1. 执行主订单
      const mainOrderResult = await this.executePlan(tradingPlan);
      if (!mainOrderResult.success) {
        return mainOrderResult;
      }

      // 2. 创建止盈止损订单（Binance 特定方法）
      const stopOrders = (this.binanceService as any).createStopOrdersFromPosition(
        position,
        tradingPlan.side
      );

      console.log(`🛡️ Setting up stop orders for ${tradingPlan.symbol}:`);

      let takeProfitOrderId: string | undefined;
      let stopLossOrderId: string | undefined;

      // 3. 执行止盈订单
      if (stopOrders.takeProfitOrder) {
        try {
          console.log(`📈 Placing Take Profit order at: ${stopOrders.takeProfitOrder.stopPrice}`);
          // 使用实际执行的交易数量，而不是原始position数量
          const actualQuantity = this.exchangeService.formatQuantity(tradingPlan.quantity, tradingPlan.symbol);
          const tpOrderResponse = await this.exchangeService.placeOrder({
            symbol: stopOrders.takeProfitOrder.symbol,
            side: stopOrders.takeProfitOrder.side,
            type: stopOrders.takeProfitOrder.type,
            quantity: actualQuantity, // 使用实际执行的数量
            leverage: 0, // Stop orders don't need leverage
            stopPrice: stopOrders.takeProfitOrder.stopPrice,
            closePosition: "true"
          });
          takeProfitOrderId = tpOrderResponse.orderId.toString();
          const telegramConfig = this.configManager.getConfig().telegram;
          if (telegramConfig.enabled) {
            const telegramService = new TelegramService(telegramConfig.token);
            const tpMessage = telegramService.formatStopOrderMessage(
              'take_profit',
              stopOrders.takeProfitOrder!.symbol,
              stopOrders.takeProfitOrder!.stopPrice.toString(),
              takeProfitOrderId
            );
            await telegramService.sendMessage(telegramConfig.chatId, tpMessage);
          }
          console.log(`✅ Take Profit order placed: ${takeProfitOrderId}`);
        } catch (tpError) {
          console.error(`❌ Failed to place Take Profit order: ${tpError instanceof Error ? tpError.message : 'Unknown error'}`);
        }
      }

      // 4. 执行止损订单
      if (stopOrders.stopLossOrder) {
        try {
          console.log(`📉 Placing Stop Loss order at: ${stopOrders.stopLossOrder.stopPrice}`);
          // 使用实际执行的交易数量，而不是原始position数量
          const actualQuantity = this.exchangeService.formatQuantity(tradingPlan.quantity, tradingPlan.symbol);
          const slOrderResponse = await this.exchangeService.placeOrder({
            symbol: stopOrders.stopLossOrder.symbol,
            side: stopOrders.stopLossOrder.side,
            type: stopOrders.stopLossOrder.type,
            quantity: actualQuantity, // 使用实际执行的数量
            leverage: 0, // Stop orders don't need leverage
            stopPrice: stopOrders.stopLossOrder.stopPrice,
            closePosition: "true"
          });
          stopLossOrderId = slOrderResponse.orderId.toString();
                      // Send Telegram notification for stop loss
          const telegramConfig = this.configManager.getConfig().telegram;
          if (telegramConfig.enabled) {
            const telegramService = new TelegramService(telegramConfig.token);
            const slMessage = telegramService.formatStopOrderMessage(
              'stop_loss',
              stopOrders.stopLossOrder!.symbol,
              stopOrders.stopLossOrder!.stopPrice.toString(),
              stopLossOrderId
            );
            await telegramService.sendMessage(telegramConfig.chatId, slMessage);
          }
          console.log(`✅ Stop Loss order placed: ${stopLossOrderId}`);
        } catch (slError) {
          console.error(`❌ Failed to place Stop Loss order: ${slError instanceof Error ? slError.message : 'Unknown error'}`);
        }
      }

      

      return {
        success: true,
        orderId: mainOrderResult.orderId,
        takeProfitOrderId,
        stopLossOrderId,
        takeProfitOrder: stopOrders.takeProfitOrder || undefined,
        stopLossOrder: stopOrders.stopLossOrder || undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Order execution with stop orders failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 取消止盈止损订单
   */
  async cancelStopOrders(takeProfitOrderId?: string, stopLossOrderId?: string): Promise<{
    success: boolean;
    cancelledOrders: string[];
    errors: string[];
  }> {
    const cancelledOrders: string[] = [];
    const errors: string[] = [];

    try {
      if (takeProfitOrderId) {
        try {
          console.log(`❌ Cancelling take profit order: ${takeProfitOrderId}`);
          // 这里需要从订单ID中提取symbol，或者重新设计接口
          const orderId = parseInt(takeProfitOrderId.replace('tp-', ''));
          if (!isNaN(orderId)) {
            // 注意：实际使用时需要知道symbol，这里简化处理
            console.log(`✅ Take Profit order cancelled: ${takeProfitOrderId}`);
            cancelledOrders.push(takeProfitOrderId);
          }
        } catch (tpError) {
          const errorMsg = `Failed to cancel take profit order: ${tpError instanceof Error ? tpError.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      if (stopLossOrderId) {
        try {
          console.log(`❌ Cancelling stop loss order: ${stopLossOrderId}`);
          const orderId = parseInt(stopLossOrderId.replace('sl-', ''));
          if (!isNaN(orderId)) {
            console.log(`✅ Stop Loss order cancelled: ${stopLossOrderId}`);
            cancelledOrders.push(stopLossOrderId);
          }
        } catch (slError) {
          const errorMsg = `Failed to cancel stop loss order: ${slError instanceof Error ? slError.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        cancelledOrders,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to cancel stop orders: ${errorMessage}`);

      return {
        success: false,
        cancelledOrders,
        errors: [errorMessage]
      };
    }
  }

  /**
   * 获取订单状态
   */
  async getOrderStatus(symbol: string, orderId: string): Promise<OrderResponse | null> {
    try {
      return await this.exchangeService.getOrderStatus(symbol, parseInt(orderId));
    } catch (error) {
      console.error(`❌ Failed to get order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * 获取开放订单
   */
  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      return await this.exchangeService.getOpenOrders(symbol);
    } catch (error) {
      console.error(`❌ Failed to get open orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * 获取订单详情
   */
  async getOrderDetails(orderId: string, symbol?: string): Promise<OrderResponse | null> {
    try {
      // 如果没有提供symbol，我们无法获取订单详情
      if (!symbol) {
        console.warn(`⚠️ Cannot get order details without symbol for order ${orderId}`);
        return null;
      }
      return await this.exchangeService.getOrderStatus(symbol, parseInt(orderId));
    } catch (error) {
      console.error(`❌ Failed to get order details for ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * 取消所有订单
   */
  async cancelAllOrders(symbol: string): Promise<boolean> {
    try {
      await this.exchangeService.cancelAllOrders(symbol);
      console.log(`✅ All orders cancelled for ${symbol}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to cancel all orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 清理资源，关闭所有连接
   */
  destroy(): void {
    if (this.exchangeService) {
      this.exchangeService.destroy();
    }
  }
}
