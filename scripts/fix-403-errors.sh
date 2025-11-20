#!/bin/bash

# POSL 403エラー修正スクリプト
# 用途: 静的ファイルの403エラーを修正

set -e

EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"

echo "=== POSL 403エラー修正 ==="
echo "EC2 Host: ${EC2_HOST}"

# SSH接続確認
if ! ssh -i "${SSH_KEY}" -o ConnectTimeout=5 "${EC2_USER}@${EC2_HOST}" "echo 'SSH接続成功'" > /dev/null 2>&1; then
    echo "❌ SSH接続に失敗しました"
    exit 1
fi

echo "🔧 ファイル権限とNginx設定を修正中..."
ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" << 'REMOTE_EOF'
set -e

FRONTEND_DIR="/home/ubuntu/frontend"
NEXT_DIR="${FRONTEND_DIR}/.next"

echo "📁 ディレクトリ構造を確認..."
if [ ! -d "${NEXT_DIR}" ]; then
    echo "❌ .next ディレクトリが見つかりません"
    echo "フロントエンドをビルドしてください:"
    echo "  cd ${FRONTEND_DIR} && npm run build"
    exit 1
fi

echo "✓ .next ディレクトリが存在します"

# ファイル権限を修正
echo "🔐 ファイル権限を修正中..."
sudo chown -R ubuntu:ubuntu "${FRONTEND_DIR}" 2>/dev/null || true
sudo chmod -R 755 "${FRONTEND_DIR}" 2>/dev/null || true
sudo chmod -R 644 "${NEXT_DIR}/static"/* 2>/dev/null || true
sudo find "${NEXT_DIR}/static" -type d -exec chmod 755 {} \; 2>/dev/null || true
sudo find "${NEXT_DIR}/static" -type f -exec chmod 644 {} \; 2>/dev/null || true

echo "✓ ファイル権限を設定しました"

# Nginx設定を確認
echo "📋 Nginx設定を確認中..."
if [ -f "/etc/nginx/sites-available/posl" ]; then
    echo "✓ Nginx設定ファイルが存在します"
    
    # /next/static/ のlocationブロックが存在するか確認
    if grep -q "location /next/static/" /etc/nginx/sites-available/posl; then
        echo "✓ /next/static/ locationブロックが存在します"
    else
        echo "⚠ /next/static/ locationブロックが見つかりません"
        echo "Nginx設定を更新してください"
    fi
    
    # Nginx設定をテスト
    if sudo nginx -t; then
        echo "✓ Nginx設定は正常です"
        sudo systemctl reload nginx
        echo "✓ Nginx再読み込み完了"
    else
        echo "❌ Nginx設定にエラーがあります"
        sudo nginx -t
        exit 1
    fi
else
    echo "❌ Nginx設定ファイルが見つかりません"
    exit 1
fi

# 静的ファイルの存在確認
echo "📦 静的ファイルの存在確認..."
if [ -d "${NEXT_DIR}/static" ]; then
    echo "✓ static ディレクトリが存在します"
    echo "  ディレクトリ内容:"
    ls -la "${NEXT_DIR}/static/" | head -10
    
    # CSSファイルの確認
    CSS_COUNT=$(find "${NEXT_DIR}/static" -name "*.css" | wc -l)
    echo "  CSSファイル数: ${CSS_COUNT}"
    
    # JSファイルの確認
    JS_COUNT=$(find "${NEXT_DIR}/static" -name "*.js" | wc -l)
    echo "  JSファイル数: ${JS_COUNT}"
    
    # フォントファイルの確認
    FONT_COUNT=$(find "${NEXT_DIR}/static" -name "*.woff2" | wc -l)
    echo "  フォントファイル数: ${FONT_COUNT}"
else
    echo "❌ static ディレクトリが見つかりません"
    exit 1
fi

# テスト: 静的ファイルに直接アクセスできるか確認
echo "🧪 静的ファイルアクセステスト..."
if [ -f "${NEXT_DIR}/static/chunks/webpack-9d964d8cb0d81fe9.js" ] || [ -f "${NEXT_DIR}/static/chunks"/*.js ]; then
    echo "✓ テスト用JSファイルが存在します"
    TEST_FILE=$(find "${NEXT_DIR}/static/chunks" -name "*.js" | head -1)
    if [ -n "${TEST_FILE}" ]; then
        echo "  テストファイル: ${TEST_FILE}"
        echo "  権限: $(ls -la "${TEST_FILE}" | awk '{print $1, $3, $4}')"
    fi
fi

echo ""
echo "=== 修正完了 ==="
echo ""
echo "確認事項:"
echo "1. ファイル権限: ubuntu:ubuntu, 755 (dir) / 644 (file)"
echo "2. Nginx設定: /next/static/ locationブロックが存在"
echo "3. 静的ファイル: ${NEXT_DIR}/static/ に存在"
echo ""
echo "まだ403エラーが出る場合は、以下を確認してください:"
echo "1. Nginxのエラーログ: sudo tail -f /var/log/nginx/posl_error.log"
echo "2. ファイルの実際のパス: ls -la ${NEXT_DIR}/static/chunks/"
echo "3. Nginx設定のaliasパス: grep 'alias' /etc/nginx/sites-available/posl"
REMOTE_EOF

echo ""
echo "=== ローカルでの確認 ==="
echo "ブラウザで以下を確認してください:"
echo "1. http://${EC2_HOST}/ にアクセス"
echo "2. 開発者ツールのコンソールで403エラーが解消されているか確認"
echo "3. ネットワークタブで静的ファイルのステータスコードを確認"
echo ""


