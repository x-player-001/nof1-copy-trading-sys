import { IExchangeService, ExchangeType, ExchangeConfig } from './exchange-service.interface';
import { BinanceService } from './binance-service';
import { HyperliquidService } from './hyperliquid-service';

/**
 * 交易所工厂类
 * 根据配置创建相应的交易所服务实例
 */
export class ExchangeFactory {
  /**
   * 创建交易所服务实例
   */
  static createExchange(config: ExchangeConfig): IExchangeService {
    switch (config.type) {
      case ExchangeType.BINANCE:
        if (!config.apiKey || !config.apiSecret) {
          throw new Error('Binance requires apiKey and apiSecret');
        }
        // BinanceService 目前尚未完全实现 IExchangeService 接口
        // 使用 as any 进行类型断言以保持向后兼容
        return new BinanceService(config.apiKey, config.apiSecret, config.testnet) as any as IExchangeService;

      case ExchangeType.HYPERLIQUID:
        if (!config.privateKey) {
          throw new Error('Hyperliquid requires privateKey');
        }
        return new HyperliquidService(config.privateKey, config.testnet || false);

      default:
        throw new Error(`Unsupported exchange type: ${config.type}`);
    }
  }

  /**
   * 从环境变量创建交易所服务
   */
  static createFromEnv(): IExchangeService {
    const exchangeType = (process.env.EXCHANGE_TYPE as ExchangeType) || ExchangeType.BINANCE;

    const config: ExchangeConfig = {
      type: exchangeType,
      apiKey: process.env.BINANCE_API_KEY || '',
      apiSecret: process.env.BINANCE_API_SECRET || '',
      privateKey: process.env.HYPERLIQUID_PRIVATE_KEY || '',
      testnet: process.env.EXCHANGE_TESTNET === 'true' || process.env.BINANCE_TESTNET === 'true'
    };

    return ExchangeFactory.createExchange(config);
  }

  /**
   * 获取所有支持的交易所类型
   */
  static getSupportedExchanges(): ExchangeType[] {
    return Object.values(ExchangeType);
  }

  /**
   * 检查交易所类型是否支持
   */
  static isSupported(exchangeType: string): boolean {
    return Object.values(ExchangeType).includes(exchangeType as ExchangeType);
  }
}
