#!/bin/bash

# POSL 手動投稿スクリプト
# 用途: 手動での投稿実行（テスト・本番投稿）
# 作成: 2025年11月19日

set -e

# 設定
API_URL="http://localhost:3001"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/manual-post.log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ヘルプ表示
show_help() {
    echo "POSL 手動投稿スクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  (なし) または test    - テスト投稿（DB保存のみ）"
    echo "  post または ai-x     - メインAI投稿（OpenAI + X投稿）"
    echo "  simple-ai または sai - シンプルAI投稿"
    echo "  real                - 事前準備投稿（X投稿試行）"
    echo "  ai                  - 複雑プロンプトAI投稿"
    echo "  help または -h      - このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0                  # テスト投稿"
    echo "  $0 post            # メインAI投稿（推奨）"
    echo "  $0 simple-ai       # シンプルAI投稿"
}

# API接続確認
check_api() {
    log "API接続確認中..."
    if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
        log "✓ APIサーバー接続OK"
        return 0
    else
        log "✗ APIサーバー接続失敗 ($API_URL)"
        log "ヒント: APIサーバーが起動していることを確認してください"
        return 1
    fi
}

# 投稿実行
execute_post() {
    local endpoint="$1"
    local description="$2"
    
    log "$description を実行中..."
    
    # API実行
    local response
    if response=$(curl -s -X POST "$API_URL$endpoint" \
        -H "Content-Type: application/json" \
        -w "\nHTTP_CODE:%{http_code}"); then
        
        # HTTPステータスコード抽出
        local http_code
        http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
        local body
        body=$(echo "$response" | grep -v "HTTP_CODE:")
        
        if [ "$http_code" = "200" ]; then
            log "✓ $description 成功"
            echo "$body" | jq . 2>/dev/null || echo "$body"
            return 0
        else
            log "✗ $description 失敗 (HTTP $http_code)"
            echo "$body"
            return 1
        fi
    else
        log "✗ $description でネットワークエラー"
        return 1
    fi
}

# メイン処理
main() {
    local action="${1:-test}"
    
    case "$action" in
        "test"|"")
            log "=== テスト投稿開始 ==="
            check_api || exit 1
            execute_post "/dev/post/test-generate" "テスト投稿"
            ;;
        "post"|"ai-x")
            log "=== メインAI投稿開始 ==="
            check_api || exit 1
            execute_post "/dev/post/ai-with-x" "メインAI投稿"
            ;;
        "simple-ai"|"sai")
            log "=== シンプルAI投稿開始 ==="
            check_api || exit 1
            execute_post "/dev/post/simple-ai" "シンプルAI投稿"
            ;;
        "real")
            log "=== 事前準備投稿開始 ==="
            check_api || exit 1
            execute_post "/dev/post/real-post" "事前準備投稿"
            ;;
        "ai")
            log "=== 複雑プロンプト投稿開始 ==="
            check_api || exit 1
            execute_post "/dev/post/generate-and-post" "複雑プロンプト投稿"
            ;;
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            echo "エラー: 不明なオプション '$action'"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"