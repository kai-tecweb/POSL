#!/bin/bash
# POSL自動デプロイスクリプト
set -e

echo "=== POSL デプロイ開始 ==="

# 権限設定
chmod +x manual-post.sh enhanced-auto-post.sh 2>/dev/null || true

# バックエンドセットアップ
echo "📦 バックエンドセットアップ中..."
cd backend
npm install
mkdir -p logs
cd ..

# フロントエンドセットアップ
echo "📦 フロントエンドセットアップ中..."
cd frontend
npm install

# 環境変数設定
cat > .env.production << 'ENVEOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
ENVEOF

cat > .env.local << 'ENVEOF'  
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
ENVEOF

NODE_ENV=production npm run build
cd ..

echo "✓ デプロイ完了"
echo ""
echo "次のステップ:"
echo "1. .env ファイルを編集してAPI Keyを設定"
echo "2. PM2でプロセス起動:"
echo "   pm2 start backend/ecosystem.config.js"
echo "   pm2 start npm --name \"posl-frontend\" -- start"
echo "3. Nginxの設定:"
echo "   sudo cp infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl"
echo "   sudo ln -s /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/"
echo "   sudo systemctl restart nginx"
echo "4. 動作確認:"
echo "   ./manual-post.sh test"
