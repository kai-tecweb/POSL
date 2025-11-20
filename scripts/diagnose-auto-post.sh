#!/bin/bash

# POSL 自動投稿診断スクリプト
# 用途: 自動投稿が動作しない原因を特定

echo "=== POSL 自動投稿診断 ==="
echo ""

# 1. サーバーのタイムゾーン確認
echo "1. サーバーのタイムゾーン:"
echo "   $(date)"
echo "   TZ環境変数: ${TZ:-未設定}"
echo "   /etc/timezone: $(cat /etc/timezone 2>/dev/null || echo 'ファイルなし')"
echo ""

# 2. 現在のcron設定確認
echo "2. 現在のcron設定:"
CRON_JOB=$(crontab -l 2>/dev/null | grep "enhanced-auto-post" || echo "cron設定なし")
if [ "$CRON_JOB" != "cron設定なし" ]; then
    echo "   ✓ 設定済み: $CRON_JOB"
    CRON_MINUTE=$(echo "$CRON_JOB" | awk '{print $1}')
    CRON_HOUR=$(echo "$CRON_JOB" | awk '{print $2}')
    echo "   → 実行時刻: UTC ${CRON_HOUR}:${CRON_MINUTE}"
    # JSTに変換（UTC+9）
    JST_HOUR=$(( (CRON_HOUR + 9) % 24 ))
    echo "   → JST時刻: ${JST_HOUR}:${CRON_MINUTE}"
else
    echo "   ✗ cron設定が見つかりません"
fi
echo ""

# 3. データベースの設定確認
echo "3. データベースの投稿時刻設定:"
if [ -f "/home/ubuntu/.env" ]; then
    source /home/ubuntu/.env
    DB_SETTING=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT setting_data FROM settings WHERE user_id='demo' AND setting_type='post-time';" 2>/dev/null | tail -1)
    if [ -n "$DB_SETTING" ]; then
        echo "   ✓ 設定あり: $DB_SETTING"
    else
        echo "   ✗ データベースに設定が見つかりません"
    fi
else
    echo "   ⚠ .envファイルが見つかりません"
fi
echo ""

# 4. 自動投稿スクリプトの確認
echo "4. 自動投稿スクリプト:"
SCRIPT_PATH="/home/ubuntu/enhanced-auto-post.sh"
if [ -f "$SCRIPT_PATH" ]; then
    echo "   ✓ ファイル存在: $SCRIPT_PATH"
    if [ -x "$SCRIPT_PATH" ]; then
        echo "   ✓ 実行権限あり"
    else
        echo "   ✗ 実行権限なし（chmod +x が必要）"
    fi
else
    echo "   ✗ ファイルが見つかりません: $SCRIPT_PATH"
fi
echo ""

# 5. 最近の自動投稿ログ確認
echo "5. 最近の自動投稿ログ（最後の10行）:"
LOG_FILE="/home/ubuntu/auto-post.log"
if [ -f "$LOG_FILE" ]; then
    echo "   ---"
    tail -10 "$LOG_FILE" | sed 's/^/   /'
    echo "   ---"
else
    echo "   ✗ ログファイルが見つかりません: $LOG_FILE"
fi
echo ""

# 6. cron実行ログ確認
echo "6. 最近のcron実行ログ:"
if [ -f "/var/log/syslog" ]; then
    echo "   ---"
    grep -i "enhanced-auto-post\|CRON" /var/log/syslog | tail -5 | sed 's/^/   /'
    echo "   ---"
else
    echo "   ⚠ syslogにアクセスできません（sudoが必要な場合があります）"
fi
echo ""

# 7. APIサーバーの状態確認
echo "7. APIサーバーの状態:"
if curl -s -f "http://localhost:3001/health" > /dev/null 2>&1; then
    echo "   ✓ APIサーバーは起動中"
else
    echo "   ✗ APIサーバーに接続できません"
fi
echo ""

# 8. 推奨される修正手順
echo "=== 推奨される修正手順 ==="
echo ""
echo "1. cron設定を確認:"
echo "   crontab -l | grep enhanced-auto-post"
echo ""
echo "2. 手動でスクリプトを実行してテスト:"
echo "   /home/ubuntu/enhanced-auto-post.sh"
echo ""
echo "3. cron設定を手動で更新（例: 15:30 JST = 06:30 UTC）:"
echo "   crontab -e"
echo "   30 6 * * * /home/ubuntu/enhanced-auto-post.sh >> /home/ubuntu/auto-post.log 2>&1"
echo ""
echo "4. cronサービスを再起動:"
echo "   sudo service cron restart"
echo ""

