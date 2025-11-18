#!/bin/bash

# 開発サーバー管理スクリプト
# ポート管理を自動化し、プロセスの起動・停止を簡単にする

# 設定
DEFAULT_PORT=3001
PROJECT_NAME="posl-backend"
PID_FILE="/tmp/${PROJECT_NAME}-dev.pid"

# 色付きログ用関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# ポートが使用中かチェック
check_port() {
    local port=$1
    # lsof と ss の両方で確認
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 使用中
    elif ss -tulpn | grep ":$port " >/dev/null 2>&1; then
        return 0  # 使用中
    else
        return 1  # 使用可能
    fi
}

# 使用可能なポートを見つける
find_available_port() {
    local start_port=$1
    for ((port=$start_port; port<=$start_port+100; port++)); do
        if ! check_port $port; then
            echo $port
            return 0
        fi
    done
    return 1
}

# POSLサーバープロセスを停止
stop_server() {
    log_info "既存のPOSLサーバーを停止中..."
    
    # PIDファイルからプロセスを停止
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            log_info "PID $pid のプロセスを停止中..."
            kill -TERM $pid 2>/dev/null || true
            sleep 3
            if ps -p $pid > /dev/null 2>&1; then
                log_warn "通常停止に失敗。強制停止中..."
                kill -9 $pid 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # serverlessプロセスを検索して停止
    local serverless_pids=$(pgrep -f "serverless offline" 2>/dev/null || true)
    if [ -n "$serverless_pids" ]; then
        log_info "serverless-offlineプロセスを停止中..."
        echo $serverless_pids | xargs kill -TERM 2>/dev/null || true
        sleep 3
        # 再度確認して強制停止
        serverless_pids=$(pgrep -f "serverless offline" 2>/dev/null || true)
        if [ -n "$serverless_pids" ]; then
            echo $serverless_pids | xargs kill -9 2>/dev/null || true
        fi
    fi
    
    # ポート使用中のプロセスを強制停止
    for port in 3001 3002 3003 3004 3005; do
        local port_pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$port_pids" ]; then
            log_warn "ポート $port を使用中のプロセスを停止中..."
            echo $port_pids | xargs kill -TERM 2>/dev/null || true
            sleep 1
            port_pids=$(lsof -ti:$port 2>/dev/null || true)
            if [ -n "$port_pids" ]; then
                echo $port_pids | xargs kill -9 2>/dev/null || true
            fi
        fi
    done
    
    # 待機時間を追加
    sleep 2
    log_info "既存サーバーの停止完了"
}

# サーバーを起動
start_server() {
    log_info "POSLサーバーを起動中..."
    
    # TypeScriptコンパイル
    log_info "TypeScriptコンパイル中..."
    npm run build
    if [ $? -ne 0 ]; then
        log_error "TypeScriptコンパイルに失敗しました"
        exit 1
    fi
    
    # 使用可能なポートを探す
    local port=$(find_available_port $DEFAULT_PORT)
    if [ $? -ne 0 ]; then
        log_error "使用可能なポートが見つかりません"
        exit 1
    fi
    
    log_info "ポート $port でサーバーを起動中..."
    
    # サーバー起動（バックグラウンド）
    nohup npx serverless offline --stage dev --host 0.0.0.0 --httpPort $port > /tmp/${PROJECT_NAME}-dev.log 2>&1 &
    local server_pid=$!
    
    # PID保存
    echo $server_pid > "$PID_FILE"
    
    # サーバー起動確認
    log_info "サーバー起動確認中..."
    for i in {1..30}; do
        sleep 1
        if curl -s "http://localhost:$port/dev" >/dev/null 2>&1 || check_port $port; then
            log_info "✅ サーバーが起動しました！"
            log_info "🌐 URL: http://localhost:$port"
            log_info "📋 API一覧: http://localhost:$port/dev"
            log_info "📝 ログ: tail -f /tmp/${PROJECT_NAME}-dev.log"
            log_info "🛑 停止: $0 stop"
            return 0
        fi
    done
    
    log_error "サーバーの起動に失敗しました"
    stop_server
    exit 1
}

# サーバー状態確認
status_server() {
    # まずポートが使用中かチェック
    local found_port=""
    for port in 3001 3002 3003 3004 3005; do
        if check_port $port; then
            found_port=$port
            break
        fi
    done
    
    if [ -n "$found_port" ]; then
        log_info "✅ POSLサーバーは稼働中です"
        log_info "🌐 ポート $found_port でリッスン中: http://localhost:$found_port"
        
        # PIDファイルの確認（参考情報として）
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE")
            if ps -p $pid > /dev/null 2>&1; then
                log_info "📋 PID: $pid (管理中)"
            else
                log_warn "⚠️  PIDファイルはあるが、プロセスが見つかりません (非管理プロセス)"
            fi
        else
            log_warn "⚠️  PIDファイルがありません (非管理プロセス)"
        fi
        
        # API疎通確認
        if curl -s "http://localhost:$found_port/dev" >/dev/null 2>&1; then
            log_info "✅ API疎通確認成功"
        else
            log_warn "⚠️  API疎通確認失敗"
        fi
        
        return 0
    else
        log_warn "❌ POSLサーバーは停止中です"
        return 1
    fi
}

# ログを表示
show_logs() {
    if [ -f "/tmp/${PROJECT_NAME}-dev.log" ]; then
        tail -f "/tmp/${PROJECT_NAME}-dev.log"
    else
        log_error "ログファイルが見つかりません"
        exit 1
    fi
}

# ヘルプ表示
show_help() {
    echo "POSL開発サーバー管理スクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0 start    - サーバーを起動"
    echo "  $0 stop     - サーバーを停止"
    echo "  $0 restart  - サーバーを再起動"
    echo "  $0 status   - サーバーの状態確認"
    echo "  $0 logs     - ログを表示"
    echo "  $0 help     - このヘルプを表示"
    echo ""
    echo "特徴:"
    echo "  - 自動ポート検出 (3001-3101)"
    echo "  - プロセス管理 (PIDファイル使用)"
    echo "  - 既存プロセス自動停止"
    echo "  - 起動確認とエラーハンドリング"
}

# メイン処理
case "${1:-start}" in
    start)
        stop_server
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        start_server
        ;;
    status)
        status_server
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "不明なコマンド: $1"
        show_help
        exit 1
        ;;
esac