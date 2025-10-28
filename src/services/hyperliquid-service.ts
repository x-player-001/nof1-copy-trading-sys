import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import {
  IExchangeService,
  OrderParams,
  OrderResponse,
  PositionInfo,
  AccountInfo,
  TickerInfo,
  UserTrade
} from './exchange-service.interface';

/**
 * Hyperliquid 交易所服务实现
 * 官方文档: https://hyperliquid.gitbook.io/hyperliquid-docs/
 */
export class HyperliquidService implements IExchangeService {
  public readonly exchangeName = 'Hyperliquid';

  private wallet: ethers.Wallet;
  private baseUrl: string;
  private client: AxiosInstance;
  private vaultAddress?: string;

  constructor(privateKey: string, testnet: boolean = false, vaultAddress?: string) {
    // 初始化以太坊钱包
    this.wallet = new ethers.Wallet(privateKey);

    // 设置 API 端点
    this.baseUrl = testnet
      ? 'https://api.hyperliquid-testnet.xyz'
      : 'https://api.hyperliquid.xyz';

    this.vaultAddress = vaultAddress;

    // 创建 HTTP 客户端
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`🔗 Hyperliquid initialized: ${this.wallet.address}`);
  }

  /**
   * 转换符号格式
   * nof1: BTC -> Hyperliquid: BTC-USD (perp)
   */
  public convertSymbol(symbol: string): string {
    // Hyperliquid 使用格式如 "BTC"（永续合约默认）
    if (symbol.endsWith('-USD') || symbol.endsWith('USDT')) {
      return symbol.replace('USDT', '').replace('-USD', '');
    }
    return symbol;
  }

  /**
   * 格式化数量精度
   */
  public formatQuantity(quantity: number | string, symbol: string): string {
    const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    // Hyperliquid 的精度要求
    const precisionMap: Record<string, number> = {
      'BTC': 4,
      'ETH': 3,
      'SOL': 2,
      'AVAX': 2,
      'BNB': 2,
      'MATIC': 0,
      'DOGE': 0,
      'XRP': 0,
    };

    const baseSymbol = this.convertSymbol(symbol);
    const precision = precisionMap[baseSymbol] || 3;

    return quantityNum.toFixed(precision);
  }

  /**
   * 格式化价格精度
   */
  public formatPrice(price: number | string, symbol: string): string {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;

    // Hyperliquid 价格精度
    const pricePrecisionMap: Record<string, number> = {
      'BTC': 1,    // $50,000.0
      'ETH': 2,    // $3,000.00
      'SOL': 3,    // $100.000
      'AVAX': 3,
      'BNB': 2,
      'MATIC': 4,
      'DOGE': 5,
      'XRP': 4,
    };

    const baseSymbol = this.convertSymbol(symbol);
    const precision = pricePrecisionMap[baseSymbol] || 2;

    return priceNum.toFixed(precision);
  }

  /**
   * 获取服务器时间
   */
  async getServerTime(): Promise<number> {
    return Date.now();
  }

  /**
   * 生成签名
   */
  private async signAction(action: any, nonce: number): Promise<{ r: string; s: string; v: number }> {
    const timestamp = Date.now();

    // 构建签名数据
    const domain = {
      name: 'Hyperliquid',
      version: '1',
      chainId: 1337, // Hyperliquid 链 ID
      verifyingContract: '0x0000000000000000000000000000000000000000'
    };

    const types = {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' }
      ]
    };

    const value = {
      source: 'a',
      connectionId: ethers.utils.hexZeroPad('0x' + timestamp.toString(16), 32)
    };

    // 使用 ethers.js v5 的签名方法
    const signature = await this.wallet._signTypedData(domain, types, value);
    const sig = ethers.utils.splitSignature(signature);

    return {
      r: sig.r,
      s: sig.s,
      v: sig.v
    };
  }

  /**
   * 发送 POST 请求到 Hyperliquid
   */
  private async post(endpoint: string, data: any): Promise<any> {
    const nonce = Date.now();

    // 为代理操作添加签名
    const payload = {
      action: data,
      nonce,
      signature: await this.signAction(data, nonce),
      vaultAddress: this.vaultAddress
    };

    const response = await this.client.post(endpoint, payload);
    return response.data;
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response = await this.client.post('/info', {
        type: 'clearinghouseState',
        user: this.wallet.address
      });

      const data = response.data;

      return {
        totalBalance: data.marginSummary.accountValue || '0',
        availableBalance: data.withdrawable || '0',
        totalMarginBalance: data.marginSummary.totalMarginUsed || '0',
        totalUnrealizedProfit: data.marginSummary.totalNtlPos || '0'
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取当前仓位
   */
  async getPositions(): Promise<PositionInfo[]> {
    try {
      const response = await this.client.post('/info', {
        type: 'clearinghouseState',
        user: this.wallet.address
      });

      const positions = response.data.assetPositions || [];

      return positions
        .filter((pos: any) => parseFloat(pos.position.szi) !== 0)
        .map((pos: any) => ({
          symbol: pos.position.coin,
          positionAmt: pos.position.szi,
          entryPrice: pos.position.entryPx || '0',
          markPrice: pos.position.positionValue || '0',
          unRealizedProfit: pos.position.unrealizedPnl || '0',
          liquidationPrice: pos.position.liquidationPx || '0',
          leverage: pos.position.leverage?.value || '1',
          marginType: pos.position.marginUsed ? 'ISOLATED' : 'CROSSED',
          isolatedMargin: pos.position.marginUsed || '0',
          updateTime: Date.now()
        }));
    } catch (error) {
      throw new Error(`Failed to get positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取所有仓位（包括零仓位）
   */
  async getAllPositions(): Promise<PositionInfo[]> {
    return this.getPositions();
  }

  /**
   * 下单
   */
  async placeOrder(order: OrderParams): Promise<OrderResponse> {
    try {
      const action = {
        type: 'order',
        orders: [{
          a: this.convertSymbol(order.symbol), // asset
          b: order.side === 'BUY',              // is buy
          p: order.price || '0',                 // price (0 for market)
          s: this.formatQuantity(order.quantity, order.symbol), // size
          r: order.type === 'MARKET',            // reduce only
          t: {
            limit: order.type === 'LIMIT' ? { tif: 'Gtc' } : undefined,
            trigger: order.stopPrice ? {
              triggerPx: order.stopPrice,
              isMarket: true,
              tpsl: order.type === 'TAKE_PROFIT_MARKET' ? 'tp' : 'sl'
            } : undefined
          }
        }],
        grouping: 'na'
      };

      const response = await this.post('/exchange', action);

      if (response.status === 'ok') {
        const data = response.response?.data;
        return {
          orderId: data?.statuses?.[0]?.resting?.oid || Date.now(),
          symbol: order.symbol,
          status: 'FILLED',
          price: order.price || '0',
          avgPrice: data?.statuses?.[0]?.filled?.avgPx || '0',
          origQty: order.quantity,
          executedQty: order.quantity,
          side: order.side,
          type: order.type,
          time: Date.now(),
          updateTime: Date.now()
        };
      }

      throw new Error(`Order failed: ${response.status}`);
    } catch (error) {
      throw new Error(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(symbol: string, orderId: number | string): Promise<OrderResponse> {
    try {
      const action = {
        type: 'cancel',
        cancels: [{
          a: this.convertSymbol(symbol),
          o: orderId
        }]
      };

      const response = await this.post('/exchange', action);

      return {
        orderId,
        symbol,
        status: response.status === 'ok' ? 'CANCELED' : 'FAILED',
        price: '0',
        avgPrice: '0',
        origQty: '0',
        executedQty: '0',
        side: 'BUY',
        type: 'LIMIT',
        time: Date.now(),
        updateTime: Date.now()
      };
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取消所有订单
   */
  async cancelAllOrders(symbol: string): Promise<any> {
    try {
      const openOrders = await this.getOpenOrders(symbol);
      const promises = openOrders.map(order => this.cancelOrder(symbol, order.orderId));
      return await Promise.all(promises);
    } catch (error) {
      throw new Error(`Failed to cancel all orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取订单状态
   */
  async getOrderStatus(symbol: string, orderId: number | string): Promise<OrderResponse> {
    // Hyperliquid 通过 openOrders 查询
    const orders = await this.getOpenOrders(symbol);
    const order = orders.find(o => o.orderId === orderId);

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * 获取未成交订单
   */
  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const response = await this.client.post('/info', {
        type: 'openOrders',
        user: this.wallet.address
      });

      const orders = response.data || [];

      return orders
        .filter((order: any) => !symbol || order.coin === this.convertSymbol(symbol))
        .map((order: any) => ({
          orderId: order.oid,
          symbol: order.coin,
          status: 'NEW',
          price: order.limitPx,
          avgPrice: '0',
          origQty: order.sz,
          executedQty: order.szDecimals ? '0' : order.sz,
          side: order.side === 'B' ? 'BUY' : 'SELL',
          type: order.orderType,
          time: order.timestamp,
          updateTime: order.timestamp
        }));
    } catch (error) {
      throw new Error(`Failed to get open orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 设置杠杆
   */
  async setLeverage(symbol: string, leverage: number): Promise<any> {
    try {
      const action = {
        type: 'updateLeverage',
        asset: this.convertSymbol(symbol),
        isCross: leverage === 1,
        leverage
      };

      return await this.post('/exchange', action);
    } catch (error) {
      throw new Error(`Failed to set leverage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 设置保证金模式
   */
  async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED'): Promise<any> {
    // Hyperliquid 通过 leverage 设置自动处理
    // Cross: leverage = 1
    // Isolated: leverage > 1
    console.log(`⚠️ Hyperliquid margin type is managed through leverage setting`);
    return { success: true, marginType };
  }

  /**
   * 获取24小时行情
   */
  async get24hrTicker(symbol?: string): Promise<TickerInfo | TickerInfo[]> {
    try {
      const response = await this.client.post('/info', {
        type: 'metaAndAssetCtxs'
      });

      const tickers = response.data[1] || [];

      const formatted = tickers.map((ticker: any) => ({
        symbol: ticker.coin,
        lastPrice: ticker.markPx,
        priceChange: '0', // Hyperliquid 不直接提供
        priceChangePercent: '0',
        highPrice: '0',
        lowPrice: '0',
        volume: ticker.dayNtlVlm || '0',
        quoteVolume: '0'
      }));

      if (symbol) {
        const result = formatted.find((t: TickerInfo) => t.symbol === this.convertSymbol(symbol));
        return result || formatted[0];
      }

      return formatted;
    } catch (error) {
      throw new Error(`Failed to get ticker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取用户成交记录
   */
  async getUserTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    fromId?: number,
    limit: number = 100
  ): Promise<UserTrade[]> {
    try {
      const response = await this.client.post('/info', {
        type: 'userFills',
        user: this.wallet.address
      });

      let fills = response.data || [];

      // 过滤
      if (symbol) {
        fills = fills.filter((fill: any) => fill.coin === this.convertSymbol(symbol));
      }
      if (startTime) {
        fills = fills.filter((fill: any) => fill.time >= startTime);
      }
      if (endTime) {
        fills = fills.filter((fill: any) => fill.time <= endTime);
      }

      // 限制数量
      fills = fills.slice(0, limit);

      return fills.map((fill: any, index: number) => ({
        symbol: fill.coin,
        id: index,
        orderId: fill.oid,
        side: fill.side === 'B' ? 'BUY' : 'SELL',
        qty: fill.sz,
        price: fill.px,
        quoteQty: (parseFloat(fill.sz) * parseFloat(fill.px)).toString(),
        commission: fill.fee || '0',
        commissionAsset: 'USDC',
        realizedPnl: fill.closedPnl || '0',
        time: fill.time,
        positionSide: fill.side
      }));
    } catch (error) {
      throw new Error(`Failed to get user trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取时间范围内的所有成交记录
   */
  async getAllUserTradesInRange(
    startTime: number,
    endTime: number,
    symbol?: string
  ): Promise<UserTrade[]> {
    return this.getUserTrades(symbol, startTime, endTime, undefined, 1000);
  }

  /**
   * 同步服务器时间
   */
  async syncServerTime(): Promise<void> {
    // Hyperliquid 使用本地时间戳，不需要同步
    console.log('⏰ Hyperliquid uses local time - no sync needed');
  }

  /**
   * 清理资源
   */
  destroy(): void {
    console.log('🧹 Hyperliquid service destroyed');
  }
}
