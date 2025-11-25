#!/bin/bash

# 🚀 POSL Enhanced Auto Post System
# Phase 11 Week 4: 自動投稿システム強化版

# ================================
# 設定
# ================================
LOG_FILE="/home/ubuntu/auto-post.log"
ERROR_LOG="/home/ubuntu/auto-post-errors.log"
PERFORMANCE_LOG="/home/ubuntu/auto-post-performance.log"
API_URL="http://localhost:3001/dev/post/generate-and-post"
TIMESTAMP=$(date '+%Y年%m月%d日 %H:%M:%S %Z')
DATE_SHORT=$(date '+%Y-%m-%d %H:%M')

# ログローテーション (10MBを超えた場合)
if [ -f "$LOG_FILE" ] && [ $(stat -c %s "$LOG_FILE") -gt 10485760 ]; then
    cp "$LOG_FILE" "${LOG_FILE}.$(date '+%Y%m%d').backup"
    echo "📁 ログローテーション実行: $(date)" > "$LOG_FILE"
fi

# ================================
# ロックファイルによる重複実行防止
# ================================
LOCK_FILE="/tmp/posl-auto-post.lock"
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE")
    if ps -p "$LOCK_PID" > /dev/null 2>&1; then
        echo "⚠️ 自動投稿スクリプトが既に実行中 (PID: $LOCK_PID) - $TIMESTAMP" >> "$ERROR_LOG"
        exit 1
    else
        rm -f "$LOCK_FILE"
    fi
fi

echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"; exit' INT TERM EXIT

# ================================
# ヘッダーログ
# ================================
echo "================================" >> $LOG_FILE
echo "🚀 Enhanced自動投稿開始: $TIMESTAMP" >> $LOG_FILE
echo "================================" >> $LOG_FILE

# ================================
# 事前チェック
# ================================
echo "📋 事前システムチェック:" >> $LOG_FILE

# 1. 作業ディレクトリ変更
cd /home/ubuntu/backend
if [ $? -eq 0 ]; then
    echo "  ✅ 作業ディレクトリ: /home/ubuntu/backend" >> $LOG_FILE
else
    echo "  ❌ 作業ディレクトリ変更失敗" >> $LOG_FILE
    echo "🚨 DIRECTORY ERROR: Cannot access /home/ubuntu/backend - $(date)" >> $ERROR_LOG
    exit 1
fi

# 2. Serverless Offline稼働確認
NODE_COUNT=$(ps aux | grep -v grep | grep -c "node.*serverless")
if [ $NODE_COUNT -gt 0 ]; then
    echo "  ✅ Serverless Offline: 稼働中 ($NODE_COUNT プロセス)" >> $LOG_FILE
else
    echo "  ❌ Serverless Offline: 停止中" >> $LOG_FILE
    echo "🚨 SERVICE ERROR: Serverless Offline not running - $(date)" >> $ERROR_LOG
    
    # 自動復旧試行
    echo "  🔄 Serverless Offline自動起動試行..." >> $LOG_FILE
    nohup npm exec serverless offline --stage dev --host 0.0.0.0 --httpPort 3001 > /dev/null 2>&1 &
    sleep 10
    
    # 再確認
    NODE_COUNT_RETRY=$(ps aux | grep -v grep | grep -c "node.*serverless")
    if [ $NODE_COUNT_RETRY -gt 0 ]; then
        echo "  ✅ Serverless Offline自動復旧成功" >> $LOG_FILE
    else
        echo "  ❌ Serverless Offline自動復旧失敗" >> $LOG_FILE
        echo "🚨 AUTO RECOVERY FAILED - $(date)" >> $ERROR_LOG
        exit 1
    fi
fi

# 3. API接続テスト
echo "  🌐 API接続テスト..." >> $LOG_FILE
TEST_URL="http://localhost:3001/dev/test/health"
if curl -s --connect-timeout 5 --max-time 10 "$TEST_URL" > /dev/null; then
    echo "  ✅ API接続: 正常" >> $LOG_FILE
else
    echo "  ❌ API接続: 失敗" >> $LOG_FILE
    echo "🚨 API CONNECTION ERROR - $(date)" >> $ERROR_LOG
    exit 1
fi

# ================================
# 投稿実行
# ================================
echo "📝 自動投稿実行:" >> $LOG_FILE

# 実行時間測定開始
START_TIME=$(date +%s)
START_TIME_MS=$(date +%s%3N)

# 投稿データ準備
USER_ID="demo"
REQUEST_DATA="{\"userId\": \"$USER_ID\", \"scheduledPost\": true, \"timestamp\": \"$TIMESTAMP\"}"

echo "  📤 投稿リクエスト送信..." >> $LOG_FILE
echo "  リクエストURL: $API_URL" >> $LOG_FILE
echo "  リクエストデータ: $REQUEST_DATA" >> $LOG_FILE

# API呼び出し（詳細なエラー情報付き）
HTTP_STATUS=$(curl -s -w "%{http_code}" -o /tmp/auto-post-response.json \
  --connect-timeout 30 \
  --max-time 120 \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$REQUEST_DATA" \
  "$API_URL")

# 実行時間測定終了
END_TIME=$(date +%s)
END_TIME_MS=$(date +%s%3N)
EXECUTION_TIME=$((END_TIME - START_TIME))
RESPONSE_TIME=$((END_TIME_MS - START_TIME_MS))

# レスポンス内容取得
if [ -f "/tmp/auto-post-response.json" ]; then
    RESPONSE_CONTENT=$(cat /tmp/auto-post-response.json)
else
    RESPONSE_CONTENT="レスポンスファイル未作成"
fi

# ================================
# 結果解析・ログ記録
# ================================
echo "📊 実行結果:" >> $LOG_FILE
echo "  HTTP Status: $HTTP_STATUS" >> $LOG_FILE
echo "  実行時間: ${EXECUTION_TIME}秒 (${RESPONSE_TIME}ms)" >> $LOG_FILE
echo "  APIレスポンス: $RESPONSE_CONTENT" >> $LOG_FILE

# 成功・失敗判定
if [ "$HTTP_STATUS" = "200" ]; then
    # 成功時の詳細ログ
    echo "  ✅ 投稿成功" >> $LOG_FILE
    
    # レスポンス内容の解析
    if echo "$RESPONSE_CONTENT" | jq -e '.success' > /dev/null 2>&1; then
        GENERATED_TEXT=$(echo "$RESPONSE_CONTENT" | jq -r '.data.generatedText // "N/A"')
        POST_ID=$(echo "$RESPONSE_CONTENT" | jq -r '.data.postId // "N/A"')
        echo "  📝 生成テキスト: $GENERATED_TEXT" >> $LOG_FILE
        echo "  🆔 投稿ID: $POST_ID" >> $LOG_FILE
        
        # 成功統計
        echo "$(date '+%Y-%m-%d %H:%M:%S'),SUCCESS,$RESPONSE_TIME,$HTTP_STATUS,$POST_ID" >> $PERFORMANCE_LOG
    else
        echo "  ⚠️ APIは成功したが、レスポンス構造に問題あり" >> $LOG_FILE
        echo "🔍 API SUCCESS BUT INVALID RESPONSE: $RESPONSE_CONTENT - $(date)" >> $ERROR_LOG
    fi
    
    SUCCESS_MESSAGE="✅ 自動投稿成功 - $TIMESTAMP (実行時間: ${EXECUTION_TIME}s)"
    echo "$SUCCESS_MESSAGE" >> $LOG_FILE
    
else
    # 失敗時の詳細ログ
    echo "  ❌ 投稿失敗 (HTTP: $HTTP_STATUS)" >> $LOG_FILE
    echo "  エラー内容: $RESPONSE_CONTENT" >> $LOG_FILE
    
    # エラー統計
    echo "$(date '+%Y-%m-%d %H:%M:%S'),ERROR,$RESPONSE_TIME,$HTTP_STATUS,$RESPONSE_CONTENT" >> $PERFORMANCE_LOG
    
    # 詳細エラーログ
    ERROR_MESSAGE="🚨 AUTO POST FAILED - HTTP:$HTTP_STATUS - Time:${EXECUTION_TIME}s - $(date)"
    echo "$ERROR_MESSAGE" >> $ERROR_LOG
    echo "Response: $RESPONSE_CONTENT" >> $ERROR_LOG
    
    FAILURE_MESSAGE="❌ 自動投稿失敗 - $TIMESTAMP (HTTP: $HTTP_STATUS, 実行時間: ${EXECUTION_TIME}s)"
    echo "$FAILURE_MESSAGE" >> $LOG_FILE
fi

# ================================
# システム状態記録
# ================================
echo "📈 システム状態:" >> $LOG_FILE

# メモリ使用量
MEMORY_INFO=$(free -h | grep '^Mem:' | awk '{print "使用:" $3 "/" $2}')
echo "  メモリ: $MEMORY_INFO" >> $LOG_FILE

# CPU負荷
LOAD_AVERAGE=$(uptime | awk -F'load average:' '{print $2}')
echo "  システム負荷:$LOAD_AVERAGE" >> $LOG_FILE

# ディスク使用量
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
echo "  ディスク使用率: $DISK_USAGE" >> $LOG_FILE

# ================================
# 統計情報
# ================================
if [ -f "$PERFORMANCE_LOG" ]; then
    echo "📊 投稿統計 (過去24時間):" >> $LOG_FILE
    
    # 過去24時間のログフィルタ
    YESTERDAY=$(date -d '24 hours ago' '+%Y-%m-%d %H:%M:%S')
    
    # 成功数
    SUCCESS_COUNT=$(awk -F',' -v since="$YESTERDAY" '$1 >= since && $2 == "SUCCESS" {count++} END {print count+0}' "$PERFORMANCE_LOG")
    
    # 失敗数
    ERROR_COUNT=$(awk -F',' -v since="$YESTERDAY" '$1 >= since && $2 == "ERROR" {count++} END {print count+0}' "$PERFORMANCE_LOG")
    
    # 平均応答時間
    AVG_RESPONSE=$(awk -F',' -v since="$YESTERDAY" '$1 >= since {sum+=$3; count++} END {print (count > 0) ? int(sum/count) : 0}' "$PERFORMANCE_LOG")
    
    echo "  成功: $SUCCESS_COUNT 回 | 失敗: $ERROR_COUNT 回 | 平均応答: ${AVG_RESPONSE}ms" >> $LOG_FILE
    
    # 成功率計算
    TOTAL_ATTEMPTS=$((SUCCESS_COUNT + ERROR_COUNT))
    if [ $TOTAL_ATTEMPTS -gt 0 ]; then
        SUCCESS_RATE=$(echo "scale=1; $SUCCESS_COUNT * 100 / $TOTAL_ATTEMPTS" | bc)
        echo "  成功率: ${SUCCESS_RATE}%" >> $LOG_FILE
    fi
fi

# ================================
# クリーンアップ・終了
# ================================
echo "🧹 クリーンアップ:" >> $LOG_FILE

# 一時ファイル削除
rm -f /tmp/auto-post-response.json
echo "  ✅ 一時ファイル削除完了" >> $LOG_FILE

# 古いログファイルクリーンアップ (7日以上古いファイル削除)
find /home/ubuntu -name "*.log.*.backup" -mtime +7 -delete 2>/dev/null
echo "  ✅ 古いバックアップログ削除完了" >> $LOG_FILE

echo "================================" >> $LOG_FILE
echo "🏁 Enhanced自動投稿完了: $(date '+%Y年%m月%d日 %H:%M:%S %Z')" >> $LOG_FILE
echo "================================" >> $LOG_FILE
echo "" >> $LOG_FILE

# ロックファイル削除（trapで自動実行される）
exit 0