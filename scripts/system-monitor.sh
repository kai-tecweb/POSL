#!/bin/bash

# 🔍 POSL Production System Monitor
# Phase 11 Week 2: 強化版システム監視スクリプト

LOG_FILE="/home/ubuntu/system-monitor.log"
API_BASE="http://localhost:3001/dev"
TIMESTAMP=$(date '+%Y年%m月%d日 %H:%M:%S %Z')

# ログヘッダー
echo "=== 📊 システム監視 $TIMESTAMP ===" >> $LOG_FILE

# 1. 🖥️ システムリソース監視
echo "💻 システムリソース:" >> $LOG_FILE
# CPU使用率
CPU_USAGE=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)
echo "  CPU使用率: ${CPU_USAGE}%" >> $LOG_FILE

# メモリ使用量
MEMORY_INFO=$(free -h | grep '^Mem:')
echo "  メモリ: $MEMORY_INFO" >> $LOG_FILE

# ディスク使用量
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
echo "  ディスク使用量: $DISK_USAGE" >> $LOG_FILE

# 2. 🚀 アプリケーション監視
echo "🚀 アプリケーションステータス:" >> $LOG_FILE

# Node.js/Serverless プロセス確認
NODE_COUNT=$(ps aux | grep -v grep | grep -c "node.*serverless")
if [ $NODE_COUNT -gt 0 ]; then
    echo "  ✅ Serverless Offline: 稼働中 ($NODE_COUNT プロセス)" >> $LOG_FILE
else
    echo "  ❌ Serverless Offline: 停止中" >> $LOG_FILE
fi

# プロセス詳細
ps aux | grep -v grep | grep "node.*serverless" | while read line; do
    echo "    Process: $line" >> $LOG_FILE
done

# 3. 🌐 API動作確認
echo "🌐 API動作確認:" >> $LOG_FILE

# 投稿ログAPI確認
if curl -s "$API_BASE/post/logs?limit=1" > /dev/null 2>&1; then
    echo "  ✅ Post Logs API: 正常" >> $LOG_FILE
else
    echo "  ❌ Post Logs API: エラー" >> $LOG_FILE
fi

# トレンドAPI確認
if curl -s "$API_BASE/trends/google?limit=1" > /dev/null 2>&1; then
    echo "  ✅ Trends API: 正常" >> $LOG_FILE
else
    echo "  ❌ Trends API: エラー" >> $LOG_FILE
fi

# 4. 📈 パフォーマンス監視
echo "📈 パフォーマンス監視:" >> $LOG_FILE

# API応答時間測定
START_TIME=$(date +%s%3N)
curl -s "$API_BASE/post/logs?limit=1" > /dev/null 2>&1
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))
echo "  API応答時間: ${RESPONSE_TIME}ms" >> $LOG_FILE

# 5. 🚨 アラート条件チェック
echo "🚨 アラート確認:" >> $LOG_FILE

# CPU使用率アラート (80%超過)
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "  ⚠️ 警告: CPU使用率高 (${CPU_USAGE}%)" >> $LOG_FILE
fi

# ディスク使用量アラート (90%超過)
DISK_NUM=$(echo $DISK_USAGE | tr -d '%')
if [ $DISK_NUM -gt 90 ]; then
    echo "  ⚠️ 警告: ディスク使用量高 (${DISK_USAGE})" >> $LOG_FILE
fi

# API応答時間アラート (5秒超過)
if [ $RESPONSE_TIME -gt 5000 ]; then
    echo "  ⚠️ 警告: API応答遅延 (${RESPONSE_TIME}ms)" >> $LOG_FILE
fi

# Serverless プロセス停止アラート
if [ $NODE_COUNT -eq 0 ]; then
    echo "  🚨 エラー: Serverless Offline プロセス停止" >> $LOG_FILE
fi

echo "✅ 監視完了 - $TIMESTAMP" >> $LOG_FILE
echo "---" >> $LOG_FILE