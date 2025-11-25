#!/bin/bash

# Cron設定の検証スクリプト
# 用途: cron設定が正しく反映されているか確認

set -e

echo "=== Cron設定検証 ==="
echo ""

# 1. 現在のcron設定を確認
echo "1. 現在のcron設定:"
CRON_JOB=$(crontab -l 2>/dev/null | grep "enhanced-auto-post" || echo "")
if [ -z "$CRON_JOB" ]; then
    echo "   ❌ Cron設定が見つかりません"
    exit 1
else
    echo "   ✓ 設定済み: $CRON_JOB"
    
    # cron時刻を抽出
    CRON_MINUTE=$(echo "$CRON_JOB" | awk '{print $1}')
    CRON_HOUR=$(echo "$CRON_JOB" | awk '{print $2}')
    
    echo "   → UTC時刻: ${CRON_HOUR}:${CRON_MINUTE}"
    
    # JSTに変換
    JST_HOUR=$(( (CRON_HOUR + 9) % 24 ))
    echo "   → JST時刻: ${JST_HOUR}:${CRON_MINUTE}"
fi

echo ""

# 2. データベースの設定を確認
echo "2. データベースの設定:"
if [ -f "/home/ubuntu/.env" ]; then
    source /home/ubuntu/.env
    
    DB_SETTING=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT setting_data FROM settings WHERE user_id='demo' AND setting_type='post-time';" 2>/dev/null | tail -1)
    
    if [ -n "$DB_SETTING" ]; then
        echo "   ✓ 設定あり: $DB_SETTING"
        
        # JSONからhourとminuteを抽出
        DB_HOUR=$(echo "$DB_SETTING" | grep -o '"hour":[0-9]*' | grep -o '[0-9]*')
        DB_MINUTE=$(echo "$DB_SETTING" | grep -o '"minute":[0-9]*' | grep -o '[0-9]*')
        
        if [ -n "$DB_HOUR" ] && [ -n "$DB_MINUTE" ]; then
            echo "   → JST時刻: ${DB_HOUR}:${DB_MINUTE}"
            
            # UTCに変換
            EXPECTED_UTC_HOUR=$(( (DB_HOUR - 9 + 24) % 24 ))
            EXPECTED_UTC_MINUTE=$DB_MINUTE
            
            echo "   → 期待されるUTC時刻: ${EXPECTED_UTC_HOUR}:${EXPECTED_UTC_MINUTE}"
            
            # cron設定と比較
            if [ "$CRON_HOUR" = "$EXPECTED_UTC_HOUR" ] && [ "$CRON_MINUTE" = "$EXPECTED_UTC_MINUTE" ]; then
                echo "   ✅ Cron設定とデータベース設定が一致しています"
            else
                echo "   ❌ Cron設定とデータベース設定が一致していません"
                echo "      Cron: ${CRON_HOUR}:${CRON_MINUTE}"
                echo "      期待: ${EXPECTED_UTC_HOUR}:${EXPECTED_UTC_MINUTE}"
                exit 1
            fi
        fi
    else
        echo "   ⚠ データベースに設定が見つかりません"
    fi
else
    echo "   ⚠ .envファイルが見つかりません"
fi

echo ""

# 3. スクリプトの存在と実行権限を確認
echo "3. スクリプトの確認:"
SCRIPT_PATH="/home/ubuntu/enhanced-auto-post.sh"
if [ -f "$SCRIPT_PATH" ]; then
    echo "   ✓ ファイル存在: $SCRIPT_PATH"
    if [ -x "$SCRIPT_PATH" ]; then
        echo "   ✓ 実行権限あり"
    else
        echo "   ❌ 実行権限なし"
        exit 1
    fi
else
    echo "   ❌ ファイルが見つかりません: $SCRIPT_PATH"
    exit 1
fi

echo ""

# 4. cronサービスが起動しているか確認
echo "4. Cronサービスの確認:"
if systemctl is-active --quiet cron || systemctl is-active --quiet crond; then
    echo "   ✓ Cronサービスは起動中"
else
    echo "   ❌ Cronサービスが起動していません"
    exit 1
fi

echo ""

# 5. 最近のcron実行ログを確認
echo "5. 最近のcron実行ログ:"
if [ -f "/var/log/syslog" ]; then
    RECENT_CRON=$(grep -i "enhanced-auto-post\|CRON.*enhanced" /var/log/syslog 2>/dev/null | tail -3 || echo "")
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

echo "=== 検証完了 ==="
echo ""
echo "✅ すべての検証項目を通過しました"

