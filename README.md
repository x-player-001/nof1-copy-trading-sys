# Nof1 AI Agent Copy Trading System

![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

A command-line tool for tracking [nof1.ai](https://nof1.ai) AI Agent trading signals and automatically executing futures trades. Support **Binance** and **Hyperliquid** with real-time copy trading from 7 AI quantitative agents.

## ⚡ Quick Start

### Option 1: Binance (Centralized Exchange)

```bash
# 1. Install and build
npm install && npm run build

# 2. Configure Binance API
cp .env.example .env
nano .env  # Add your Binance API keys

# Set in .env:
EXCHANGE_TYPE=binance
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
BINANCE_TESTNET=true  # Use testnet for testing

# 3. Start copy trading
npm start -- follow deepseek-chat-v3.1 --total-margin 100 --interval 30
```

### Option 2: Hyperliquid (Decentralized Exchange)

```bash
# 1. Install and build
npm install && npm run build

# 2. Configure Hyperliquid wallet
cp .env.example .env
nano .env  # Add your Ethereum private key

# Set in .env:
EXCHANGE_TYPE=hyperliquid
HYPERLIQUID_PRIVATE_KEY=your_ethereum_private_key
EXCHANGE_TESTNET=true  # Use testnet for testing

# 3. Get testnet funds (requires mainnet deposit first)
# Visit: https://app.hyperliquid-testnet.xyz/drip

# 4. Start copy trading
npm start -- follow deepseek-chat-v3.1 --total-margin 100 --interval 30
```

## 🚀 Features

- **🔄 Multi-Exchange Support**: Binance and Hyperliquid (more coming soon)
- **🤖 7 AI Agents**: GPT-5, Gemini, DeepSeek, Claude, Grok, Qwen, and more
- **📊 Real-time Monitoring**: Configurable polling interval
- **🎯 Smart Copy Trading**: Auto-detect open/close/switch positions
- **💰 Profit Target**: Auto close at custom profit percentage
- **⚡ Leverage Trading**: 1x-125x leverage support
- **🛡️ Risk Control**: `--risk-only` mode for observation
- **📱 Telegram Alerts**: Real-time trade notifications

## 🤖 Supported AI Agents

| Agent | Description |
|-------|-------------|
| `gpt-5` | OpenAI GPT-5 trading agent |
| `gemini-2.5-pro` | Google Gemini Pro agent |
| `deepseek-chat-v3.1` | DeepSeek V3.1 agent |
| `claude-sonnet-4-5` | Anthropic Claude agent |
| `grok-4` | xAI Grok agent |
| `qwen3-max` | Alibaba Qwen agent |
| `buynhold_btc` | Bitcoin buy & hold strategy |

## ⚙️ Configuration

### Environment Variables

```env
# Exchange Selection
EXCHANGE_TYPE=hyperliquid  # or 'binance'
EXCHANGE_TESTNET=true      # true=testnet, false=mainnet

# Binance Configuration
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret

# Hyperliquid Configuration
HYPERLIQUID_PRIVATE_KEY=your_ethereum_private_key
# HYPERLIQUID_VAULT_ADDRESS=0x...  # Optional, for vault trading

# Trading Parameters
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0

# Telegram Notifications (Optional)
TELEGRAM_ENABLED=false
TELEGRAM_API_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Binance Setup

1. **Create API Key**: [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. **Enable Permissions**:
   - ✅ Enable Futures
   - ✅ Enable Reading
   - ❌ No withdrawals needed
3. **Testnet** (Recommended): [testnet.binancefuture.com](https://testnet.binancefuture.com/)

### Hyperliquid Setup

1. **Prepare Wallet**:
   ```bash
   # Generate new wallet (or use existing)
   node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey);"
   ```

2. **Testnet Setup**:
   - Visit [Hyperliquid Mainnet](https://app.hyperliquid.xyz/) and make a deposit
   - Then claim testnet tokens at [testnet faucet](https://app.hyperliquid-testnet.xyz/drip)

3. **Mainnet Setup**:
   - Deposit USDC to your wallet on Arbitrum
   - Bridge to Hyperliquid via the web app

## 📖 Usage

### Core Commands

```bash
# View available AI agents
npm start -- agents

# Copy trade with risk assessment only (no execution)
npm start -- follow deepseek-chat-v3.1 --risk-only

# Continuous monitoring (every 30 seconds)
npm start -- follow gpt-5 --interval 30

# Set total margin
npm start -- follow deepseek-chat-v3.1 --total-margin 100

# Auto exit at 30% profit
npm start -- follow gpt-5 --profit 30

# Full configuration
npm start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \
  --interval 30 \
  --profit 30 \
  --price-tolerance 5

# View profit statistics
npm start -- profit
npm start -- profit --since 7d
npm start -- profit --pair BTCUSDT

# Check system status
npm start -- status
```

### Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--risk-only` | Observe only, no execution | false |
| `--interval <seconds>` | Polling interval | 30 |
| `--total-margin <amount>` | Total margin in USDT | 10 |
| `--profit <percentage>` | Auto exit profit target | - |
| `--price-tolerance <percent>` | Price deviation tolerance | 1.0 |
| `--auto-refollow` | Re-enter after profit exit | false |

## 🔄 Trading Signals

The system automatically detects:

1. **📈 New Position** - Copy when agent opens new position
2. **📉 Close Position** - Copy when agent closes position
3. **🔄 Switch Position** - Close old and open new (OID change)
4. **🎯 Stop Loss/Take Profit** - Auto exit at target prices

## 🌐 Server Deployment

For 24/7 operation, deploy to a server:

```bash
# Install PM2
npm install -g pm2

# Start service
pm2 start npm --name "nof1-trader" -- start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \
  --interval 30 \
  --profit 30

# Save and auto-restart on reboot
pm2 save
pm2 startup

# Monitor
pm2 logs nof1-trader
pm2 monit
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete server setup instructions.

## 📊 Architecture

```
User Command
    ↓
Follow Handler
    ↓
ApiAnalyzer (fetch nof1.ai signals)
    ↓
ExchangeFactory (Binance/Hyperliquid)
    ↓
TradingExecutor
    ↓
Exchange API → Order Executed
    ↓
Telegram Notification (optional)
```

**Key Components**:
- `ExchangeFactory`: Multi-exchange abstraction
- `HyperliquidService`: Hyperliquid DEX integration with EIP-712 signing
- `BinanceService`: Binance Futures API integration
- `FollowService`: Copy trading logic and position management
- `TradingExecutor`: Order execution engine

## ⚠️ Risk Warning

- **Futures trading is high-risk** and can lead to rapid losses
- **Test first**: Always use testnet before mainnet
- **Start small**: Begin with minimal capital
- **No guarantees**: AI agents do not guarantee profits
- **Own risk**: You are responsible for all trading decisions

## 🔒 Security

- ✅ Never commit `.env` file (already in `.gitignore`)
- ✅ Use API keys with minimal required permissions
- ✅ Set IP whitelist for Binance API
- ✅ Use dedicated wallets for Hyperliquid
- ✅ Regularly rotate credentials

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete server setup
- [Hyperliquid Integration](docs/HYPERLIQUID_INTEGRATION.md) - Technical details
- [Hyperliquid Setup](docs/hyperliquid-setup.md) - User guide
- [Quick Start](HYPERLIQUID_QUICKSTART.md) - 5-minute guide

## 🔧 Development

```bash
npm test          # Run tests
npm run build     # Build TypeScript
npm run dev       # Development mode
npm run lint      # Code linting
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**⚠️ Disclaimer**: This tool is for educational purposes only. Trading involves substantial risk of loss. Use at your own risk and comply with all applicable laws and regulations.
