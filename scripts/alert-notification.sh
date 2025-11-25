#!/bin/bash

# 🚨 POSL Alert Notification System
# Phase 11 Week 5: 監視アラート通知機能

# ================================
# 設定
# ================================
NOTIFICATION_CONFIG="/home/ubuntu/alert-config.conf"
ALERT_HISTORY="/home/ubuntu/alert-history.log"
COOLDOWN_TIME=900  # 15分 (秒)

# アラートレベル定義
declare -A ALERT_COLORS=(
    ["INFO"]="#36a64f"     # 緑
    ["WARNING"]="#ff9500"  # オレンジ
    ["CRITICAL"]="#ff0000" # 赤
)

declare -A ALERT_ICONS=(
    ["INFO"]="✅"
    ["WARNING"]="⚠️"
    ["CRITICAL"]="🚨"
)

# ================================
# 設定ファイル読み込み
# ================================
load_notification_config() {
    if [ -f "$NOTIFICATION_CONFIG" ]; then
        source "$NOTIFICATION_CONFIG"
    else
        echo "警告: 通知設定ファイルが見つかりません ($NOTIFICATION_CONFIG)"
        return 1
    fi
}

# ================================
# クールダウンチェック
# ================================
check_cooldown() {
    local alert_type="$1"
    local current_time=$(date +%s)
    
    if [ -f "$ALERT_HISTORY" ]; then
        local last_alert_time=$(grep "^$alert_type:" "$ALERT_HISTORY" | tail -1 | cut -d: -f2)
        if [ ! -z "$last_alert_time" ]; then
            local time_diff=$((current_time - last_alert_time))
            if [ $time_diff -lt $COOLDOWN_TIME ]; then
                return 1  # クールダウン中
            fi
        fi
    fi
    return 0  # 送信可能
}

# ================================
# アラート履歴記録
# ================================
record_alert() {
    local alert_type="$1"
    local timestamp=$(date +%s)
    echo "$alert_type:$timestamp:$(date)" >> "$ALERT_HISTORY"
}

# ================================
# Slack通知
# ================================
send_slack_notification() {
    local level="$1"
    local title="$2"
    local message="$3"
    local server_info="$4"
    
    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        echo "Slack Webhook URL未設定"
        return 1
    fi
    
    local color="${ALERT_COLORS[$level]}"
    local icon="${ALERT_ICONS[$level]}"
    local timestamp=$(date '+%Y年%m月%d日 %H:%M:%S JST')
    
    local payload=$(cat << EOF
{
    "text": "$icon POSL $level Alert",
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "fields": [
                {
                    "title": "時刻",
                    "value": "$timestamp",
                    "short": true
                },
                {
                    "title": "サーバー",
                    "value": "$server_info",
                    "short": true
                }
            ],
            "footer": "POSL Monitoring System"
        }
    ]
}
EOF
    )
    
    curl -s -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" > /dev/null
    
    echo "Slack通知送信: $level - $title"
}

# ================================
# Discord通知
# ================================
send_discord_notification() {
    local level="$1"
    local title="$2"
    local message="$3"
    local server_info="$4"
    
    if [ -z "$DISCORD_WEBHOOK_URL" ]; then
        echo "Discord Webhook URL未設定"
        return 1
    fi
    
    local icon="${ALERT_ICONS[$level]}"
    local timestamp=$(date '+%Y年%m月%d日 %H:%M:%S JST')
    
    local content="$icon **POSL $level Alert**\\n**$title**\\n$message\\n\\n**時刻**: $timestamp\\n**サーバー**: $server_info"
    
    curl -s -H "Content-Type: application/json" \
        -X POST \
        -d "{\"content\":\"$content\"}" \
        "$DISCORD_WEBHOOK_URL" > /dev/null
    
    echo "Discord通知送信: $level - $title"
}

# ================================
# Email通知
# ================================
send_email_notification() {
    local level="$1"
    local title="$2"
    local message="$3"
    local server_info="$4"
    
    if [ -z "$EMAIL_TO" ]; then
        echo "メールアドレス未設定"
        return 1
    fi
    
    local subject="POSL $level Alert: $title"
    local body=$(cat << EOF
POSL監視アラート通知

レベル: $level
タイトル: $title
メッセージ: $message

サーバー情報: $server_info
時刻: $(date '+%Y年%m月%d日 %H:%M:%S JST')

この通知は自動生成されました。
EOF
    )
    
    echo "$body" | mail -s "$subject" "$EMAIL_TO"
    echo "Email通知送信: $level - $title"
}

# ================================
# メイン通知関数
# ================================
send_alert_notification() {
    local level="$1"
    local alert_type="$2"
    local title="$3"
    local message="$4"
    
    # クールダウンチェック
    if ! check_cooldown "$alert_type"; then
        echo "アラート $alert_type はクールダウン中です (スキップ)"
        return 0
    fi
    
    # 設定読み込み
    if ! load_notification_config; then
        echo "通知設定の読み込みに失敗しました"
        return 1
    fi
    
    local server_info="EC2 ($(curl -s http://checkip.amazonaws.com))"
    
    # 通知送信
    local sent=false
    
    if [ "$ENABLE_SLACK" = "true" ]; then
        send_slack_notification "$level" "$title" "$message" "$server_info"
        sent=true
    fi
    
    if [ "$ENABLE_DISCORD" = "true" ]; then
        send_discord_notification "$level" "$title" "$message" "$server_info"
        sent=true
    fi
    
    if [ "$ENABLE_EMAIL" = "true" ]; then
        send_email_notification "$level" "$title" "$message" "$server_info"
        sent=true
    fi
    
    if [ "$sent" = "true" ]; then
        record_alert "$alert_type"
    else
        echo "有効な通知方法が設定されていません"
    fi
}

# ================================
# 使用例関数
# ================================

# CPU使用率アラート
alert_high_cpu() {
    local cpu_usage="$1"
    send_alert_notification "WARNING" "cpu_high" \
        "CPU使用率高" \
        "CPU使用率が ${cpu_usage}% に達しました (閾値: 80%)"
}

# プロセス停止アラート
alert_process_down() {
    local process_name="$1"
    send_alert_notification "CRITICAL" "process_down" \
        "${process_name} プロセス停止" \
        "${process_name} プロセスが停止しています。自動復旧を試行中..."
}

# API応答遅延アラート
alert_slow_api() {
    local response_time="$1"
    send_alert_notification "WARNING" "api_slow" \
        "API応答遅延" \
        "API応答時間が ${response_time}ms に達しました (閾値: 3000ms)"
}

# システム復旧通知
alert_system_recovered() {
    local component="$1"
    send_alert_notification "INFO" "system_recovered" \
        "システム復旧" \
        "${component} が正常に復旧しました"
}

# ================================
# コマンドライン実行
# ================================
if [ $# -ge 3 ]; then
    send_alert_notification "$1" "$2" "$3" "$4"
else
    echo "使用法: $0 <LEVEL> <TYPE> <TITLE> [MESSAGE]"
    echo "例: $0 CRITICAL process_down 'Serverless停止' 'プロセスが応答しません'"
fi