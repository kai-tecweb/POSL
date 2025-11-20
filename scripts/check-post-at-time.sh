#!/bin/bash

# 指定時刻に投稿が実行されたか確認するスクリプト
# 使用方法: ./scripts/check-post-at-time.sh [JST時刻] (例: 16:10)

set -e

TARGET_TIME="${1:-16:10}"
TARGET_HOUR=$(echo "$TARGET_TIME" | cut -d: -f1)
TARGET_MINUTE=$(echo "$TARGET_TIME" | cut -d: -f2)

# UTC時刻に変換
UTC_HOUR=$(( (TARGET_HOUR - 9 + 24) % 24 ))
UTC_MINUTE=$TARGET_MINUTE

echo "=== 投稿実行確認 ==="
echo ""
echo "設定時刻: JST ${TARGET_HOUR}:${TARGET_MINUTE} → UTC ${UTC_HOUR}:${UTC_MINUTE}"
echo ""

# 現在時刻を取得
CURRENT_UTC_HOUR=$(date -u +%H)
CURRENT_UTC_MINUTE=$(date -u +%M)
CURRENT_UTC_TIME="${CURRENT_UTC_HOUR}:${CURRENT_UTC_MINUTE}"
CURRENT_JST_HOUR=$(TZ=Asia/Tokyo date +%H)
CURRENT_JST_MINUTE=$(TZ=Asia/Tokyo date +%M)
CURRENT_JST_TIME="${CURRENT_JST_HOUR}:${CURRENT_JST_MINUTE}"

echo "現在時刻: UTC ${CURRENT_UTC_TIME} / JST ${CURRENT_JST_TIME}"
echo ""

# 時刻の比較
TARGET_UTC_TIME="${UTC_HOUR}:${UTC_MINUTE}"
if [ "$CURRENT_UTC_TIME" \< "$TARGET_UTC_TIME" ]; then
    echo "⏳ まだ実行時刻前です"
    echo "   実行予定: UTC ${TARGET_UTC_TIME} (JST ${TARGET_HOUR}:${TARGET_MINUTE})"
    exit 0
elif [ "$CURRENT_UTC_TIME" = "$TARGET_UTC_TIME" ]; then
    echo "🕐 ちょうど実行時刻です"
    echo "   実行中または実行直後です"
elif [ "$CURRENT_UTC_TIME" \> "$TARGET_UTC_TIME" ]; then
    echo "✅ 実行時刻を過ぎています"
    echo "   実行時刻: UTC ${TARGET_UTC_TIME} (JST ${TARGET_HOUR}:${TARGET_MINUTE})"
fi
echo ""

# cron設定確認
echo "1. Cron設定確認:"
CRON_JOB=$(crontab -l 2>/dev/null | grep "enhanced-auto-post" || echo "")
if [ -z "$CRON_JOB" ]; then
    echo "   ❌ Cron設定が見つかりません"
    echo "   → 手動で設定してください:"
    echo "     crontab -e"
    echo "     ${UTC_MINUTE} ${UTC_HOUR} * * * /home/ubuntu/enhanced-auto-post.sh >> /home/ubuntu/auto-post.log 2>&1"
else
    echo "   ✓ 設定済み: $CRON_JOB"
    
    CRON_MIN=$(echo "$CRON_JOB" | awk '{print $1}')
    CRON_HR=$(echo "$CRON_JOB" | awk '{print $2}')
    
    if [ "$CRON_MIN" = "$UTC_MINUTE" ] && [ "$CRON_HR" = "$UTC_HOUR" ]; then
        echo "   ✅ 時刻も正しく設定されています"
    else
        echo "   ⚠ 時刻が異なります"
        echo "      期待: ${UTC_MINUTE} ${UTC_HOUR}"
        echo "      実際: ${CRON_MIN} ${CRON_HR}"
    fi
fi
echo ""

# ログファイル確認
echo "2. 自動投稿ログ確認:"
LOG_FILE="/home/ubuntu/auto-post.log"
if [ -f "$LOG_FILE" ]; then
    echo "   ✓ ログファイル存在: $LOG_FILE"
    
    # 実行時刻前後のログを確認（±5分）
    TARGET_TIMESTAMP=$(date -u -d "${TARGET_UTC_TIME}" +%s 2>/dev/null || echo "")
    if [ -n "$TARGET_TIMESTAMP" ]; then
        echo "   → 実行時刻前後のログ（±5分）:"
        echo "   ---"
        # 簡易的な時刻マッチング（実際のログ形式に応じて調整が必要）
        grep -E "\[.*\]|$(date -u -d "${TARGET_UTC_TIME}" '+%Y-%m-%d')" "$LOG_FILE" | tail -10 | sed 's/^/      /' || echo "      該当ログなし"
        echo "   ---"
    fi
else
    echo "   ⚠ ログファイルが見つかりません: $LOG_FILE"
fi
echo ""

# 投稿履歴確認
echo "3. 最近の投稿履歴確認:"
if curl -s -f "http://localhost:3001/health" > /dev/null 2>&1; then
    RECENT_POSTS=$(curl -s "http://localhost:3001/api/post/logs?limit=5" 2>/dev/null || echo "")
    if [ -n "$RECENT_POSTS" ]; then
        if command -v jq >/dev/null 2>&1; then
            echo "   ✓ 最近の投稿:"
            echo "$RECENT_POSTS" | jq -r '.data[] | "   - \(.content // "コンテンツなし") (\(.created_at // .timestamp))"' 2>/dev/null | head -3 || echo "   ⚠ レスポンス解析エラー"
        else
            echo "   ✓ API接続成功（jqがインストールされていないため詳細表示なし）"
        fi
    else
        echo "   ⚠ 投稿履歴を取得できませんでした"
    fi
else
    echo "   ⚠ APIサーバーに接続できません（ローカル環境の可能性）"
fi
echo ""

# cron実行ログ確認
echo "4. Cron実行ログ確認:"
if [ -f "/var/log/syslog" ]; then
    # 実行時刻前後のcronログを確認
    TODAY=$(date -u '+%b %d')
    CRON_LOG=$(grep -i "enhanced-auto-post\|CRON.*enhanced" /var/log/syslog 2>/dev/null | grep "$TODAY" | tail -5 || echo "")
    if [ -n "$CRON_LOG" ]; then
        echo "   ✓ 今日の実行ログ:"
        echo "$CRON_LOG" | sed 's/^/      /'
    else
        echo "   ⚠ 今日の実行ログが見つかりません"
    fi
else
    echo "   ⚠ syslogにアクセスできません"
fi
echo ""

echo "=== 確認完了 ==="
echo ""
echo "💡 ヒント:"
echo "   - cron設定がない場合は手動で設定してください"
echo "   - ログをリアルタイムで確認: tail -f /home/ubuntu/auto-post.log"
echo "   - 投稿履歴を確認: curl http://localhost:3001/api/post/logs?limit=5"

