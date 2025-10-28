# Hyperliquid 交易所集成指南

## 📋 目录

- [简介](#简介)
- [快速开始](#快速开始)
- [获取私钥](#获取私钥)
- [配置说明](#配置说明)
- [使用示例](#使用示例)
- [常见问题](#常见问题)
- [安全建议](#安全建议)

---

## 简介

Hyperliquid 是一个去中心化的永续合约交易平台,特点：

- ✅ **链上订单簿** - 完全去中心化的交易引擎
- ✅ **零 Gas 费** - L1 无需支付 Gas
- ✅ **高性能** - 毫秒级订单确认
- ✅ **高杠杆** - 支持最高 50x 杠杆
- ✅ **跨链** - 支持 Arbitrum 入金

官网: https://hyperliquid.xyz
文档: https://hyperliquid.gitbook.io/hyperliquid-docs/

---

## 快速开始

### 1. 安装依赖

项目已包含所需依赖：

```bash
npm install
```

依赖包括：
- `ethers@^5.7.2` - 以太坊钱包和签名库

### 2. 配置环境变量

编辑 `.env` 文件：

```env
# 选择交易所
EXCHANGE_TYPE=hyperliquid

# 是否使用测试网
EXCHANGE_TESTNET=true

# Hyperliquid 私钥 (64位16进制,不含0x前缀)
HYPERLIQUID_PRIVATE_KEY=your_private_key_here

# Vault 地址（可选）
HYPERLIQUID_VAULT_ADDRESS=
```

### 3. 运行测试

```bash
# 查看AI Agent列表
npm start -- agents

# 使用Hyperliquid跟单 (风险评估模式)
npm start -- follow deepseek-chat-v3.1 --risk-only

# 持续监控跟单
npm start -- follow gpt-5 --interval 30
```

---

## 获取私钥

### 选项1：从 Hyperliquid App 导出

1. 访问 [Hyperliquid App](https://app.hyperliquid.xyz/)
2. 连接你的钱包 (MetaMask/WalletConnect)
3. 导出私钥：
   - 打开 MetaMask
   - 点击账户 → 账户详情
   - 导出私钥
   - 复制64位16进制字符串（移除 `0x` 前缀）

### 选项2：创建新钱包（推荐）

**⚠️ 强烈建议为交易创建专门的钱包**

使用 Node.js 创建新钱包：

```javascript
const { ethers } = require('ethers');

// 创建新钱包
const wallet = ethers.Wallet.createRandom();

console.log('地址:', wallet.address);
console.log('私钥:', wallet.privateKey.slice(2)); // 移除0x前缀
console.log('助记词:', wallet.mnemonic.phrase);

// ⚠️ 安全提示：
// 1. 保存好助记词（用于恢复）
// 2. 私钥不要分享给任何人
// 3. 私钥存入 .env 文件，确保被 .gitignore 忽略
```

保存输出：
```
地址: 0x1234...5678
私钥: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
助记词: word1 word2 word3 ... word12
```

将私钥（不含 `0x`）填入 `.env` 的 `HYPERLIQUID_PRIVATE_KEY`。

### 选项3：从助记词恢复

```javascript
const { ethers } = require('ethers');

// 从助记词恢复
const mnemonic = 'your twelve word mnemonic phrase here';
const wallet = ethers.Wallet.fromMnemonic(mnemonic);

console.log('私钥:', wallet.privateKey.slice(2));
```

---

## 配置说明

### 环境变量详解

```env
# ============================================================================
# Hyperliquid 配置
# ============================================================================

# 交易所类型
EXCHANGE_TYPE=hyperliquid

# 测试网/正式网
# true  = 测试网 (https://app.hyperliquid-testnet.xyz/)
# false = 正式网 (https://app.hyperliquid.xyz/)
EXCHANGE_TESTNET=true

# 以太坊私钥（必须）
# 格式：64位16进制字符串，不含0x前缀
# 示例：a1b2c3d4e5f6...（64位）
HYPERLIQUID_PRIVATE_KEY=your_private_key_here

# Vault 地址（可选）
# 如果通过 Vault 交易，填入 Vault 合约地址
HYPERLIQUID_VAULT_ADDRESS=

# 通用交易配置
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0
```

### 测试网 vs 正式网

| 特性 | 测试网 | 正式网 |
|------|--------|--------|
| 网址 | https://app.hyperliquid-testnet.xyz/ | https://app.hyperliquid.xyz/ |
| 资金 | 虚拟资金 | 真实资金 |
| API | https://api.hyperliquid-testnet.xyz | https://api.hyperliquid.xyz |
| 风险 | 无风险 | 高风险 |
| 推荐 | ✅ 新手先用测试网 | ⚠️ 熟悉后再用正式网 |

### 获取测试网资金

1. 访问 [Hyperliquid 测试网](https://app.hyperliquid-testnet.xyz/)
2. 连接钱包
3. 使用水龙头领取测试 USDC

---

## 使用示例

### 示例1：基础跟单

```bash
# 使用 Hyperliquid 跟单 deepseek-chat-v3.1
npm start -- follow deepseek-chat-v3.1

# 风险评估模式（不真实交易）
npm start -- follow deepseek-chat-v3.1 --risk-only
```

### 示例2：持续监控

```bash
# 每30秒检查一次
npm start -- follow gpt-5 --interval 30

# 设置总保证金为100 USDC
npm start -- follow gpt-5 --interval 30 --total-margin 100

# 盈利目标30%自动退出
npm start -- follow gpt-5 --profit 30
```

### 示例3：查看盈利统计

```bash
# 查看总盈利
npm start -- profit

# 查看最近7天盈利
npm start -- profit --since 7d

# 查看指定交易对
npm start -- profit --pair BTCUSDT
```

### 示例4：查看系统状态

```bash
npm start -- status
```

---

## 常见问题

### Q1: Hyperliquid 与 Binance 有什么区别？

| 特性 | Hyperliquid | Binance |
|------|-------------|---------|
| 去中心化 | ✅ 链上 | ❌ 中心化 |
| Gas 费 | ✅ 零费用 | ✅ 低费用 |
| 认证方式 | 以太坊私钥签名 | API Key/Secret |
| 提现 | 即时到账 | 需要审核 |
| 杠杆 | 最高 50x | 最高 125x |
| 交易对 | 50+ | 200+ |

### Q2: 如何切换交易所？

修改 `.env` 文件：

```env
# 使用 Binance
EXCHANGE_TYPE=binance
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret

# 使用 Hyperliquid
EXCHANGE_TYPE=hyperliquid
HYPERLIQUID_PRIVATE_KEY=your_private_key
```

### Q3: 私钥泄漏怎么办？

⚠️ **立即行动**：

1. **转移资金** - 将所有资金转到新地址
2. **创建新钱包** - 生成新的私钥
3. **更新配置** - 更新 `.env` 文件
4. **检查历史** - 检查是否有未授权交易

### Q4: 支持哪些交易对？

Hyperliquid 支持主流永续合约：

- **主流币**: BTC, ETH, SOL, AVAX, BNB
- **DeFi币**: UNI, LINK, AAVE
- **Meme币**: DOGE, SHIB
- **L1/L2**: MATIC, ARB, OP

查看完整列表: https://app.hyperliquid.xyz/

### Q5: 如何设置杠杆？

Hyperliquid 的杠杆机制：

- **Cross Margin (全仓)**: 自动使用账户所有余额
- **Isolated Margin (逐仓)**: 设置具体杠杆倍数

```bash
# 系统会自动根据配置设置杠杆
npm start -- follow gpt-5
```

杠杆在 `.env` 中配置：
```env
DEFAULT_LEVERAGE=10  # 默认10x杠杆
```

### Q6: 如何入金？

#### 测试网：
1. 访问 https://app.hyperliquid-testnet.xyz/
2. 连接钱包
3. 使用水龙头领取测试 USDC

#### 正式网：
1. 访问 https://app.hyperliquid.xyz/
2. 连接钱包
3. 从 Arbitrum 跨链入金 USDC

支持的入金方式：
- Arbitrum USDC (原生)
- 从其他链跨链 (通过桥)

---

## 安全建议

### 🔐 私钥安全

1. **专用钱包**
   - ✅ 为交易创建专门的钱包
   - ❌ 不要使用主钱包
   - ✅ 只存放交易所需资金

2. **私钥管理**
   - ✅ 私钥存在 `.env` 文件中
   - ✅ 确保 `.env` 被 `.gitignore` 忽略
   - ❌ 永远不要提交私钥到 Git
   - ❌ 永远不要分享私钥给任何人

3. **备份助记词**
   - ✅ 将助记词写在纸上
   - ✅ 存放在安全的地方
   - ❌ 不要存在云端或电脑上

### 💰 资金安全

1. **分散风险**
   ```
   总资金: 10000 USDC
   └─ 主钱包: 9000 USDC (90%) - 冷钱包存储
   └─ 交易钱包: 1000 USDC (10%) - 用于自动交易
   ```

2. **止损设置**
   - ✅ 设置最大仓位: `MAX_POSITION_SIZE=1000`
   - ✅ 设置风险百分比: `RISK_PERCENTAGE=2.0`
   - ✅ 使用盈利目标: `--profit 30`

3. **定期检查**
   ```bash
   # 每天检查仓位和盈亏
   npm start -- profit --since 1d

   # 查看当前持仓
   npm start -- status
   ```

### 🚨 异常处理

1. **异常交易检测**
   - 设置 Telegram 通知
   - 定期检查交易历史
   - 监控资金变化

2. **紧急处理流程**
   ```bash
   # 1. 停止自动交易 (Ctrl+C)
   # 2. 检查当前仓位
   npm start -- status

   # 3. 如发现异常，手动平仓
   # 访问 https://app.hyperliquid.xyz/ 手动操作
   ```

### 📋 安全检查清单

在开始交易前，请确认：

- [ ] 私钥已安全保存
- [ ] 助记词已备份
- [ ] `.env` 文件不会被 git 跟踪
- [ ] 先在测试网测试
- [ ] 设置了合理的仓位限制
- [ ] 配置了 Telegram 通知（可选）
- [ ] 了解交易风险
- [ ] 只投入可承受损失的资金

---

## 📚 相关资源

### 官方资源
- [Hyperliquid 官网](https://hyperliquid.xyz/)
- [Hyperliquid App](https://app.hyperliquid.xyz/)
- [官方文档](https://hyperliquid.gitbook.io/hyperliquid-docs/)
- [API 文档](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Discord 社区](https://discord.gg/hyperliquid)

### 开发资源
- [ethers.js 文档](https://docs.ethers.org/v5/)
- [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)

---

## 🤝 贡献

如发现问题或有改进建议，请提交 Issue 或 PR。

---

## ⚠️ 免责声明

1. **投资风险**: 加密货币合约交易具有极高风险，可能导致全部资金损失
2. **仅供学习**: 本项目仅供学习和研究使用
3. **自负盈亏**: 使用本工具产生的任何损失由用户自行承担
4. **合规要求**: 请遵守所在地区的法律法规

**谨慎交易，理性投资！**
