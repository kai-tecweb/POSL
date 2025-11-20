#!/bin/bash

# POSL AWS EC2 デプロイスクリプト
# 作成日: 2025年11月19日
# 用途: AWS EC2環境への自動デプロイ

set -e

# 色付きログ出力
log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

# 設定（環境変数から取得、デフォルト値あり）
EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/ubuntu}"
BACKEND_DIR="${DEPLOY_DIR}/backend"
FRONTEND_DIR="${DEPLOY_DIR}/frontend"

log_info "=== POSL AWS EC2 デプロイ開始 ==="
log_info "EC2 Host: ${EC2_HOST}"
log_info "Deploy Directory: ${DEPLOY_DIR}"

# SSH接続確認
log_info "SSH接続確認中..."
if ! ssh -i "${SSH_KEY}" -o ConnectTimeout=5 "${EC2_USER}@${EC2_HOST}" "echo 'SSH接続成功'" > /dev/null 2>&1; then
    log_error "SSH接続に失敗しました。以下を確認してください:"
    log_error "1. EC2_HOST=${EC2_HOST} が正しいか"
    log_error "2. SSH_KEY=${SSH_KEY} が存在するか"
    log_error "3. セキュリティグループでSSH(22)が許可されているか"
    exit 1
fi

# リモートコマンド実行関数
remote_exec() {
    ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "$1"
}

# ファイル転送関数
remote_copy() {
    scp -i "${SSH_KEY}" "$1" "${EC2_USER}@${EC2_HOST}:$2"
}

# ディレクトリ転送関数
remote_copy_dir() {
    scp -i "${SSH_KEY}" -r "$1" "${EC2_USER}@${EC2_HOST}:$2"
}

# 1. バックエンドデプロイ
log_info "📦 バックエンドをデプロイ中..."

# simple_final_api.jsを転送
if [ -f "simple_final_api.js" ]; then
    remote_copy "simple_final_api.js" "${DEPLOY_DIR}/"
    log_info "✓ simple_final_api.js 転送完了"
else
    log_error "simple_final_api.js が見つかりません"
    exit 1
fi

# backendディレクトリ作成
remote_exec "mkdir -p ${BACKEND_DIR}"

# backend/package.jsonを転送
if [ -f "backend/package.json" ]; then
    remote_copy "backend/package.json" "${BACKEND_DIR}/"
    log_info "✓ backend/package.json 転送完了"
fi

# PM2設定ファイルを転送
if [ -f "backend/ecosystem.production.config.js" ]; then
    remote_copy "backend/ecosystem.production.config.js" "${BACKEND_DIR}/ecosystem.config.js"
    log_info "✓ PM2設定ファイル転送完了"
fi

# バックエンド依存関係インストール
log_info "📦 バックエンド依存関係をインストール中..."
remote_exec "cd ${BACKEND_DIR} && npm install --production"

# 2. フロントエンドデプロイ
log_info "📦 フロントエンドをデプロイ中..."

# frontendディレクトリ作成
remote_exec "mkdir -p ${FRONTEND_DIR}"

# フロントエンドファイルを転送
if [ -d "frontend/src" ]; then
    log_info "フロントエンドソースを転送中..."
    remote_exec "rm -rf ${FRONTEND_DIR}/src"
    remote_copy_dir "frontend/src" "${FRONTEND_DIR}/"
    log_info "✓ frontend/src 転送完了"
fi

if [ -d "frontend/public" ]; then
    remote_copy_dir "frontend/public" "${FRONTEND_DIR}/"
    log_info "✓ frontend/public 転送完了"
fi

# 設定ファイルを転送
if [ -f "frontend/package.json" ]; then
    remote_copy "frontend/package.json" "${FRONTEND_DIR}/"
fi

if [ -f "frontend/next.config.production.js" ]; then
    remote_copy "frontend/next.config.production.js" "${FRONTEND_DIR}/next.config.js"
    log_info "✓ 本番用Next.js設定を適用"
fi

if [ -f "frontend/tailwind.config.js" ]; then
    remote_copy "frontend/tailwind.config.js" "${FRONTEND_DIR}/"
fi

if [ -f "frontend/postcss.config.js" ]; then
    remote_copy "frontend/postcss.config.js" "${FRONTEND_DIR}/"
fi

if [ -f "frontend/tsconfig.json" ]; then
    remote_copy "frontend/tsconfig.json" "${FRONTEND_DIR}/"
fi

# 本番用API設定を転送
if [ -f "frontend/src/utils/api.production.ts" ]; then
    remote_exec "mkdir -p ${FRONTEND_DIR}/src/utils"
    remote_copy "frontend/src/utils/api.production.ts" "${FRONTEND_DIR}/src/utils/api.ts"
    log_info "✓ 本番用API設定を適用"
fi

# フロントエンド依存関係インストールとビルド
log_info "📦 フロントエンド依存関係をインストール中..."
remote_exec "cd ${FRONTEND_DIR} && npm install"

log_info "🏗️ フロントエンドをビルド中..."
remote_exec "cd ${FRONTEND_DIR} && NODE_ENV=production npm run build"

# 3. スクリプトファイルを転送
log_info "📦 スクリプトファイルを転送中..."
if [ -f "manual-post.sh" ]; then
    remote_copy "manual-post.sh" "${DEPLOY_DIR}/"
    remote_exec "chmod +x ${DEPLOY_DIR}/manual-post.sh"
fi

if [ -f "enhanced-auto-post.sh" ]; then
    remote_copy "enhanced-auto-post.sh" "${DEPLOY_DIR}/"
    remote_exec "chmod +x ${DEPLOY_DIR}/enhanced-auto-post.sh"
fi

# 4. Nginx設定を転送
log_info "📦 Nginx設定を転送中..."
if [ -f "infrastructure/nginx-nextjs-production.conf" ]; then
    remote_exec "sudo cp ${DEPLOY_DIR}/infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl 2>/dev/null || true"
    remote_copy "infrastructure/nginx-nextjs-production.conf" "${DEPLOY_DIR}/nginx-posl.conf"
    log_info "✓ Nginx設定ファイル転送完了"
    log_warn "手動でNginx設定を適用してください:"
    log_warn "  sudo cp ${DEPLOY_DIR}/nginx-posl.conf /etc/nginx/sites-available/posl"
    log_warn "  sudo ln -sf /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/"
    log_warn "  sudo nginx -t && sudo systemctl restart nginx"
fi

# 5. PM2でプロセス再起動
log_info "🔄 PM2プロセスを再起動中..."

# バックエンドAPI再起動
remote_exec "cd ${BACKEND_DIR} && pm2 delete posl-api 2>/dev/null || true"
remote_exec "cd ${BACKEND_DIR} && pm2 start ecosystem.config.js || pm2 start simple_final_api.js --name posl-api --cwd ${BACKEND_DIR}"

# フロントエンド再起動
remote_exec "cd ${FRONTEND_DIR} && pm2 delete posl-frontend 2>/dev/null || true"
remote_exec "cd ${FRONTEND_DIR} && pm2 start npm --name posl-frontend -- start"

# PM2設定を保存
remote_exec "pm2 save"

log_info "✓ PM2プロセス再起動完了"

# 6. 動作確認
log_info "🔍 動作確認中..."

# ヘルスチェック
if remote_exec "curl -s http://localhost:3001/health" | grep -q "ok"; then
    log_info "✓ バックエンドAPI動作確認完了"
else
    log_warn "⚠ バックエンドAPIの動作確認に失敗しました"
fi

# フロントエンド確認
if remote_exec "curl -s http://localhost:3000" | grep -q "POSL"; then
    log_info "✓ フロントエンド動作確認完了"
else
    log_warn "⚠ フロントエンドの動作確認に失敗しました"
fi

log_info ""
log_info "=== デプロイ完了 ==="
log_info ""
log_info "次のステップ:"
log_info "1. 環境変数(.env)が正しく設定されているか確認"
log_info "2. Nginx設定を適用: sudo cp ${DEPLOY_DIR}/nginx-posl.conf /etc/nginx/sites-available/posl"
log_info "3. 動作確認: curl http://${EC2_HOST}/health"
log_info "4. PM2ログ確認: ssh ${EC2_USER}@${EC2_HOST} 'pm2 logs'"
log_info ""

