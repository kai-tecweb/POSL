# POSL デプロイ問題 解決ガイド

**作成日**: 2025年11月19日  
**対象**: システム管理者・DevOps エンジニア  
**状況**: デプロイ後のレイアウト崩れ・エラー解決  

## 🚨 問題の症状

### よくある症状
1. **レイアウトが崩れている**
   - CSS が読み込まれていない
   - Tailwind クラスが適用されない
   - ボタンやカードのスタイルが消える

2. **JavaScript エラー**
   - API 呼び出しが失敗する
   - Next.js のハイドレーションエラー
   - 404 エラーでリソースが見つからない

3. **フォント・画像の表示問題**
   - Web フォントが読み込まれない
   - 画像が表示されない

## 🔍 根本原因の特定

### 主な原因
1. **Next.js 設定の問題**
   - 静的アセットの配信設定
   - ビルド設定の不備
   - 環境変数の設定ミス

2. **Nginx プロキシ設定の問題**
   - 静的ファイルのルーティング設定
   - API プロキシの設定ミス
   - キャッシュ設定の問題

3. **API エンドポイントの不整合**
   - フロントエンドとバックエンドの URL 不一致
   - CORS 設定の問題

## ✅ 解決手順

### ステップ1: Next.js 設定の修正

#### 1.1 本番用 Next.js 設定適用
```bash
# SSH で EC2 に接続
ssh -i ~/.ssh/posl-production-key.pem ubuntu@YOUR_EC2_IP

# フロントエンドディレクトリに移動
cd /home/ubuntu/frontend

# 本番用設定をコピー
cp /home/ubuntu/frontend/next.config.production.js /home/ubuntu/frontend/next.config.js

# 内容を確認・編集
nano next.config.js
```

#### 1.2 環境変数の設定
```bash
# .env.production ファイル作成
cat > /home/ubuntu/frontend/.env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF

# .env.local も作成（優先度高）
cat > /home/ubuntu/frontend/.env.local << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF
```

### ステップ2: Next.js ビルドの再実行

#### 2.1 依存関係の再インストール
```bash
cd /home/ubuntu/frontend

# 古いビルドファイルを削除
rm -rf .next node_modules package-lock.json

# 依存関係を再インストール
npm install

# Tailwind CSS の設定確認
npm list tailwindcss
```

#### 2.2 本番ビルド実行
```bash
# 本番用ビルド
NODE_ENV=production npm run build

# ビルド結果を確認
ls -la .next/
ls -la .next/static/

# ビルドエラーがないか確認
echo "ビルド完了。エラーがないか上記を確認してください。"
```

### ステップ3: Nginx 設定の修正

#### 3.1 本番用 Nginx 設定適用
```bash
# 本番用 Nginx 設定をコピー
sudo cp /home/ubuntu/infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl

# ドメイン名を実際の値に変更（必要に応じて）
sudo sed -i 's/your-domain.com/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/posl

# 設定ファイルの有効化
sudo ln -sf /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm -f /etc/nginx/sites-enabled/default

# 設定テスト
sudo nginx -t
```

#### 3.2 Nginx 再起動
```bash
# Nginx 再起動
sudo systemctl restart nginx

# 状態確認
sudo systemctl status nginx

# ログ確認
sudo tail -f /var/log/nginx/posl_error.log
```

### ステップ4: API 設定の修正

#### 4.1 フロントエンド API 設定更新
```bash
# 本番用 API 設定をコピー
cp /home/ubuntu/frontend/src/utils/api.production.ts /home/ubuntu/frontend/src/utils/api.ts

# 設定を確認
head -20 /home/ubuntu/frontend/src/utils/api.ts
```

#### 4.2 API サーバーの確認・再起動
```bash
# PM2 でのプロセス確認
pm2 status

# API サーバーの再起動
pm2 restart posl-api

# API 健全性確認
curl -s http://localhost:3001/health

# ログ確認
pm2 logs posl-api --lines 20
```

### ステップ5: Next.js サーバーの再起動

#### 5.1 Next.js プロセスの再起動
```bash
# 既存の Next.js プロセスを停止
pm2 delete posl-frontend 2>/dev/null || true
pkill -f "next"

# 新しく Next.js を起動
cd /home/ubuntu/frontend
NODE_ENV=production npm run build

# PM2 で起動
pm2 start npm --name "posl-frontend" -- start

# 状態確認
pm2 status
```

### ステップ6: 動作確認

#### 6.1 基本動作テスト
```bash
# Nginx ステータス確認
curl -I http://localhost

# API エンドポイント確認
curl -s http://localhost/api/health || curl -s http://localhost:3001/health

# 静的ファイル確認
curl -I http://localhost/_next/static/css/

# フロントエンド確認
curl -I http://localhost:3000/
```

#### 6.2 ブラウザでの確認
```bash
echo "以下をブラウザで確認してください:"
echo "1. http://YOUR_EC2_IP/ - メインページ"
echo "2. ブラウザの開発者ツールでコンソールエラーを確認"
echo "3. ネットワークタブで失敗しているリクエストを確認"
```

## 🔧 追加のトラブルシューティング

### CSS が読み込まれない場合

#### A. Tailwind CSS の確認
```bash
cd /home/ubuntu/frontend

# Tailwind 設定確認
cat tailwind.config.js

# PostCSS 設定確認
cat postcss.config.js

# globals.css の確認
head -10 src/app/globals.css
```

#### B. ビルド後の CSS ファイル確認
```bash
# CSS ファイルが生成されているか確認
find .next/static -name "*.css" -type f

# ファイルサイズ確認（空でないか）
find .next/static -name "*.css" -type f -exec ls -lh {} \;
```

### API 呼び出しが失敗する場合

#### A. CORS の確認
```bash
# CORS ヘッダーの確認
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/health
```

#### B. API エンドポイントの確認
```bash
# 利用可能なエンドポイント一覧
curl -s http://localhost:3001/ | grep -E "GET|POST|PUT|DELETE"

# 具体的な API テスト
curl -s http://localhost:3001/dev/settings/post-time
curl -s http://localhost:3001/api/post/logs?limit=5
```

### フォント・画像の問題

#### A. 静的ファイルのパス確認
```bash
# public ディレクトリの確認
ls -la /home/ubuntu/frontend/public/

# Next.js の静的ファイル生成確認
ls -la /home/ubuntu/frontend/.next/static/

# Nginx の静的ファイル配信テスト
curl -I http://localhost/favicon.ico
```

## 📋 確認チェックリスト

### ✅ 設定ファイル
- [ ] `next.config.js` が本番用設定になっている
- [ ] `.env.production` と `.env.local` が正しく設定されている
- [ ] `tailwind.config.js` の content パスが正しい
- [ ] Nginx の設定が本番用になっている

### ✅ ビルド・プロセス
- [ ] `npm run build` がエラーなく完了している
- [ ] `.next/static/` にファイルが生成されている
- [ ] PM2 で全プロセスが正常に動作している
- [ ] Nginx が正常に起動している

### ✅ ネットワーク・API
- [ ] API サーバー（3001番ポート）が動作している
- [ ] Next.js サーバー（3000番ポート）が動作している
- [ ] Nginx（80/443番ポート）でプロキシが動作している
- [ ] CORS 設定が正しい

### ✅ 動作確認
- [ ] ブラウザでメインページが表示される
- [ ] CSS スタイルが正しく適用されている
- [ ] JavaScript が正常に動作している
- [ ] API 呼び出しが成功している

## 🚨 緊急時の復旧手順

### 完全リセット手順
```bash
# 1. 全サービス停止
pm2 delete all
sudo systemctl stop nginx

# 2. ファイルのバックアップ
cd /home/ubuntu
tar czf backup-$(date +%Y%m%d-%H%M%S).tar.gz frontend/ backend/ .env

# 3. フロントエンドの完全再構築
cd frontend
rm -rf .next node_modules package-lock.json
npm install
NODE_ENV=production npm run build

# 4. 設定ファイルの適用
cp next.config.production.js next.config.js
cp src/utils/api.production.ts src/utils/api.ts

# 5. サービス再起動
pm2 start ecosystem.config.js
pm2 start npm --name "posl-frontend" -- start
sudo systemctl start nginx

# 6. 動作確認
curl -I http://localhost
pm2 status
```

### 最小限の動作確認
```bash
# API のみで確認
cd /home/ubuntu
./manual-post.sh test

# フロントエンド無しでの API アクセス
curl -s http://localhost:3001/health

# 基本的な HTML 表示確認
echo "<h1>Test</h1>" | sudo tee /var/www/html/test.html
curl http://localhost/test.html
```

## 📞 追加サポート

### ログ収集スクリプト
```bash
# 問題調査用のログ収集
cat > /home/ubuntu/collect-logs.sh << 'EOF'
#!/bin/bash
LOG_DIR="debug-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

# システム情報
uname -a > "$LOG_DIR/system.txt"
free -h > "$LOG_DIR/memory.txt"
df -h > "$LOG_DIR/disk.txt"

# プロセス情報
pm2 status > "$LOG_DIR/pm2-status.txt"
pm2 logs --lines 50 > "$LOG_DIR/pm2-logs.txt"

# Nginx 情報
sudo nginx -t > "$LOG_DIR/nginx-test.txt" 2>&1
sudo systemctl status nginx > "$LOG_DIR/nginx-status.txt"

# ログファイル
cp /var/log/nginx/posl_error.log "$LOG_DIR/" 2>/dev/null
cp /home/ubuntu/backend/combined.log "$LOG_DIR/" 2>/dev/null

# 設定ファイル
cp /home/ubuntu/frontend/next.config.js "$LOG_DIR/"
cp /etc/nginx/sites-available/posl "$LOG_DIR/nginx.conf"

echo "ログ収集完了: $LOG_DIR"
tar czf "$LOG_DIR.tar.gz" "$LOG_DIR"
echo "アーカイブ作成: $LOG_DIR.tar.gz"
EOF

chmod +x /home/ubuntu/collect-logs.sh
```

### 使用方法
```bash
# ログ収集実行
./collect-logs.sh

# 収集したログの確認
ls -la debug-logs-*.tar.gz
```

---

**このガイドに従っても問題が解決しない場合は、上記ログ収集スクリプトを実行し、結果を開発チームに共有してください。**