#!/bin/bash

# 投稿ステータス確認スクリプト
# 用途: 設定時刻に投稿が実行されたか確認

set -e

echo "=== 投稿ステータス確認 ==="
echo ""

# 1. 現在の時刻確認
echo "1. 現在の時刻:"
echo "   UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
echo "   JST: $(TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 2. cron設定確認
echo "2. Cron設定:"
CRON_JOB=$(crontab -l 2>/dev/null | grep "enhanced-auto-post" || echo "")
if [ -z "$CRON_JOB" ]; then
    echo "   ❌ Cron設定が見つかりません"
else
    echo "   ✓ 設定済み: $CRON_JOB"
    
    CRON_MINUTE=$(echo "$CRON_JOB" | awk '{print $1}')
    CRON_HOUR=$(echo "$CRON_JOB" | awk '{print $2}')
    JST_HOUR=$(( (CRON_HOUR + 9) % 24 ))
    
    echo "   → UTC時刻: ${CRON_HOUR}:${CRON_MINUTE}"
    echo "   → JST時刻: ${JST_HOUR}:${CRON_MINUTE}"
fi
echo ""

# 3. 最近の自動投稿ログ確認
echo "3. 最近の自動投稿ログ（最後の20行）:"
LOG_FILE="/home/ubuntu/auto-post.log"
if [ -f "$LOG_FILE" ]; then
    echo "   ---"
    tail -20 "$LOG_FILE" | sed 's/^/   /'
    echo "   ---"
else
    echo "   ⚠ ログファイルが見つかりません: $LOG_FILE"
fi
echo ""

# 4. 最近の投稿履歴確認（API経由）
echo "4. 最近の投稿履歴（API経由）:"
if curl -s -f "http://localhost:3001/health" > /dev/null 2>&1; then
    RECENT_POSTS=$(curl -s "http://localhost:3001/api/post/logs?limit=3" 2>/dev/null || echo "")
    if [ -n "$RECENT_POSTS" ]; then
        echo "   ✓ API接続成功"
        # jqが使える場合は整形
        if command -v jq >/dev/null 2>&1; then
            echo "$RECENT_POSTS" | jq -r '.data[] | "   - \(.content // "コンテンツなし") (\(.created_at // .timestamp))"' 2>/dev/null || echo "   ⚠ レスポンス解析エラー"
        else
            echo "   （jqがインストールされていないため、生のレスポンスを表示）"
            echo "$RECENT_POSTS" | head -10 | sed 's/^/   /'
        fi
    else
        echo "   ⚠ APIから投稿履歴を取得できませんでした"
    fi
else
    echo "   ⚠ APIサーバーに接続できません"
fi
echo ""

# 5. cron実行ログ確認
echo "5. 最近のcron実行ログ:"
if [ -f "/var/log/syslog" ]; then
    RECENT_CRON=$(grep -i "enhanced-auto-post\|CRON.*enhanced" /var/log/syslog 2>/dev/null | tail -5 || echo "")
    if [ -n "$RECENT_CRON" ]; then
        echo "   ✓ 最近の実行ログ:"
        echo "$RECENT_CRON" | sed 's/^/      /'
    else
        echo "   ⚠ 最近の実行ログが見つかりません"
    fi
else
    echo "   ⚠ syslogにアクセスできません"
fi
echo ""

# 6. 次の実行予定時刻
echo "6. 次の実行予定時刻:"
if [ -n "$CRON_JOB" ]; then
    CRON_MINUTE=$(echo "$CRON_JOB" | awk '{print $1}')
    CRON_HOUR=$(echo "$CRON_JOB" | awk '{print $2}')
    JST_HOUR=$(( (CRON_HOUR + 9) % 24 ))
    
    CURRENT_UTC_HOUR=$(date -u +%H)
    CURRENT_UTC_MINUTE=$(date -u +%M)
    CURRENT_UTC_TIME="${CURRENT_UTC_HOUR}:${CURRENT_UTC_MINUTE}"
    
    if [ "$CURRENT_UTC_TIME" \< "${CRON_HOUR}:${CRON_MINUTE}" ]; then
        echo "   → 今日の UTC ${CRON_HOUR}:${CRON_MINUTE} (JST ${JST_HOUR}:${CRON_MINUTE})"
    else
        echo "   → 明日の UTC ${CRON_HOUR}:${CRON_MINUTE} (JST ${JST_HOUR}:${CRON_MINUTE})"
    fi
fi
echo ""

echo "=== 確認完了 ==="

