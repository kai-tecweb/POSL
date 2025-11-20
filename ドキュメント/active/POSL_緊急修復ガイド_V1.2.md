# 🚨 緊急: POSL デプロイ問題の即座修復ガイド

**作成日**: 2025年11月19日  
**状況**: 現在デプロイされているページでレイアウト崩れとエラーが発生  
**緊急度**: 🔴 最高（即座修復が必要）

## 🔍 問題の症状確認

現在発生している可能性の高い問題：

### 症状1: レイアウトが崩れている
- ✅ Tailwind CSSが読み込まれていない
- ✅ カスタムCSSが適用されていない  
- ✅ ボタン・カードのスタイルが消えている
- ✅ レスポンシブレイアウトが破綻

### 症状2: JavaScript エラー
- ✅ Next.js のハイドレーションエラー
- ✅ API呼び出しの失敗（404/500エラー）
- ✅ コンポーネントの表示異常

### 症状3: ネットワークエラー  
- ✅ 静的ファイル（CSS/JS）の404エラー
- ✅ API エンドポイントへの接続失敗
- ✅ フォントファイルの読み込み失敗

## 🚀 即座修復手順（5分で実行）

### ステップ1: 緊急状況確認
```bash
# 1. SSH接続
ssh -i ~/.ssh/posl-production-key.pem ubuntu@YOUR_EC2_IP

# 2. プロセス状態確認
pm2 status

# 3. Nginx状態確認  
sudo systemctl status nginx

# 4. ログ確認
pm2 logs --lines 20
sudo tail -20 /var/log/nginx/error.log
```

### ステップ2: 最小限の緊急修復
```bash
# 1. 正しい設定ファイルを適用
cd /home/ubuntu/frontend
cp next.config.production.js next.config.js
cp src/utils/api.production.ts src/utils/api.ts

# 2. 環境変数の確認・設定
cat > .env.local << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF

# 3. 緊急ビルド・再起動
rm -rf .next
NODE_ENV=production npm run build

# 4. プロセス再起動
pm2 restart all
sudo systemctl restart nginx
```

### ステップ3: 緊急動作確認
```bash
# 1. 基本接続確認
curl -I http://localhost

# 2. API確認
curl -s http://localhost/api/health || curl -s http://localhost:3001/health

# 3. 静的ファイル確認  
curl -I http://localhost/_next/static/

# 4. フロントページ確認
curl -I http://localhost:3000/
```

## 🔧 具体的な修復コマンド

### A. CSS が読み込まれない場合
```bash
# Next.js 設定を本番用に変更
cd /home/ubuntu/frontend
cp next.config.production.js next.config.js

# Tailwind CSS の確認
npm list tailwindcss

# 本番ビルド再実行
rm -rf .next node_modules/.cache
NODE_ENV=production npm run build

# Nginx 設定確認
sudo cp /home/ubuntu/infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl
sudo nginx -t && sudo systemctl restart nginx
```

### B. API エラーが発生している場合
```bash
# API設定を本番用に変更
cd /home/ubuntu/frontend
cp src/utils/api.production.ts src/utils/api.ts

# APIサーバー再起動
pm2 restart posl-api

# 接続確認
curl -s http://localhost:3001/health
curl -s http://localhost/api/health
```

### C. JavaScript エラーが発生している場合
```bash
# TypeScript エラーを無視してビルド
cd /home/ubuntu/frontend

# next.config.js の修正
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: '/api',
  },
};

module.exports = nextConfig;
EOF

# 強制ビルド
NODE_ENV=production npm run build -- --no-lint
```

## ⚡ 超緊急時の最小限復旧

もし上記で解決しない場合：

### 最小限HTMLページでの一時復旧
```bash
# 緊急用静的ページを作成
sudo mkdir -p /var/www/html/emergency
sudo tee /var/www/html/emergency/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>POSL - メンテナンス中</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { color: #f59e0b; font-size: 24px; margin: 20px 0; }
        .message { color: #6b7280; line-height: 1.6; }
        .api-test { margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 POSL システム</h1>
        <div class="status">現在メンテナンス中です</div>
        <div class="message">
            システムの修復作業を行っています。<br>
            しばらくお待ちください。
        </div>
        
        <div class="api-test">
            <h3>システム状態</h3>
            <button onclick="checkAPI()">API接続確認</button>
            <div id="api-result"></div>
        </div>
        
        <div class="message">
            <small>最終更新: 2025年11月19日</small>
        </div>
    </div>

    <script>
    async function checkAPI() {
        const result = document.getElementById('api-result');
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                result.innerHTML = '<span style="color: green;">✓ API接続正常</span>';
            } else {
                result.innerHTML = '<span style="color: red;">✗ API接続エラー</span>';
            }
        } catch (error) {
            result.innerHTML = '<span style="color: red;">✗ 接続失敗: ' + error.message + '</span>';
        }
    }
    </script>
</body>
</html>
EOF

# 緊急用Nginx設定
sudo tee /etc/nginx/sites-available/emergency << 'EOF'
server {
    listen 80 default_server;
    root /var/www/html/emergency;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 緊急設定を有効化
sudo ln -sf /etc/nginx/sites-available/emergency /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## 📊 問題診断チェックリスト

実行して該当する項目をチェック：

### システム基盤
- [ ] `pm2 status` で全プロセスが running
- [ ] `sudo systemctl status nginx` が active  
- [ ] `curl -I http://localhost` が 200 OK
- [ ] `df -h` でディスク容量が十分

### アプリケーション
- [ ] `ls -la /home/ubuntu/frontend/.next/` でビルド済み
- [ ] `curl -s http://localhost:3001/health` が成功
- [ ] `curl -s http://localhost:3000/` がレスポンス
- [ ] `pm2 logs` にエラーがない

### 設定ファイル
- [ ] `next.config.js` が本番用設定
- [ ] `src/utils/api.ts` が本番対応版  
- [ ] `/etc/nginx/sites-enabled/posl` が存在
- [ ] `.env.local` で `NEXT_PUBLIC_API_URL=/api`

### ネットワーク
- [ ] `curl -I http://localhost/_next/static/` が成功
- [ ] `curl -I http://localhost/api/health` が成功
- [ ] `netstat -tulpn | grep :80` で nginx が Listen
- [ ] `netstat -tulpn | grep :3001` で API が Listen

## 🆘 エスカレーション基準

以下の場合は即座にエスカレーション：

### レベル1: システム停止（即座連絡）
- [ ] PM2プロセスが全停止
- [ ] Nginxが起動しない  
- [ ] EC2インスタンスに接続不可
- [ ] データベース接続完全失敗

### レベル2: 機能部分停止（1時間以内）
- [ ] フロントエンドが表示されない
- [ ] API が完全に応答しない
- [ ] 投稿機能が動作しない

### レベル3: 表示問題（4時間以内）  
- [ ] CSSが読み込まれない
- [ ] 一部の機能でエラー
- [ ] パフォーマンス著しく低下

## 📞 緊急連絡先

### 技術責任者
- **対応時間**: 24時間（レベル1のみ）
- **連絡方法**: メール + Slack

### システム管理者  
- **対応時間**: 営業時間 + 緊急時
- **連絡方法**: メール + 電話

---

**このガイドを使用して5分以内に緊急修復を開始してください。状況が改善しない場合は即座にエスカレーションしてください。**