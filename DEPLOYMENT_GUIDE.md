# Hyperliquid 服务器部署指南

## 📋 部署步骤

### 1. 服务器环境要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Node.js**: v18.0.0 或更高
- **内存**: 至少 512MB
- **磁盘**: 至少 1GB 可用空间
- **网络**: 稳定的互联网连接

### 2. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应显示 v18.x.x 或更高
npm --version
```

### 3. 部署项目

```bash
# 创建项目目录
sudo mkdir -p /opt/nof1-tracker
cd /opt/nof1-tracker

# 上传项目文件（使用 git 或 scp）
# 方式 1: Git
git clone <your-repo-url> .

# 方式 2: SCP（从本地上传）
# scp -r ./nof1-tracker/* user@server:/opt/nof1-tracker/

# 安装依赖
npm install

# 编译 TypeScript
npm run build
```

### 4. 配置环境变量

创建 `.env` 文件：

```bash
nano /opt/nof1-tracker/.env
```

填入以下配置：

```env
# Nof1 API
NOF1_API_BASE_URL=https://nof1.ai/api

# Hyperliquid 配置
EXCHANGE_TYPE=hyperliquid
HYPERLIQUID_PRIVATE_KEY=你的以太坊钱包私钥
EXCHANGE_TESTNET=false  # true=测试网, false=主网

# 交易配置
MAX_POSITION_SIZE=1000
DEFAULT_LEVERAGE=10
RISK_PERCENTAGE=2.0

# 日志级别
LOG_LEVEL=INFO

# Telegram 通知（可选）
TELEGRAM_ENABLED=false
TELEGRAM_API_TOKEN=
TELEGRAM_CHAT_ID=
```

**⚠️ 重要安全提示**：
```bash
# 设置文件权限，防止私钥泄露
chmod 600 /opt/nof1-tracker/.env
```

### 5. 后台运行方式

#### 方式 1: PM2（推荐 ⭐）

PM2 是生产环境最推荐的方式，支持自动重启、日志管理、集群模式。

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "nof1-hyperliquid" -- start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \
  --interval 30 \
  --profit 30

# 查看状态
pm2 status
pm2 logs nof1-hyperliquid

# 保存配置（开机自启动）
pm2 save
pm2 startup  # 按提示执行命令

# 常用管理命令
pm2 stop nof1-hyperliquid      # 停止
pm2 restart nof1-hyperliquid   # 重启
pm2 delete nof1-hyperliquid    # 删除
pm2 monit                      # 监控
```

**使用配置文件（推荐）**：

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'nof1-hyperliquid',
    script: 'npm',
    args: 'start -- follow deepseek-chat-v3.1 --total-margin 100 --interval 30 --profit 30',
    cwd: '/opt/nof1-tracker',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/nof1/error.log',
    out_file: '/var/log/nof1/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

启动：
```bash
pm2 start ecosystem.config.js
```

#### 方式 2: Systemd

创建 systemd 服务：

```bash
sudo nano /etc/systemd/system/nof1-hyperliquid.service
```

内容：

```ini
[Unit]
Description=Nof1 Hyperliquid Trading Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nof1-tracker
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start -- follow deepseek-chat-v3.1 --total-margin 100 --interval 30 --profit 30
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nof1/out.log
StandardError=append:/var/log/nof1/error.log

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
# 创建日志目录
sudo mkdir -p /var/log/nof1

# 重载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start nof1-hyperliquid

# 开机自启动
sudo systemctl enable nof1-hyperliquid

# 查看状态
sudo systemctl status nof1-hyperliquid

# 查看日志
sudo journalctl -u nof1-hyperliquid -f
```

#### 方式 3: Screen（简单快速）

```bash
# 安装 screen
sudo apt-get install screen  # Ubuntu/Debian
sudo yum install screen      # CentOS

# 创建新会话
screen -S nof1-trader

# 在 screen 中启动
cd /opt/nof1-tracker
npm start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \
  --interval 30 \
  --profit 30

# 按 Ctrl+A 然后按 D 离开会话（程序继续运行）

# 重新连接
screen -r nof1-trader

# 查看所有会话
screen -ls

# 终止会话
screen -X -S nof1-trader quit
```

#### 方式 4: Nohup（最简单）

```bash
cd /opt/nof1-tracker

nohup npm start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \
  --interval 30 \
  --profit 30 \
  > /var/log/nof1/output.log 2>&1 &

# 查看进程
ps aux | grep "node dist/index.js"

# 查看日志
tail -f /var/log/nof1/output.log

# 停止（需要找到进程 PID）
ps aux | grep "node dist/index.js" | grep -v grep | awk '{print $2}' | xargs kill
```

### 6. 常用运行命令

#### 基础监控（测试网）

```bash
npm start -- follow deepseek-chat-v3.1 \
  --total-margin 50 \
  --interval 30 \
  --risk-only  # 只观察不交易
```

#### 正式跟随（主网）

```bash
npm start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \        # 使用 100 USDT 总保证金
  --interval 30 \             # 每 30 秒检查一次
  --profit 30 \               # 盈利 30% 自动止盈
  --price-tolerance 5         # 允许 5% 价格偏离
```

#### 激进跟随（高风险）

```bash
npm start -- follow deepseek-chat-v3.1 \
  --total-margin 500 \
  --interval 20 \
  --profit 50 \
  --price-tolerance 10
```

### 7. 日志管理

#### 创建日志目录

```bash
sudo mkdir -p /var/log/nof1
sudo chmod 755 /var/log/nof1
```

#### 日志轮转（防止日志文件过大）

创建 logrotate 配置：

```bash
sudo nano /etc/logrotate.d/nof1
```

内容：

```
/var/log/nof1/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

### 8. 监控和告警

#### 检查程序状态

```bash
# 使用 PM2
pm2 status
pm2 logs nof1-hyperliquid --lines 100

# 使用 systemd
sudo systemctl status nof1-hyperliquid
sudo journalctl -u nof1-hyperliquid -n 100 -f

# 手动检查进程
ps aux | grep "node dist/index.js"
```

#### 设置 Telegram 通知

编辑 `.env`：

```env
TELEGRAM_ENABLED=true
TELEGRAM_API_TOKEN=你的Bot Token
TELEGRAM_CHAT_ID=你的Chat ID
```

获取 Telegram Bot Token:
1. 在 Telegram 搜索 @BotFather
2. 发送 `/newbot` 创建 bot
3. 获取 API Token

获取 Chat ID:
1. 向你的 bot 发送一条消息
2. 访问：`https://api.telegram.org/bot<YourBOTToken>/getUpdates`
3. 查找 `"chat":{"id":123456789}`

### 9. 安全加固

```bash
# 1. 限制文件权限
chmod 600 /opt/nof1-tracker/.env
chmod 700 /opt/nof1-tracker

# 2. 使用专用用户（不使用 root）
sudo useradd -r -s /bin/bash nof1trader
sudo chown -R nof1trader:nof1trader /opt/nof1-tracker
sudo mkdir -p /var/log/nof1
sudo chown nof1trader:nof1trader /var/log/nof1

# 3. 配置防火墙（如果需要）
sudo ufw allow ssh
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 4. 定期备份 order-history.json
sudo crontab -e
# 添加每天备份任务
0 2 * * * cp /opt/nof1-tracker/order-history.json /backup/order-history-$(date +\%Y\%m\%d).json
```

### 10. 故障排查

#### 程序无法启动

```bash
# 检查 Node.js 版本
node --version  # 需要 >= 18

# 检查依赖安装
cd /opt/nof1-tracker
npm install
npm run build

# 检查环境变量
cat .env

# 检查日志
pm2 logs nof1-hyperliquid --lines 100
```

#### API 连接失败

```bash
# 测试网络连接
curl https://nof1.ai/api/account-totals
curl https://api.hyperliquid.xyz/info

# 检查 DNS
nslookup nof1.ai
nslookup api.hyperliquid.xyz
```

#### 私钥错误

```bash
# 验证私钥格式（应该是 64 位十六进制）
echo $HYPERLIQUID_PRIVATE_KEY | wc -c  # 应该是 65 或 67（包含 0x）

# 测试钱包地址
node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet('你的私钥'); console.log('Address:', wallet.address);"
```

### 11. 性能优化

```bash
# 监控内存使用
free -h
pm2 monit

# 如果内存不足，限制 Node.js 内存
node --max-old-space-size=256 dist/index.js follow deepseek-chat-v3.1 ...
```

### 12. 更新部署

```bash
# 停止服务
pm2 stop nof1-hyperliquid

# 拉取最新代码
cd /opt/nof1-tracker
git pull

# 重新安装依赖（如果 package.json 有变化）
npm install

# 重新编译
npm run build

# 重启服务
pm2 restart nof1-hyperliquid
```

---

## 🎯 快速启动模板

### 测试网（推荐新手）

```bash
# 1. 配置 .env
EXCHANGE_TYPE=hyperliquid
HYPERLIQUID_PRIVATE_KEY=your_key
EXCHANGE_TESTNET=true

# 2. 启动观察模式
pm2 start npm --name "nof1-test" -- start -- follow deepseek-chat-v3.1 \
  --total-margin 20 \
  --interval 30 \
  --risk-only
```

### 主网（生产环境）

```bash
# 1. 配置 .env
EXCHANGE_TYPE=hyperliquid
HYPERLIQUID_PRIVATE_KEY=your_key
EXCHANGE_TESTNET=false
TELEGRAM_ENABLED=true

# 2. 启动正式交易
pm2 start npm --name "nof1-prod" -- start -- follow deepseek-chat-v3.1 \
  --total-margin 100 \
  --interval 30 \
  --profit 30 \
  --price-tolerance 5
```

---

## 📞 紧急处理

### 立即停止所有交易

```bash
# 方式 1: PM2
pm2 stop all

# 方式 2: Systemd
sudo systemctl stop nof1-hyperliquid

# 方式 3: 强制杀死进程
pkill -9 -f "node dist/index.js"
```

### 紧急平仓（手动到交易所操作）

1. 访问 https://app.hyperliquid.xyz/
2. 连接钱包
3. 在 Positions 页面手动平仓

---

## ✅ 部署检查清单

- [ ] Node.js 18+ 已安装
- [ ] 项目依赖已安装（`npm install`）
- [ ] TypeScript 已编译（`npm run build`）
- [ ] `.env` 文件已配置
- [ ] 私钥权限已设置（`chmod 600 .env`）
- [ ] 测试网测试成功
- [ ] PM2/Systemd 已配置
- [ ] 日志目录已创建
- [ ] Telegram 通知已配置（可选）
- [ ] 开机自启动已设置
- [ ] 备份策略已实施

完成以上步骤后，你的 Hyperliquid 跟随系统就可以 7×24 稳定运行了！
