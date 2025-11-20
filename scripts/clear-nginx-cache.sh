#!/bin/bash

# Nginxキャッシュクリアと最終確認スクリプト

EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"

echo "=== Nginxキャッシュクリアと最終確認 ==="

ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" << 'REMOTE_EOF'
echo "🔄 Nginxキャッシュをクリア..."
# Nginxのキャッシュディレクトリがあれば削除
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

echo "🔄 Nginx再起動（完全再起動）..."
sudo systemctl restart nginx
sleep 2
sudo systemctl status nginx --no-pager | head -5

echo ""
echo "🧪 静的ファイルアクセステスト..."
echo "1. _next/static/ パス:"
curl -s -o /dev/null -w "  Status: %{http_code}, Size: %{size_download} bytes\n" http://localhost/_next/static/chunks/main-8b4f01c6973851cf.js

echo "2. next/static/ パス:"
curl -s -o /dev/null -w "  Status: %{http_code}, Size: %{size_download} bytes\n" http://localhost/next/static/chunks/main-8b4f01c6973851cf.js

echo ""
echo "📋 現在の設定確認..."
echo "Nginx設定ファイル:"
sudo nginx -t 2>&1 | tail -2

echo ""
echo "✅ 修正完了！"
echo ""
echo "ブラウザで以下を試してください:"
echo "1. ハードリフレッシュ: Ctrl+Shift+R (Windows/Linux) または Cmd+Shift+R (Mac)"
echo "2. キャッシュをクリア: 開発者ツール → Network → Disable cache にチェック"
echo "3. http://18.179.104.143/ にアクセス"
REMOTE_EOF

echo ""
echo "=== 完了 ==="


