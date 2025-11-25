# POSL AWS EC2 デプロイガイド V1.2

**作成日**: 2025年11月19日  
**対象**: インフラ担当者・システム管理者・DevOps エンジニア  
**バージョン**: V1.2  
**ステータス**: 本番稼働中（実績あり）

## 🎯 概要

このドキュメントでは、POSL（Personal Opinion Sharing with LLM）システムをAWS EC2環境にデプロイする方法を詳しく説明します。本ガイドは実際に本番環境で稼働中の構成に基づいています。

## 🏗️ システム構成

### アーキテクチャ図
```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Cloud (ap-northeast-1)              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐ │
│  │   EC2 Instance  │  │         RDS MySQL 8.0              │ │
│  │  Ubuntu 22.04   │  │  posl-production.cxiucq08iku4...   │ │
│  │ t3.small        │──┼─│ db.t3.micro                      │ │
│  │ Port: 22,80,3001│  │ │ Port: 3306                       │ │
│  └─────────────────┘  │ └─────────────────────────────────────┘ │
│           │            │                                       │
│  ┌─────────────────┐   │  ┌─────────────────────────────────────┐ │
│  │ Security Group  │   │  │         VPC & Subnet                │ │
│  │ POSL-SG        │   │  │ Default VPC                         │ │
│  └─────────────────┘   │  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                 │
        ┌────────▼────────┐
        │ External APIs   │
        │ - OpenAI GPT-4  │
        │ - X (Twitter)   │
        └─────────────────┘
```

### 技術スタック
- **OS**: Ubuntu 22.04 LTS
- **Runtime**: Node.js 18.x
- **Database**: MySQL 8.0 (RDS)
- **Web Server**: Nginx (Reverse Proxy)
- **Process Manager**: PM2
- **SSL**: Let's Encrypt (Certbot)
- **Monitoring**: CloudWatch

## 🚀 クイックデプロイ（30分）

### 前提条件チェック
```bash
# AWS CLIの確認
aws --version

# SSHキーペアの確認
ls ~/.ssh/posl-production-key.pem

# 必要な権限
echo "EC2, RDS, VPC, Security Groups の管理権限が必要"
```

### 1分で理解する全体フロー
1. **EC2インスタンス起動** (5分)
2. **セキュリティグループ設定** (3分) 
3. **RDS作成** (10分)
4. **アプリケーションデプロイ** (10分)
5. **動作確認** (2分)

## 🖥️ EC2インスタンス構築

### インスタンス仕様（本番環境）
```yaml
Instance Type: t3.small
OS: Ubuntu 22.04 LTS
Storage: 20GB GP3
Network: Default VPC
Public IP: 有効
Key Pair: posl-production-key
Security Group: POSL-SG
Region: ap-northeast-1 (東京)
```

### EC2起動手順

#### 1. AWS管理コンソールでインスタンス作成
```bash
# AWS CLIでの起動例
aws ec2 run-instances \
  --image-id ami-0d52744d6551d851e \
  --count 1 \
  --instance-type t3.small \
  --key-name posl-production-key \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-12345678 \
  --associate-public-ip-address \
  --block-device-mappings '[{
    "DeviceName": "/dev/sda1",
    "Ebs": {
      "VolumeSize": 20,
      "VolumeType": "gp3",
      "DeleteOnTermination": true
    }
  }]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=POSL-Production}]'
```

#### 2. Elastic IP割り当て（推奨）
```bash
# Elastic IP作成
aws ec2 allocate-address --domain vpc

# インスタンスに関連付け
aws ec2 associate-address \
  --instance-id i-0123456789abcdef0 \
  --allocation-id eipalloc-12345678
```

### セキュリティグループ設定

#### 必要なインバウンドルール
```bash
# SSH (管理用)
Port: 22, Protocol: TCP, Source: Your-IP/32

# HTTP (Nginx)
Port: 80, Protocol: TCP, Source: 0.0.0.0/0

# HTTPS (SSL)
Port: 443, Protocol: TCP, Source: 0.0.0.0/0

# API Server (開発時のみ)
Port: 3001, Protocol: TCP, Source: Your-IP/32
```

#### セキュリティグループ作成例
```bash
# セキュリティグループ作成
aws ec2 create-security-group \
  --group-name POSL-SG \
  --description "POSL Production Security Group"

# ルール追加
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

## 🗄️ RDS MySQL構築

### RDS仕様（本番環境）
```yaml
Engine: MySQL 8.0.35
Instance Class: db.t3.micro
Storage: 20GB GP3
Multi-AZ: 無効 (コスト削減)
Backup: 7日間保持
Maintenance: 日曜 03:00-04:00 JST
```

### RDS作成手順

#### 1. データベース作成
```bash
aws rds create-db-instance \
  --db-instance-identifier posl-production \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password 'PoSL-Prod-2024!' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-name posl_db \
  --backup-retention-period 7 \
  --preferred-maintenance-window 'sun:18:00-sun:19:00' \
  --preferred-backup-window '17:00-18:00' \
  --tags 'Key=Name,Value=POSL-Production-DB'
```

#### 2. データベース初期化
```bash
# EC2からRDS接続確認
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p -D posl_db

# テーブル作成
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  < /home/ubuntu/infrastructure/mysql-schema.sql
```

#### 3. 本番データベーススキーマ
```sql
-- Posts table
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  tweet_id VARCHAR(255),
  status ENUM('draft', 'posted', 'failed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL DEFAULT 'demo',
  setting_type VARCHAR(50) NOT NULL,
  setting_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_setting (user_id, setting_type)
);

-- Error logs table
CREATE TABLE error_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  error_type VARCHAR(100),
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trends table
CREATE TABLE trends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trend_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 アプリケーションデプロイ

### サーバー環境構築

#### 1. 基本パッケージインストール
```bash
# SSH接続
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143

# システム更新
sudo apt update && sudo apt upgrade -y

# 必要パッケージ
sudo apt install -y curl wget git nano htop unzip nginx mysql-client
```

#### 2. Node.js 18.x インストール
```bash
# NodeSourceリポジトリ追加
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js インストール
sudo apt-get install -y nodejs

# バージョン確認
node --version  # v18.19.0
npm --version   # 10.2.3
```

#### 3. PM2インストール（プロセス管理）
```bash
# PM2インストール
sudo npm install -g pm2

# 自動起動設定
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### アプリケーション配置

#### 1. ソースコード配置
```bash
# ホームディレクトリ作業
cd /home/ubuntu

# Gitクローン（または手動アップロード）
git clone https://github.com/your-repo/POSL.git
cp -r POSL/* ./

# または直接配置
mkdir -p backend frontend infrastructure scripts
# ファイルを配置...
```

#### 2. 必要ファイル確認
```bash
# 必須ファイル一覧
ls -la /home/ubuntu/
# backend/simple_final_api.js      - メインAPIサーバー
# manual-post.sh                   - 手動投稿スクリプト  
# enhanced-auto-post.sh            - 自動投稿スクリプト
# infrastructure/mysql-schema.sql  - DB初期化
# .env                            - 環境変数設定
```

#### 3. 環境変数設定
```bash
# .env ファイル作成
cat > /home/ubuntu/.env << 'EOF'
# Database
MYSQL_HOST=posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=PoSL-Prod-2024!
MYSQL_DATABASE=posl_db

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# X (Twitter) API
X_API_KEY=your-x-api-key
X_API_SECRET=your-x-api-secret
X_ACCESS_TOKEN=your-access-token
X_ACCESS_TOKEN_SECRET=your-access-token-secret
X_BEARER_TOKEN=your-bearer-token

# Application
NODE_ENV=production
PORT=3001
API_BASE_URL=http://localhost:3001
EOF

# 権限設定
chmod 600 /home/ubuntu/.env
```

### バックエンドデプロイ

#### 1. Node.js依存関係インストール
```bash
cd /home/ubuntu/backend

# package.json作成（必要に応じて）
cat > package.json << 'EOF'
{
  "name": "posl-backend",
  "version": "1.2.0",
  "description": "POSL Backend API Server",
  "main": "simple_final_api.js",
  "scripts": {
    "start": "node simple_final_api.js",
    "dev": "node simple_final_api.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "openai": "^4.20.1",
    "twitter-api-v2": "^1.15.1"
  }
}
EOF

# 依存関係インストール
npm install
```

#### 2. PM2でAPIサーバー起動
```bash
# PM2設定ファイル作成
cat > /home/ubuntu/backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'posl-api',
    script: 'simple_final_api.js',
    cwd: '/home/ubuntu/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/home/ubuntu/backend/combined.log',
    out_file: '/home/ubuntu/backend/out.log',
    error_file: '/home/ubuntu/backend/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# PM2で起動
cd /home/ubuntu/backend
pm2 start ecosystem.config.js

# 自動起動設定
pm2 save
```

### フロントエンド構築（Next.js）

#### 1. Next.js依存関係インストール
```bash
cd /home/ubuntu/frontend

# package.jsonを確認・作成
npm install

# 本番用設定ファイルをコピー（重要）
cp next.config.production.js next.config.js
cp src/utils/api.production.ts src/utils/api.ts

# 環境変数設定
cat > .env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF

cat > .env.local << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF

# 本番ビルド
NODE_ENV=production npm run build

# ビルド成功確認
ls -la .next/static/

# PM2でNext.js起動
pm2 start npm --name "posl-frontend" -- start
```

#### 2. レイアウト崩れ防止の重要設定

**注意**: 以下の設定を必ず適用してください。これらの設定がないとCSSやAPIが正常に動作しません。

```bash
# 本番用Next.js設定が適用されているか確認
grep "output.*standalone" /home/ubuntu/frontend/next.config.js

# 本番用API設定が適用されているか確認
grep "window.location.host" /home/ubuntu/frontend/src/utils/api.ts

# 設定が正しくない場合は再適用
cd /home/ubuntu/frontend
cp next.config.production.js next.config.js
cp src/utils/api.production.ts src/utils/api.ts
```

### Nginx設定

#### 1. Nginxリバースプロキシ設定
```bash
# 本番用Nginx設定ファイルを使用（重要）
sudo cp /home/ubuntu/infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl

# ドメイン名を実際の値に変更
sudo sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/posl

# 設定有効化
sudo ln -sf /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 設定テスト（重要: エラーがないか必ず確認）
sudo nginx -t

# 再起動
sudo systemctl restart nginx

# 動作確認
curl -I http://localhost
curl -I http://localhost/_next/static/
```

**注意**: デフォルトのNginx設定ではNext.jsの静的ファイルが正しく配信されません。必ず上記の専用設定を使用してください。

#### 2. SSL証明書設定（Let's Encrypt）
```bash
# Certbot インストール
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# SSL証明書取得
sudo certbot --nginx -d your-domain.com

# 自動更新設定
sudo crontab -e
# 追加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 自動化設定

### Cronジョブ設定

#### 1. 自動投稿スケジュール
```bash
# cronエディタ起動
crontab -e

# 毎日9:50に自動投稿
50 9 * * * cd /home/ubuntu && ./enhanced-auto-post.sh >> auto-post.log 2>&1

# 毎日深夜2:00にログローテーション
0 2 * * * cd /home/ubuntu/backend && find . -name "*.log" -size +10M -exec truncate -s 0 {} \;

# 毎週日曜23:00にシステムヘルスチェック
0 23 * * 0 cd /home/ubuntu && ./scripts/system-monitor.sh >> system-health.log 2>&1
```

#### 2. スクリプト実行権限設定
```bash
# スクリプトに実行権限付与
chmod +x /home/ubuntu/manual-post.sh
chmod +x /home/ubuntu/enhanced-auto-post.sh
chmod +x /home/ubuntu/scripts/*.sh
```

## 📊 監視・ロギング

### CloudWatch設定

#### 1. CloudWatch Agent インストール
```bash
# エージェントダウンロード
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm

# 設定ファイル作成
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "POSL/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait"],
        "metrics_collection_interval": 300
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 300
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 300
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/backend/combined.log",
            "log_group_name": "posl-api-logs",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/home/ubuntu/auto-post.log",
            "log_group_name": "posl-cron-logs",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# エージェント開始
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s
```

### アプリケーションログ管理

#### 1. ログローテーション設定
```bash
# logrotate設定
sudo tee /etc/logrotate.d/posl << 'EOF'
/home/ubuntu/backend/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 ubuntu ubuntu
    copytruncate
}

/home/ubuntu/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 ubuntu ubuntu
    copytruncate
}
EOF
```

## 🔒 セキュリティ設定

### ファイアウォール設定

#### 1. UFW（Uncomplicated Firewall）
```bash
# UFW有効化
sudo ufw enable

# 基本ポリシー
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要ポート開放
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS

# 特定IPからの3001番ポートアクセス（開発時のみ）
sudo ufw allow from YOUR_IP to any port 3001

# 状態確認
sudo ufw status
```

### SSH設定強化

#### 1. SSH設定変更
```bash
# SSH設定編集
sudo nano /etc/ssh/sshd_config

# 推奨設定:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin no
# MaxAuthTries 3

# 設定反映
sudo systemctl restart ssh
```

## ✅ 動作確認・テスト

### 基本動作確認

#### 1. サービス状態確認
```bash
# PM2プロセス確認
pm2 status
pm2 logs

# Nginx状態確認
sudo systemctl status nginx
curl http://localhost

# MySQL接続確認
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p -e "SELECT 1;"
```

#### 2. API動作確認
```bash
# ヘルスチェック
curl http://localhost:3001/health

# テスト投稿
cd /home/ubuntu
./manual-post.sh test

# 投稿履歴確認
curl http://localhost:3001/api/post/logs?limit=5
```

#### 3. 自動投稿テスト
```bash
# 手動でcronジョブテスト
cd /home/ubuntu
./enhanced-auto-post.sh

# ログ確認
tail -f auto-post.log
```

### パフォーマンステスト

#### 1. 負荷テスト（基本）
```bash
# Apache Bench でAPIテスト
sudo apt install apache2-utils
ab -n 100 -c 10 http://localhost:3001/health

# サーバーリソース確認
htop
df -h
free -h
```

### セキュリティテスト

#### 1. ポートスキャン確認
```bash
# 外部からのポートスキャン（別サーバーから実行）
nmap -sS your-server-ip

# 期待される結果: 22, 80, 443 のみ開放
```

## 🚨 トラブルシューティング

### よくある問題と解決策

#### 1. レイアウトが崩れる・CSSが読み込まれない
```bash
# 問題: Next.jsの静的ファイルが配信されない
# 原因: 本番用設定の未適用

# 解決策:
cd /home/ubuntu/frontend

# 本番用設定を適用
cp next.config.production.js next.config.js
cp src/utils/api.production.ts src/utils/api.ts

# 再ビルド
rm -rf .next
NODE_ENV=production npm run build

# Nginx設定確認
sudo cp /home/ubuntu/infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl
sudo nginx -t && sudo systemctl restart nginx

# プロセス再起動
pm2 restart posl-frontend
```

#### 2. PM2プロセスが起動しない
```bash
# 問題: Node.jsアプリが起動しない
# 原因: 環境変数の読み込み失敗

# 解決策:
pm2 delete all
cd /home/ubuntu/backend
source /home/ubuntu/.env
pm2 start ecosystem.config.js

# ログ確認
pm2 logs
```

#### 2. MySQL接続エラー
```bash
# 問題: データベース接続失敗
# 原因: セキュリティグループ設定

# 解決策:
# 1. RDSセキュリティグループでEC2からの3306ポートアクセス許可
# 2. 接続文字列確認
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db
```

#### 3. Nginx 502 Bad Gateway
```bash
# 問題: Nginxでアップストリーム接続失敗
# 原因: バックエンドAPIサーバーの停止

# 解決策:
pm2 restart posl-api
sudo systemctl restart nginx

# 設定確認
sudo nginx -t
```

#### 4. 自動投稿が動作しない
```bash
# 問題: cronジョブが実行されない
# 原因: 実行権限・パス設定

# 解決策:
chmod +x /home/ubuntu/enhanced-auto-post.sh
crontab -e
# パス指定を絶対パスに変更

# 手動実行でテスト
cd /home/ubuntu && ./enhanced-auto-post.sh
```

### 緊急時対応手順

#### 1. サービス全停止
```bash
pm2 stop all
sudo systemctl stop nginx
```

#### 2. 緊急復旧
```bash
# 最小限のAPI再起動
cd /home/ubuntu/backend
nohup node simple_final_api.js > emergency.log 2>&1 &

# 簡易動作確認
curl http://localhost:3001/health
```

#### 3. データバックアップ（緊急時）
```bash
# データベースバックアップ
mysqldump -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" posl_db > emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# 設定ファイルバックアップ
tar czf config-backup-$(date +%Y%m%d-%H%M%S).tar.gz /home/ubuntu/.env /home/ubuntu/backend/ecosystem.config.js
```

## 💰 コスト最適化

### AWS料金目安（月額）
```
EC2 t3.small (東京): ~$15
RDS db.t3.micro: ~$12
EBS 20GB: ~$2
Elastic IP: ~$3.6
Data Transfer: ~$1-5

合計: 約$35-40/月 (約5,000円)
```

### コスト削減施策

#### 1. インスタンス最適化
```bash
# CPU・メモリ使用率確認
htop
# 使用率が常に低い場合は t3.micro に変更可能

# ストレージ使用量確認
df -h
# 使用量が少ない場合はEBSサイズ縮小可能
```

#### 2. RDS最適化
```bash
# 接続数確認
mysql -h posl-production... -e "SHOW STATUS LIKE 'Threads_connected';"
# 接続数が少ない場合は db.t3.micro → t3.nano も可能
```

#### 3. 自動化スケジューリング（開発環境用）
```bash
# 開発環境の夜間停止（コスト削減）
# EC2インスタンス停止: 23:00
aws ec2 stop-instances --instance-ids i-0123456789abcdef0

# EC2インスタンス開始: 08:00
aws ec2 start-instances --instance-ids i-0123456789abcdef0
```

## 📈 スケーリング戦略

### 垂直スケーリング（Scale Up）

#### 1. EC2インスタンスサイズアップ
```bash
# 現在: t3.small → t3.medium（必要に応じて）

# 手順:
# 1. インスタンス停止
# 2. インスタンスタイプ変更
# 3. 再起動
# 4. 動作確認
```

#### 2. RDSスケールアップ
```bash
# 現在: db.t3.micro → db.t3.small

# 手順:
# 1. AWS コンソールでインスタンスクラス変更
# 2. メンテナンスウィンドウで自動実行
# 3. アプリケーション接続確認
```

### 水平スケーリング（Scale Out）

#### 1. ロードバランサー構成（将来拡張）
```yaml
# Application Load Balancer
Target Group: 
  - EC2-1 (Primary)
  - EC2-2 (Secondary)
  
Health Check: /health
```

#### 2. マルチAZ構成（高可用性）
```yaml
# RDS Multi-AZ
Primary: ap-northeast-1a
Standby: ap-northeast-1c

# Auto Failover: 有効
```

## 🔄 CI/CD パイプライン（発展）

### GitHub Actions 設定例

#### 1. デプロイワークフロー
```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ubuntu
        key: ${{ secrets.EC2_PRIVATE_KEY }}
        script: |
          cd /home/ubuntu
          git pull origin main
          cd backend
          npm install
          pm2 restart posl-api
```

### ゼロダウンタイムデプロイ

#### 1. Blue-Green デプロイ準備
```bash
# Blue環境（現在稼働中）: Port 3001
# Green環境（新バージョン）: Port 3002

# Nginx設定でトラフィック切り替え
upstream backend {
    server localhost:3001 weight=100;
    server localhost:3002 weight=0;
}
```

## 📚 運用ドキュメント

### 日次運用チェックリスト

#### 朝の確認（9:00）
- [ ] PM2プロセス状態確認: `pm2 status`
- [ ] 前日の自動投稿確認: `tail auto-post.log`
- [ ] システムリソース確認: `htop`, `df -h`
- [ ] エラーログ確認: `pm2 logs --err`

#### 夜の確認（21:00）
- [ ] 本日の投稿実績確認
- [ ] データベース接続確認
- [ ] バックアップ状態確認

### 週次運用チェックリスト

#### 日曜日メンテナンス
- [ ] ログファイルローテーション確認
- [ ] システムパッケージ更新: `sudo apt update && sudo apt list --upgradable`
- [ ] SSL証明書期限確認: `sudo certbot certificates`
- [ ] セキュリティアップデート適用

### 月次運用チェックリスト

#### 月初レポート作成
- [ ] 投稿実績レポート（成功率・失敗率）
- [ ] システムパフォーマンスレポート
- [ ] AWS料金確認・最適化提案
- [ ] セキュリティ監査実施

## 🆘 エスカレーション手順

### 障害レベル定義

#### レベル1: サービス完全停止
- **影響**: 投稿機能・API完全停止
- **対応時間**: 30分以内
- **エスカレーション**: 即座に開発責任者へ連絡

#### レベル2: 機能部分停止
- **影響**: 一部機能停止（手動投稿は可能）
- **対応時間**: 2時間以内
- **エスカレーション**: 1時間以内に開発責任者へ連絡

#### レベル3: パフォーマンス低下
- **影響**: レスポンス遅延・間欠的エラー
- **対応時間**: 24時間以内
- **エスカレーション**: 営業時間内に関係者へ連絡

### 緊急連絡先

#### 開発責任者
- **担当**: システム全体・API開発
- **連絡方法**: メール + Slack
- **対応時間**: 24時間対応（レベル1のみ）

#### インフラ責任者
- **担当**: AWS・サーバー管理
- **連絡方法**: メール + 電話
- **対応時間**: 営業時間 + 緊急時

## 📊 付録

### A. 環境変数一覧

#### 必須環境変数
```bash
# Database
MYSQL_HOST=posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=PoSL-Prod-2024!
MYSQL_DATABASE=posl_db

# APIs
OPENAI_API_KEY=sk-proj-...
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...

# Application
NODE_ENV=production
PORT=3001
```

#### オプション環境変数
```bash
# Logging
LOG_LEVEL=info
LOG_FILE=./app.log

# Features
ENABLE_CRON=true
ENABLE_MONITORING=true
```

### B. ポート使用一覧

#### アプリケーション
- **3001**: Node.js APIサーバー（メイン）
- **3000**: Next.js フロントエンド
- **80**: Nginx HTTP
- **443**: Nginx HTTPS

#### システム
- **22**: SSH
- **3306**: MySQL（RDS）

### C. ログファイル一覧

#### アプリケーションログ
```bash
/home/ubuntu/backend/combined.log    # PM2統合ログ
/home/ubuntu/backend/out.log         # 標準出力
/home/ubuntu/backend/error.log       # エラーログ
/home/ubuntu/auto-post.log           # 自動投稿ログ
```

#### システムログ
```bash
/var/log/nginx/access.log           # Nginxアクセス
/var/log/nginx/error.log            # Nginxエラー
/var/log/auth.log                   # SSH認証
/var/log/syslog                     # システム全般
```

### D. 有用なコマンド集

#### 日常運用
```bash
# サービス状態一括確認
pm2 status && sudo systemctl status nginx && sudo ufw status

# ログ一括確認
tail -f /home/ubuntu/backend/combined.log /home/ubuntu/auto-post.log

# リソース確認
htop && df -h && free -h

# ネットワーク確認
netstat -tulpn | grep LISTEN
```

#### デバッグ・診断
```bash
# API接続テスト
curl -s http://localhost:3001/health | jq

# データベース接続テスト
mysql -h posl-production... -e "SELECT NOW();"

# プロセス詳細確認
ps aux | grep node
```

#### メンテナンス
```bash
# 全サービス再起動
pm2 restart all && sudo systemctl restart nginx

# ログクリア
truncate -s 0 /home/ubuntu/backend/*.log

# 一時ファイル清理
find /tmp -type f -atime +7 -delete
```

---

**ドキュメント情報**:  
**作成者**: GitHub Copilot  
**最終更新**: 2025年11月19日  
**レビュー周期**: 3ヶ月毎  
**関連ドキュメント**: POSL_V1.2_運用ガイド_最新版.md, POSL_V1.2_API仕様書_最新版.md  

**このドキュメントに関する質問・改善提案は開発チームまでお願いします。**