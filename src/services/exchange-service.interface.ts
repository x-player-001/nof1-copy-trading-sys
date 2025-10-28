/**
 * 交易所服务抽象接口
 * 定义所有交易所服务必须实现的标准方法
 */

export interface OrderParams {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP_MARKET" | "TAKE_PROFIT_MARKET";
  quantity: string;
  leverage?: number;  // 杠杆倍数（可选）
  price?: string;
  stopPrice?: string;
  closePosition?: string;
  timeInForce?: "GTC" | "IOC" | "FOK";  // 订单有效期（可选）
}

export interface OrderResponse {
  orderId: number | string;
  symbol: string;
  status: string;
  clientOrderId?: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  side: string;
  type: string;
  time: number;
  updateTime: number;
}

export interface PositionInfo {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  isolatedMargin: string;
  updateTime: number;
}

export interface AccountInfo {
  totalBalance: string;
  availableBalance: string;
  totalMarginBalance?: string;
  totalUnrealizedProfit?: string;
  assets?: any[];
  positions?: PositionInfo[];
  // Binance-specific fields (optional)
  totalWalletBalance?: string;
  totalInitialMargin?: string;
  totalMaintMargin?: string;
  totalPositionInitialMargin?: string;
  totalOpenOrderInitialMargin?: string;
  totalCrossWalletBalance?: string;
}

export interface TickerInfo {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface UserTrade {
  symbol: string;
  id: number;
  orderId: number | string;
  side: 'BUY' | 'SELL';
  qty: string;
  price: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  realizedPnl: string;
  time: number;
  positionSide?: string;
}

/**
 * 交易所服务接口
 * 所有交易所实现都必须遵循此接口
 */
export interface IExchangeService {
  // 交易所名称
  readonly exchangeName: string;

  // 符号转换
  convertSymbol(symbol: string): string;

  // 格式化数量和价格
  formatQuantity(quantity: number | string, symbol: string): string;
  formatPrice(price: number | string, symbol: string): string;

  // 服务器时间
  getServerTime(): Promise<number>;

  // 账户相关
  getAccountInfo(): Promise<AccountInfo>;

  // 仓位管理
  getPositions(): Promise<PositionInfo[]>;
  getAllPositions(): Promise<PositionInfo[]>;

  // 订单管理
  placeOrder(order: OrderParams): Promise<OrderResponse>;
  cancelOrder(symbol: string, orderId: number | string): Promise<OrderResponse>;
  cancelAllOrders(symbol: string): Promise<any>;
  getOrderStatus(symbol: string, orderId: number | string): Promise<OrderResponse>;
  getOpenOrders(symbol?: string): Promise<OrderResponse[]>;

  // 杠杆和保证金
  setLeverage(symbol: string, leverage: number): Promise<any>;
  setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<any>;

  // 市场数据
  get24hrTicker(symbol?: string): Promise<TickerInfo | TickerInfo[]>;

  // 交易历史
  getUserTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    fromId?: number,
    limit?: number
  ): Promise<UserTrade[]>;

  getAllUserTradesInRange(
    startTime: number,
    endTime: number,
    symbol?: string
  ): Promise<UserTrade[]>;

  // 时间同步
  syncServerTime(): Promise<void>;

  // 资源清理
  destroy(): void;
}

/**
 * 交易所类型枚举
 */
export enum ExchangeType {
  BINANCE = 'binance',
  HYPERLIQUID = 'hyperliquid'
}

/**
 * 交易所配置接口
 */
export interface ExchangeConfig {
  type: ExchangeType;
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
  privateKey?: string; // Hyperliquid 使用私钥
}
