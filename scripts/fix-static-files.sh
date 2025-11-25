#!/bin/bash

# POSL 静的ファイル配信修正スクリプト
# 用途: Nginx設定を修正して静的ファイルが正しく配信されるようにする

set -e

EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/ubuntu}"

echo "=== POSL 静的ファイル配信修正 ==="
echo "EC2 Host: ${EC2_HOST}"

# SSH接続確認
if ! ssh -i "${SSH_KEY}" -o ConnectTimeout=5 "${EC2_USER}@${EC2_HOST}" "echo 'SSH接続成功'" > /dev/null 2>&1; then
    echo "❌ SSH接続に失敗しました"
    exit 1
fi

# リモートコマンド実行
remote_exec() {
    ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "$1"
}

# ファイル転送
remote_copy() {
    scp -i "${SSH_KEY}" "$1" "${EC2_USER}@${EC2_HOST}:$2"
}

echo "📦 Nginx設定ファイルを転送中..."
remote_copy "infrastructure/nginx-nextjs-production.conf" "${DEPLOY_DIR}/nginx-posl.conf"

echo "🔧 Nginx設定を適用中..."
ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" << 'REMOTE_EOF'
sudo cp /home/ubuntu/nginx-posl.conf /etc/nginx/sites-available/posl
sudo ln -sf /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 設定テスト
if sudo nginx -t; then
    echo "✓ Nginx設定は正常です"
    sudo systemctl restart nginx
    echo "✓ Nginx再起動完了"
else
    echo "❌ Nginx設定にエラーがあります"
    exit 1
fi

# 静的ファイルの存在確認
echo "📁 静的ファイルの確認..."
if [ -d "/home/ubuntu/frontend/.next/static" ]; then
    echo "✓ .next/static ディレクトリが存在します"
    ls -la /home/ubuntu/frontend/.next/static/ | head -5
else
    echo "⚠ .next/static ディレクトリが見つかりません"
    echo "フロントエンドを再ビルドしてください:"
    echo "  cd /home/ubuntu/frontend && npm run build"
fi

# ファイル権限確認
echo "🔐 ファイル権限を確認中..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/frontend/.next 2>/dev/null || true
sudo chmod -R 755 /home/ubuntu/frontend/.next 2>/dev/null || true
echo "✓ ファイル権限を設定しました"
REMOTE_EOF

echo ""
echo "=== 修正完了 ==="
echo ""
echo "次のステップ:"
echo "1. ブラウザで http://${EC2_HOST}/ にアクセス"
echo "2. 開発者ツールのコンソールでエラーが解消されているか確認"
echo "3. まだエラーが出る場合は、フロントエンドを再ビルド:"
echo "   ssh ${EC2_USER}@${EC2_HOST} 'cd /home/ubuntu/frontend && npm run build'"
echo ""

