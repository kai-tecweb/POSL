#!/bin/bash
# 自動投稿設定の検証スクリプト

echo "🔍 自動投稿設定の検証"
echo "===================="

# 投稿時刻設定の確認
echo ""
echo "1. 投稿時刻設定:"
POST_TIME=$(curl -s http://localhost:3001/dev/settings/post-time | jq -r '.data | "\(.hour):\(.minute)"' 2>/dev/null)
if [ -n "$POST_TIME" ] && [ "$POST_TIME" != "null" ]; then
    echo "   ✓ 設定済み: JST $POST_TIME"
else
    echo "   ✗ 設定が見つかりません"
    exit 1
fi

# Cronジョブの確認
echo ""
echo "2. Cronジョブ:"
CRON_JOB=$(crontab -l 2>/dev/null | grep "enhanced-auto-post")
if [ -n "$CRON_JOB" ]; then
    echo "   ✓ 設定済み: $CRON_JOB"
    
    # 時刻の計算
    CRON_TIME=$(echo "$CRON_JOB" | awk '{print $1 ":" $2}')
    echo "   → 実行時刻: UTC $CRON_TIME (JST $(($(echo $CRON_TIME | cut -d: -f1) + 9)):$(echo $CRON_TIME | cut -d: -f2))"
else
    echo "   ✗ Cronジョブが見つかりません"
    exit 1
fi

# 自動投稿スクリプトの確認
echo ""
echo "3. 自動投稿スクリプト:"
if [ -f "/home/ubuntu/enhanced-auto-post.sh" ]; then
    if [ -x "/home/ubuntu/enhanced-auto-post.sh" ]; then
        echo "   ✓ 存在・実行可能"
    else
        echo "   ⚠ 存在するが実行権限なし"
        chmod +x /home/ubuntu/enhanced-auto-post.sh
        echo "   ✓ 実行権限を付与しました"
    fi
else
    echo "   ✗ スクリプトが見つかりません"
    exit 1
fi

# バックエンドAPIサーバーの確認
echo ""
echo "4. バックエンドAPIサーバー:"
if curl -s http://localhost:3001/dev/settings/post-time > /dev/null 2>&1; then
    echo "   ✓ 起動中・応答正常"
else
    echo "   ✗ 起動していないか、応答なし"
    exit 1
fi

# 次回実行時刻の計算
echo ""
echo "5. 次回実行時刻:"
CURRENT_UTC=$(date -u +%H:%M)
CRON_HOUR=$(echo "$CRON_JOB" | awk '{print $2}')
CRON_MINUTE=$(echo "$CRON_JOB" | awk '{print $1}')
SCHEDULED_TIME="${CRON_HOUR}:${CRON_MINUTE}"

if [ "$CURRENT_UTC" \< "$SCHEDULED_TIME" ]; then
    echo "   → 今日の UTC $SCHEDULED_TIME (JST $(($CRON_HOUR + 9)):$CRON_MINUTE)"
else
    echo "   → 明日の UTC $SCHEDULED_TIME (JST $(($CRON_HOUR + 9)):$CRON_MINUTE)"
fi

echo ""
echo "✅ すべての設定が正常です！"
echo "   自動投稿は設定された時刻に実行されます。"

