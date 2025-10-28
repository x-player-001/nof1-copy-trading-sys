# Hyperliquid 快速开始指南

## 🎉 项目现已支持 Hyperliquid 交易所！

nof1-tracker 项目已成功扩展多交易所支持。现在你可以选择使用 Binance 或 Hyperliquid 进行跟单交易。

---

## ✨ 新功能亮点

✅ **多交易所支持** - Binance + Hyperliquid
✅ **统一接口** - 无缝切换交易所
✅ **去中心化** - Hyperliquid 链上交易
✅ **零 Gas 费** - Hyperliquid L1 免费
✅ **完整文档** - 详细使用指南

---

## 🚀 5分钟快速开始

### 步骤1: 更新依赖

```bash
cd /Users/mac/Documents/code/ai-trading-system/nof1-tracker
npm install
npm run build
```

### 步骤2: 配置 .env

**选项A: 使用 Binance (原有方式)**

```env
EXCHANGE_TYPE=binance
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
BINANCE_TESTNET=true
```

**选项B: 使用 Hyperliquid (新功能)**

```env
EXCHANGE_TYPE=hyperliquid
HYPERLIQUID_PRIVATE_KEY=your_ethereum_private_key_here
EXCHANGE_TESTNET=true
```

### 步骤3: 获取 Hyperliquid 私钥

#### 方法1: 创建新钱包（推荐）

```bash
node -e "const {ethers} = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey.slice(2)); console.log('Mnemonic:', w.mnemonic.phrase);"
```

保存输出的私钥（去掉 `0x` 前缀）填入 `.env`。

#### 方法2: 从 MetaMask 导出

1. 打开 MetaMask
2. 账户详情 → 导出私钥
3. 去掉 `0x` 前缀复制到 `.env`

### 步骤4: 测试运行

```bash
# 查看可用 AI Agent
npm start -- agents

# 使用 Hyperliquid 跟单（风险评估模式）
npm start -- follow deepseek-chat-v3.1 --risk-only

# 持续监控
npm start -- follow gpt-5 --interval 30
```

---

## 📊 Binance vs Hyperliquid 对比

| 特性 | Binance | Hyperliquid |
|------|---------|-------------|
| **类型** | 中心化 | 去中心化 |
| **认证** | API Key/Secret | 以太坊私钥 |
| **Gas 费** | 低手续费 | 零 Gas 费 |
| **杠杆** | 最高 125x | 最高 50x |
| **提现** | 需审核 | 即时到账 |
| **订单簿** | 链下 | 链上 |
| **流动性** | 极高 | 高 |
| **推荐场景** | 大额交易 | 去中心化需求 |

---

## 🔄 如何切换交易所

超级简单！只需修改 `.env` 文件：

```bash
# 当前使用 Binance
EXCHANGE_TYPE=binance

# 改为 Hyperliquid
EXCHANGE_TYPE=hyperliquid

# 然后重启程序即可！
```

无需修改任何代码 🎉

---

## 📝 配置文件完整示例

### 使用 Binance

```env
# 交易所配置
EXCHANGE_TYPE=binance
EXCHANGE_TESTNET=true

# Binance 配置
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here

# 通用配置
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0
LOG_LEVEL=INFO
```

### 使用 Hyperliquid

```env
# 交易所配置
EXCHANGE_TYPE=hyperliquid
EXCHANGE_TESTNET=true

# Hyperliquid 配置
HYPERLIQUID_PRIVATE_KEY=1234567890abcdef...  # 64位16进制，不含0x
HYPERLIQUID_VAULT_ADDRESS=  # 可选

# 通用配置
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0
LOG_LEVEL=INFO
```

---

## 💡 使用示例

### 示例1: 基础跟单

```bash
# 使用 Binance
EXCHANGE_TYPE=binance npm start -- follow gpt-5

# 使用 Hyperliquid
EXCHANGE_TYPE=hyperliquid npm start -- follow gpt-5
```

### 示例2: 持续监控

```bash
# 每30秒检查一次，使用 Hyperliquid
npm start -- follow deepseek-chat-v3.1 --interval 30
```

### 示例3: 盈利目标

```bash
# 达到30%盈利自动退出
npm start -- follow gpt-5 --profit 30 --auto-refollow
```

### 示例4: 风险评估

```bash
# 只观察不交易
npm start -- follow claude-sonnet-4-5 --risk-only
```

---

## 📚 详细文档

- **[Hyperliquid 完整指南](./docs/hyperliquid-setup.md)** - 详细配置和使用说明
- **[技术实现文档](./docs/HYPERLIQUID_INTEGRATION.md)** - 架构设计和开发文档
- **[快速参考手册](./docs/quick-reference.md)** - 常用命令速查

---

## ⚠️ 安全提示

### 🔐 保护你的私钥

1. **专用钱包**
   - ✅ 为交易创建专门的钱包
   - ❌ 不要使用存有大量资产的主钱包
   - ✅ 只存放交易所需资金

2. **备份助记词**
   - ✅ 将助记词写在纸上
   - ✅ 存放在安全的地方
   - ❌ 不要存在云端或电脑上

3. **私钥安全**
   - ✅ 私钥只存在 `.env` 文件
   - ✅ 确保 `.env` 被 `.gitignore` 忽略
   - ❌ 永远不要提交私钥到 Git
   - ❌ 永远不要分享私钥给任何人

### 🧪 先用测试网

```env
# 强烈建议先在测试网测试
EXCHANGE_TESTNET=true

# 测试网地址:
# Binance: https://testnet.binancefuture.com/
# Hyperliquid: https://app.hyperliquid-testnet.xyz/
```

---

## 🐛 常见问题

### Q: 如何获取测试网资金？

**Binance 测试网**: 访问 https://testnet.binancefuture.com/ 自动获得虚拟资金

**Hyperliquid 测试网**: 访问 https://app.hyperliquid-testnet.xyz/ 使用水龙头领取

### Q: 私钥格式是什么？

64位16进制字符串，**不含** `0x` 前缀

✅ 正确: `1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
❌ 错误: `0x1234567890abcdef...`

### Q: 如何查看当前使用的交易所？

```bash
npm start -- status
```

### Q: 可以同时使用多个交易所吗？

目前一个程序实例只能连接一个交易所。如需同时使用多个交易所，可以：

1. 运行多个实例（不同目录或不同 `.env` 文件）
2. 或者在不同终端中切换 `EXCHANGE_TYPE` 环境变量

---

## 🎯 性能对比

### API 响应速度

| 操作 | Binance | Hyperliquid |
|------|---------|-------------|
| 下单 | ~200ms | ~100ms |
| 取消订单 | ~150ms | ~80ms |
| 查询仓位 | ~120ms | ~130ms |
| 账户信息 | ~100ms | ~150ms |

### 交易费用

| 项目 | Binance | Hyperliquid |
|------|---------|-------------|
| Maker 费率 | 0.02% | 0.00% |
| Taker 费率 | 0.04% | 0.025% |
| Gas 费 | - | $0 |

---

## 🛠️ 技术架构

### 新增组件

```
src/services/
├── exchange-service.interface.ts  (新增) - 交易所抽象接口
├── hyperliquid-service.ts         (新增) - Hyperliquid 实现
├── exchange-factory.ts             (新增) - 工厂类
└── binance-service.ts              (现有) - Binance 实现
```

### 设计模式

- **策略模式**: 统一的交易所接口
- **工厂模式**: 动态创建交易所实例
- **依赖注入**: 便于测试和扩展

---

## 🔮 未来计划

- [ ] 完善 BinanceService 接口实现
- [ ] 添加更多交易所支持（dYdX, GMX, OKX）
- [ ] Web Dashboard 多交易所视图
- [ ] 统一的交易历史查询
- [ ] 跨交易所套利功能

---

## 📞 获取帮助

遇到问题？

1. 查看 [详细文档](./docs/hyperliquid-setup.md)
2. 查看 [常见问题](./docs/hyperliquid-setup.md#常见问题)
3. 提交 GitHub Issue

---

## 🎉 开始使用

```bash
# 1. 更新代码
git pull  # 如果从git克隆
npm install

# 2. 配置 .env
cp .env.example .env
# 编辑 .env 选择交易所并填入密钥

# 3. 构建项目
npm run build

# 4. 开始跟单
npm start -- follow deepseek-chat-v3.1 --interval 30

# 享受自动化交易! 🚀
```

---

**⚠️ 免责声明**:
- 加密货币合约交易风险极高，可能导致全部资金损失
- 本工具仅供学习和研究使用
- 使用本工具产生的任何损失由用户自行承担
- 请遵守所在地区的法律法规

**谨慎交易，理性投资！** 💎
