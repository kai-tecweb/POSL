#!/bin/bash

# node-cron実装のデプロイスクリプト
# 用途: 根本解決版の自動投稿機能を本番環境にデプロイ

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

# 設定
EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/ubuntu}"

log_info "=== node-cron実装デプロイ開始 ==="
log_info "EC2 Host: ${EC2_HOST}"

# SSH接続確認
log_info "SSH接続確認中..."
if ! ssh -i "${SSH_KEY}" -o ConnectTimeout=5 "${EC2_USER}@${EC2_HOST}" "echo 'SSH接続成功'" > /dev/null 2>&1; then
    log_error "SSH接続に失敗しました"
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

log_info "📦 ファイルを転送中..."

# 1. simple_final_api.jsを転送
if [ -f "simple_final_api.js" ]; then
    remote_copy "simple_final_api.js" "${DEPLOY_DIR}/"
    log_info "✓ simple_final_api.js 転送完了"
else
    log_error "simple_final_api.js が見つかりません"
    exit 1
fi

# 2. package.jsonを転送（node-cron依存関係のため）
if [ -f "package.json" ]; then
    remote_copy "package.json" "${DEPLOY_DIR}/"
    log_info "✓ package.json 転送完了"
else
    log_error "package.json が見つかりません"
    exit 1
fi

# 3. 依存関係をインストール
log_info "📦 依存関係をインストール中..."
remote_exec "cd ${DEPLOY_DIR} && npm install --production"

# 4. PM2で再起動
log_info "🔄 PM2プロセスを再起動中..."
remote_exec "pm2 delete posl-api 2>/dev/null || true"
remote_exec "cd ${DEPLOY_DIR} && pm2 start simple_final_api.js --name posl-api"
remote_exec "pm2 save"

log_info "✓ PM2プロセス再起動完了"

# 5. 動作確認
log_info "🔍 動作確認中..."

# ヘルスチェック
if remote_exec "curl -s http://localhost:3001/health" | grep -q "ok"; then
    log_info "✓ バックエンドAPI動作確認完了"
else
    log_warn "⚠ バックエンドAPIの動作確認に失敗しました"
fi

# スケジュール設定確認
log_info "📅 スケジュール設定を確認中..."
remote_exec "pm2 logs posl-api --lines 50 | grep -E 'スケジュール|schedule' || echo 'ログを確認してください'"

log_info ""
log_info "=== デプロイ完了 ==="
log_info ""
log_info "次のステップ:"
log_info "1. PM2ログを確認: ssh ${EC2_USER}@${EC2_HOST} 'pm2 logs posl-api'"
log_info "2. スケジュール設定を確認（ログ内の「スケジュール設定完了」メッセージを確認）"
log_info "3. 設定ページで投稿時刻を保存して、スケジュールが即座に反映されることを確認"
log_info "4. 既存のシステムcron設定を無効化（オプション）:"
log_info "   ssh ${EC2_USER}@${EC2_HOST} 'crontab -l | grep -v enhanced-auto-post | crontab -'"
log_info ""

