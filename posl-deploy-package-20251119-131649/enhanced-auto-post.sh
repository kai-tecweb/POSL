#!/bin/bash

# POSL 自動投稿スクリプト（改良版）
# 用途: cron で実行される自動投稿
# 作成: 2025年11月19日

set -e

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/auto-post.log"
LOCK_FILE="$SCRIPT_DIR/auto-post.lock"
API_URL="http://localhost:3001"
MAX_RETRY=3
RETRY_DELAY=10

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# エラーハンドリング
error_exit() {
    log "エラー: $1"
    cleanup
    exit 1
}

# クリーンアップ
cleanup() {
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
    fi
}

# ロック制御
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            log "既に自動投稿が実行中です (PID: $pid)"
            exit 0
        else
            log "古いロックファイルを削除します"
            rm -f "$LOCK_FILE"
        fi
    fi
    
    echo $$ > "$LOCK_FILE"
    trap cleanup EXIT
}

# API健全性確認
check_api_health() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRY ]; do
        if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
            log "✓ APIサーバー接続OK"
            return 0
        else
            retry_count=$((retry_count + 1))
            log "✗ APIサーバー接続失敗 (試行 $retry_count/$MAX_RETRY)"
            if [ $retry_count -lt $MAX_RETRY ]; then
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    error_exit "APIサーバーに接続できません"
}

# 投稿実行
execute_auto_post() {
    log "AI投稿を実行中..."
    
    local response
    local http_code
    
    # メインAI投稿APIを呼び出し
    response=$(curl -s -X POST "$API_URL/dev/post/ai-with-x" \
        -H "Content-Type: application/json" \
        -w "\nHTTP_CODE:%{http_code}") || error_exit "API呼び出しでネットワークエラー"
    
    # レスポンス解析
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local body
    body=$(echo "$response" | grep -v "HTTP_CODE:")
    
    if [ "$http_code" = "200" ]; then
        log "✓ AI投稿成功"
        
        # レスポンス内容をログに記録
        if command -v jq >/dev/null 2>&1; then
            echo "$body" | jq . >> "$LOG_FILE"
        else
            echo "$body" >> "$LOG_FILE"
        fi
        
        # 投稿URLを抽出してログに記録
        if command -v jq >/dev/null 2>&1; then
            local tweet_url
            tweet_url=$(echo "$body" | jq -r '.data.tweetUrl // empty' 2>/dev/null)
            if [ -n "$tweet_url" ] && [ "$tweet_url" != "null" ]; then
                log "投稿URL: $tweet_url"
            fi
        fi
        
        return 0
    else
        log "✗ AI投稿失敗 (HTTP $http_code)"
        log "エラーレスポンス: $body"
        return 1
    fi
}

# 投稿時刻確認
check_post_time() {
    log "投稿時刻設定を確認中..."
    
    local response
    response=$(curl -s "$API_URL/dev/settings/post-time") || {
        log "⚠ 投稿時刻確認に失敗（続行します）"
        return 0
    }
    
    if command -v jq >/dev/null 2>&1; then
        local post_time
        post_time=$(echo "$response" | jq -r '.data.post_time // empty' 2>/dev/null)
        if [ -n "$post_time" ] && [ "$post_time" != "null" ]; then
            log "設定投稿時刻: $post_time"
        fi
    fi
}

# システム状態確認
check_system_status() {
    log "システム状態確認中..."
    
    # ディスク使用量確認
    local disk_usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    log "ディスク使用量: ${disk_usage}%"
    
    if [ "$disk_usage" -gt 90 ]; then
        log "⚠ ディスク使用量が90%を超えています"
    fi
    
    # メモリ使用量確認
    if command -v free >/dev/null 2>&1; then
        local mem_usage
        mem_usage=$(free | awk '/^Mem:/ {printf "%.1f", $3/$2*100}')
        log "メモリ使用量: ${mem_usage}%"
    fi
}

# メイン処理
main() {
    log "=== POSL 自動投稿開始 ==="
    
    # ロック取得
    acquire_lock
    
    # システム状態確認
    check_system_status
    
    # 投稿時刻確認
    check_post_time
    
    # API健全性確認
    check_api_health
    
    # 投稿実行
    if execute_auto_post; then
        log "=== 自動投稿完了 ==="
        exit 0
    else
        log "=== 自動投稿失敗 ==="
        exit 1
    fi
}

# メイン処理実行
main "$@"