#!/bin/bash

# Cron設定を直接設定するスクリプト
# 用途: APIからcron設定が反映されない場合の緊急対応

set -e

# 引数から時刻を取得（デフォルトは16:10）
TARGET_TIME="${1:-16:10}"
HOUR=$(echo "$TARGET_TIME" | cut -d: -f1)
MINUTE=$(echo "$TARGET_TIME" | cut -d: -f2)

# JSTからUTCに変換
UTC_HOUR=$(( (HOUR - 9 + 24) % 24 ))
UTC_MINUTE=$MINUTE

echo "=== Cron設定を直接設定 ==="
echo ""
echo "設定時刻: JST ${HOUR}:${MINUTE} → UTC ${UTC_HOUR}:${UTC_MINUTE}"
echo ""

# cronコマンドを構築
CRON_CMD="${UTC_MINUTE} ${UTC_HOUR} * * * /home/ubuntu/enhanced-auto-post.sh >> /home/ubuntu/auto-post.log 2>&1"

echo "設定するcronコマンド:"
echo "  ${CRON_CMD}"
echo ""

# 既存のcron設定を取得（enhanced-auto-postを除く）
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -v "enhanced-auto-post" || echo "")

# 新しいcron設定を構築
if [ -n "$EXISTING_CRON" ]; then
    NEW_CRON="${EXISTING_CRON}
${CRON_CMD}"
else
    NEW_CRON="${CRON_CMD}"
fi

echo "新しいcron設定内容:"
echo "---"
echo "$NEW_CRON"
echo "---"
echo ""

# 確認
read -p "この設定でcronを更新しますか？ (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "キャンセルしました"
    exit 0
fi

# crontabに書き込み
echo "$NEW_CRON" | crontab -

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cron設定成功"
    echo ""
    
    # 確認
    echo "設定されたcron:"
    crontab -l | grep "enhanced-auto-post"
    echo ""
    
    # 次の実行予定時刻を表示
    CURRENT_UTC_HOUR=$(date -u +%H)
    CURRENT_UTC_MINUTE=$(date -u +%M)
    CURRENT_UTC_MINUTES=$((CURRENT_UTC_HOUR * 60 + CURRENT_UTC_MINUTE))
    TARGET_UTC_MINUTES=$((UTC_HOUR * 60 + UTC_MINUTE))
    
    if [ $CURRENT_UTC_MINUTES -lt $TARGET_UTC_MINUTES ]; then
        echo "次の実行予定: 今日の UTC ${UTC_HOUR}:${UTC_MINUTE} (JST ${HOUR}:${MINUTE})"
    else
        echo "次の実行予定: 明日の UTC ${UTC_HOUR}:${UTC_MINUTE} (JST ${HOUR}:${MINUTE})"
    fi
else
    echo ""
    echo "❌ Cron設定に失敗しました"
    exit 1
fi

echo ""
echo "=== 完了 ==="

