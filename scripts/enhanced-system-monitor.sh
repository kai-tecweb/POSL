#!/bin/bash

# 🔍 POSL Production Enhanced System Monitor
# Phase 11 Week 4: 24時間運用監視強化版

# ================================
# 設定とログファイル
# ================================
LOG_FILE="/home/ubuntu/system-monitor.log"
ERROR_LOG="/home/ubuntu/system-errors.log"
PERFORMANCE_LOG="/home/ubuntu/performance.log"
API_BASE="http://localhost:3001/dev"
TIMESTAMP=$(date '+%Y年%m月%d日 %H:%M:%S %Z')
DATE_SHORT=$(date '+%Y-%m-%d')

# ログローテーション (5MBを超えた場合)
if [ -f "$LOG_FILE" ] && [ $(stat -c %s "$LOG_FILE") -gt 5242880 ]; then
    cp "$LOG_FILE" "${LOG_FILE}.${DATE_SHORT}.backup"
    echo "📁 ログローテーション実行: $(date)" > "$LOG_FILE"
fi

# ================================
# ログヘッダー
# ================================
echo "=== 📊 Enhanced システム監視 $TIMESTAMP ===" >> $LOG_FILE

# ================================
# 1. 🖥️ システムリソース詳細監視
# ================================
echo "💻 システムリソース詳細:" >> $LOG_FILE

# CPU情報
CPU_USAGE=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)
CPU_CORES=$(nproc)
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{print $2}')
echo "  CPU使用率: ${CPU_USAGE}% (${CPU_CORES}コア)" >> $LOG_FILE
echo "  負荷平均:$LOAD_AVERAGE" >> $LOG_FILE

# メモリ詳細
MEMORY_INFO=$(free -h | grep '^Mem:')
MEMORY_TOTAL=$(free -h | grep '^Mem:' | awk '{print $2}')
MEMORY_USED=$(free -h | grep '^Mem:' | awk '{print $3}')
MEMORY_FREE=$(free -h | grep '^Mem:' | awk '{print $4}')
echo "  メモリ: 総容量:$MEMORY_TOTAL 使用:$MEMORY_USED 空き:$MEMORY_FREE" >> $LOG_FILE

# ディスク詳細
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_AVAILABLE=$(df -h / | tail -1 | awk '{print $4}')
echo "  ディスク: 使用率:$DISK_USAGE 使用:$DISK_USED 利用可能:$DISK_AVAILABLE" >> $LOG_FILE

# ネットワーク接続数
CONNECTIONS=$(netstat -tun | wc -l)
echo "  ネットワーク接続数: $CONNECTIONS" >> $LOG_FILE

# ================================
# 2. 🚀 アプリケーション詳細監視
# ================================
echo "🚀 アプリケーション詳細:" >> $LOG_FILE

# Serverless Offline監視
NODE_PROCESSES=$(ps aux | grep -v grep | grep "node.*serverless")
NODE_COUNT=$(echo "$NODE_PROCESSES" | grep -c .)

if [ $NODE_COUNT -gt 0 ]; then
    echo "  ✅ Serverless Offline: 稼働中 ($NODE_COUNT プロセス)" >> $LOG_FILE
    
    # プロセスメモリ使用量
    while read -r line; do
        if [ ! -z "$line" ]; then
            PID=$(echo "$line" | awk '{print $2}')
            MEM=$(echo "$line" | awk '{print $6}')
            echo "    PID:$PID メモリ:${MEM}KB" >> $LOG_FILE
        fi
    done <<< "$NODE_PROCESSES"
else
    echo "  ❌ Serverless Offline: 停止中" >> $LOG_FILE
    echo "🚨 CRITICAL: Serverless Offline プロセス停止 - $(date)" >> $ERROR_LOG
fi

# Nginx監視
NGINX_STATUS=$(systemctl is-active nginx)
echo "  Nginx: $NGINX_STATUS" >> $LOG_FILE

# MySQL接続監視
MYSQL_STATUS="不明"
if cd /home/ubuntu/backend && timeout 10s node -e "const { MySQLHelper } = require('./dist/libs/mysql.js'); require('dotenv').config(); MySQLHelper.query('SELECT 1').then(() => console.log('OK')).catch(() => process.exit(1));" &>/dev/null; then
    MYSQL_STATUS="正常"
else
    MYSQL_STATUS="エラー"
    echo "🚨 MySQL接続エラー - $(date)" >> $ERROR_LOG
fi
echo "  MySQL接続: $MYSQL_STATUS" >> $LOG_FILE

# ================================
# 3. 🌐 API総合監視
# ================================
echo "🌐 API総合監視:" >> $LOG_FILE

# API応答時間とステータス監視
declare -A api_endpoints=(
    ["投稿ログ"]="/post/logs"
    ["GoogleTrends"]="/trends/google"
    ["エラーログ"]="/errors/logs"
    ["トレンド取得"]="/trends/fetch"
)

for api_name in "${!api_endpoints[@]}"; do
    endpoint="${api_endpoints[$api_name]}"
    
    # 応答時間測定
    START_TIME=$(date +%s%3N)
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE$endpoint" --connect-timeout 10 --max-time 30)
    END_TIME=$(date +%s%3N)
    RESPONSE_TIME=$((END_TIME - START_TIME))
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "  ✅ $api_name: 正常 (${RESPONSE_TIME}ms)" >> $LOG_FILE
    else
        echo "  ❌ $api_name: エラー HTTP:$HTTP_STATUS (${RESPONSE_TIME}ms)" >> $LOG_FILE
        echo "🚨 API ERROR: $api_name - HTTP:$HTTP_STATUS - $(date)" >> $ERROR_LOG
    fi
    
    # パフォーマンスログ記録
    echo "$(date '+%Y-%m-%d %H:%M:%S'),$api_name,$RESPONSE_TIME,$HTTP_STATUS" >> $PERFORMANCE_LOG
done

# ================================
# 4. 📈 パフォーマンス分析
# ================================
echo "📈 パフォーマンス分析:" >> $LOG_FILE

# 過去1時間の平均応答時間
if [ -f "$PERFORMANCE_LOG" ]; then
    ONE_HOUR_AGO=$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')
    AVG_RESPONSE=$(awk -F',' -v since="$ONE_HOUR_AGO" '$1 >= since {sum+=$3; count++} END {print (count > 0) ? int(sum/count) : 0}' "$PERFORMANCE_LOG")
    echo "  過去1時間平均API応答時間: ${AVG_RESPONSE}ms" >> $LOG_FILE
fi

# システム稼働時間
UPTIME=$(uptime -p)
echo "  システム稼働時間: $UPTIME" >> $LOG_FILE

# ================================
# 5. 🚨 強化アラートシステム
# ================================
echo "🚨 アラートチェック:" >> $LOG_FILE
ALERT_COUNT=0

# CPU使用率アラート (80%超過)
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "  ⚠️ 警告: CPU使用率高 (${CPU_USAGE}%)" >> $LOG_FILE
    echo "🔥 HIGH CPU: ${CPU_USAGE}% - $(date)" >> $ERROR_LOG
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# メモリ使用率アラート (85%超過)
MEMORY_PERCENT=$(free | grep '^Mem:' | awk '{printf("%.0f", ($3/$2)*100)}')
if [ $MEMORY_PERCENT -gt 85 ]; then
    echo "  ⚠️ 警告: メモリ使用率高 (${MEMORY_PERCENT}%)" >> $LOG_FILE
    echo "💾 HIGH MEMORY: ${MEMORY_PERCENT}% - $(date)" >> $ERROR_LOG
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# ディスク使用量アラート (90%超過)
DISK_NUM=$(echo $DISK_USAGE | tr -d '%')
if [ $DISK_NUM -gt 90 ]; then
    echo "  ⚠️ 警告: ディスク使用量高 (${DISK_USAGE})" >> $LOG_FILE
    echo "💿 HIGH DISK: ${DISK_USAGE} - $(date)" >> $ERROR_LOG
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# 負荷平均アラート (CPUコア数の2倍超過)
LOAD_1MIN=$(echo $LOAD_AVERAGE | awk '{print $1}' | tr -d ',')
LOAD_THRESHOLD=$(echo "$CPU_CORES * 2" | bc)
if (( $(echo "$LOAD_1MIN > $LOAD_THRESHOLD" | bc -l) )); then
    echo "  ⚠️ 警告: システム負荷高 (${LOAD_1MIN})" >> $LOG_FILE
    echo "⚡ HIGH LOAD: ${LOAD_1MIN} - $(date)" >> $ERROR_LOG
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# API応答時間アラート (複数API平均3秒超過)
if [ ! -z "$AVG_RESPONSE" ] && [ $AVG_RESPONSE -gt 3000 ]; then
    echo "  ⚠️ 警告: API応答遅延 (平均${AVG_RESPONSE}ms)" >> $LOG_FILE
    echo "🐌 SLOW API: Average ${AVG_RESPONSE}ms - $(date)" >> $ERROR_LOG
    ALERT_COUNT=$((ALERT_COUNT + 1))
fi

# 総合ステータス
if [ $ALERT_COUNT -eq 0 ]; then
    echo "  ✅ 全システム正常稼働" >> $LOG_FILE
else
    echo "  🚨 アクティブアラート: $ALERT_COUNT 件" >> $LOG_FILE
fi

# ================================
# 6. 📊 サマリー出力
# ================================
echo "📊 監視サマリー:" >> $LOG_FILE
echo "  チェック時刻: $TIMESTAMP" >> $LOG_FILE
echo "  CPU: ${CPU_USAGE}% | メモリ: ${MEMORY_PERCENT}% | ディスク: $DISK_USAGE" >> $LOG_FILE
echo "  Serverless: $([ $NODE_COUNT -gt 0 ] && echo "稼働" || echo "停止") | MySQL: $MYSQL_STATUS | Nginx: $NGINX_STATUS" >> $LOG_FILE
echo "  アラート数: $ALERT_COUNT" >> $LOG_FILE

echo "✅ Enhanced監視完了 - $TIMESTAMP" >> $LOG_FILE
echo "---" >> $LOG_FILE

# ================================
# 7. 緊急時自動復旧
# ================================
if [ $NODE_COUNT -eq 0 ]; then
    echo "🔄 緊急時自動復旧: Serverless Offline再起動試行" >> $LOG_FILE
    echo "🔄 AUTO RECOVERY ATTEMPT: Serverless restart - $(date)" >> $ERROR_LOG
    
    cd /home/ubuntu/backend
    nohup npm exec serverless offline --stage dev --host 0.0.0.0 --httpPort 3001 > /dev/null 2>&1 &
    sleep 5
    
    # 再起動確認
    NEW_NODE_COUNT=$(ps aux | grep -v grep | grep -c "node.*serverless")
    if [ $NEW_NODE_COUNT -gt 0 ]; then
        echo "✅ 自動復旧成功: Serverless Offline再起動" >> $LOG_FILE
        echo "✅ AUTO RECOVERY SUCCESS - $(date)" >> $ERROR_LOG
    else
        echo "❌ 自動復旧失敗: 手動対応が必要" >> $LOG_FILE
        echo "❌ AUTO RECOVERY FAILED - $(date)" >> $ERROR_LOG
    fi
fi