# POSL AWS EC2 デプロイ手順書

## 📋 概要

このドキュメントでは、POSLシステムをAWS EC2環境にデプロイする手順を説明します。

## 🚀 クイックデプロイ

### 前提条件

1. **AWS EC2インスタンスが起動している**
   - Ubuntu 22.04 LTS
   - Node.js 18.x以上がインストール済み
   - PM2がインストール済み
   - Nginxがインストール済み

2. **SSH接続情報**
   - EC2ホストIPアドレス
   - SSH秘密鍵ファイル

3. **環境変数設定**
   - `.env`ファイルに必要なAPIキーが設定済み

### デプロイ実行

```bash
# 環境変数を設定（オプション）
export EC2_HOST="18.179.104.143"
export EC2_USER="ubuntu"
export SSH_KEY="~/.ssh/posl-production-key.pem"

# デプロイスクリプト実行
cd /home/iwasaki/work/POSL
./scripts/deploy-to-aws.sh
```

## 📝 詳細手順

### 1. 事前準備

#### 1.1 ローカル環境の確認

```bash
# 必須ファイルの確認
ls -la simple_final_api.js
ls -la backend/package.json
ls -la frontend/package.json
ls -la infrastructure/nginx-nextjs-production.conf
```

#### 1.2 SSH接続確認

```bash
# SSH接続テスト
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 "echo '接続成功'"
```

### 2. デプロイ実行

#### 2.1 自動デプロイ（推奨）

```bash
./scripts/deploy-to-aws.sh
```

このスクリプトは以下を自動実行します：
- バックエンドファイルの転送
- フロントエンドファイルの転送
- 依存関係のインストール
- フロントエンドのビルド
- PM2プロセスの再起動

#### 2.2 手動デプロイ

自動デプロイが失敗した場合、以下の手順で手動デプロイできます：

```bash
# 1. バックエンドファイルを転送
scp -i ~/.ssh/posl-production-key.pem simple_final_api.js ubuntu@18.179.104.143:/home/ubuntu/
scp -i ~/.ssh/posl-production-key.pem backend/package.json ubuntu@18.179.104.143:/home/ubuntu/backend/

# 2. フロントエンドファイルを転送
scp -i ~/.ssh/posl-production-key.pem -r frontend/src ubuntu@18.179.104.143:/home/ubuntu/frontend/
scp -i ~/.ssh/posl-production-key.pem frontend/package.json ubuntu@18.179.104.143:/home/ubuntu/frontend/
scp -i ~/.ssh/posl-production-key.pem frontend/next.config.production.js ubuntu@18.179.104.143:/home/ubuntu/frontend/next.config.js

# 3. SSH接続して依存関係インストールとビルド
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
cd /home/ubuntu/backend
npm install --production

cd /home/ubuntu/frontend
npm install
NODE_ENV=production npm run build
EOF

# 4. PM2でプロセス再起動
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
cd /home/ubuntu/backend
pm2 restart posl-api || pm2 start simple_final_api.js --name posl-api --cwd /home/ubuntu/backend

cd /home/ubuntu/frontend
pm2 restart posl-frontend || pm2 start npm --name posl-frontend -- start
pm2 save
EOF
```

### 3. Nginx設定

```bash
# Nginx設定ファイルを転送
scp -i ~/.ssh/posl-production-key.pem infrastructure/nginx-nextjs-production.conf ubuntu@18.179.104.143:/home/ubuntu/

# SSH接続してNginx設定を適用
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
sudo cp /home/ubuntu/nginx-nextjs-production.conf /etc/nginx/sites-available/posl
sudo ln -sf /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
EOF
```

### 4. 動作確認

```bash
# ヘルスチェック
curl http://18.179.104.143/health

# フロントエンド確認
curl http://18.179.104.143/

# PM2プロセス確認
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 "pm2 status"
```

## 🔧 トラブルシューティング

### デプロイが失敗する場合

#### 1. SSH接続エラー

```bash
# SSH接続確認
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 "echo 'test'"

# セキュリティグループ確認
# AWSコンソールでSSH(22)ポートが開放されているか確認
```

#### 2. ファイル転送エラー

```bash
# ファイルの存在確認
ls -la simple_final_api.js
ls -la backend/package.json
ls -la frontend/package.json

# 手動転送でエラー詳細を確認
scp -i ~/.ssh/posl-production-key.pem -v simple_final_api.js ubuntu@18.179.104.143:/home/ubuntu/
```

#### 3. ビルドエラー

```bash
# リモートで直接ビルドを実行してエラーを確認
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
cd /home/ubuntu/frontend
npm install
NODE_ENV=production npm run build
EOF
```

#### 4. PM2プロセスが起動しない

```bash
# PM2ログを確認
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 "pm2 logs"

# 手動起動でエラーを確認
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
cd /home/ubuntu/backend
node simple_final_api.js
EOF
```

### レイアウトが崩れる場合

#### 1. CSSが読み込まれない

```bash
# フロントエンドを再ビルド
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
cd /home/ubuntu/frontend
rm -rf .next
NODE_ENV=production npm run build
pm2 restart posl-frontend
EOF
```

#### 2. 静的ファイルが配信されない

```bash
# Nginx設定を確認
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
sudo nginx -t
sudo systemctl restart nginx
curl http://localhost/_next/static/
EOF
```

## 📊 デプロイ後の確認事項

- [ ] バックエンドAPIが起動している（`pm2 status`）
- [ ] フロントエンドが起動している（`pm2 status`）
- [ ] ヘルスチェックが成功（`curl http://localhost:3001/health`）
- [ ] フロントエンドが表示される（`curl http://localhost:3000`）
- [ ] Nginxが正しく動作している（`sudo systemctl status nginx`）
- [ ] 環境変数が正しく設定されている（`.env`ファイル確認）

## 🔄 更新デプロイ

既存のデプロイを更新する場合：

```bash
# 自動デプロイスクリプトを再実行
./scripts/deploy-to-aws.sh

# または、特定のコンポーネントのみ更新
# バックエンドのみ更新
scp -i ~/.ssh/posl-production-key.pem simple_final_api.js ubuntu@18.179.104.143:/home/ubuntu/
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 "pm2 restart posl-api"

# フロントエンドのみ更新
scp -i ~/.ssh/posl-production-key.pem -r frontend/src ubuntu@18.179.104.143:/home/ubuntu/frontend/
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 << 'EOF'
cd /home/ubuntu/frontend
npm run build
pm2 restart posl-frontend
EOF
```

## 📚 関連ドキュメント

- [POSL AWS EC2 デプロイガイド](../ドキュメント/active/POSL_AWS-EC2_デプロイガイド_V1.2.md)
- [POSL V1.2 運用ガイド](../ドキュメント/active/POSL_V1.2_運用ガイド_最新版.md)
- [POSL V1.2 API仕様書](../ドキュメント/active/POSL_V1.2_API仕様書_最新版.md)

---

**問題が発生した場合は、上記のトラブルシューティングセクションを参照してください。**

