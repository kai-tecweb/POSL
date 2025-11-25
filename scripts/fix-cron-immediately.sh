#!/bin/bash

# 緊急: cron設定を即座に修正するスクリプト
# 用途: 15時40分に設定したのに投稿されない問題を解決

set -e

echo "=== 緊急: Cron設定を修正 ==="
echo ""

# 1. データベースから設定を取得
echo "1. データベースから投稿時刻設定を取得中..."
if [ -f "/home/ubuntu/.env" ]; then
    source /home/ubuntu/.env
    
    DB_SETTING=$(mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT setting_data FROM settings WHERE user_id='demo' AND setting_type='post-time';" 2>/dev/null | tail -1)
    
    if [ -n "$DB_SETTING" ]; then
        echo "   ✓ 設定取得: $DB_SETTING"
        
        # JSONからhourとminuteを抽出（簡単な方法）
        HOUR=$(echo "$DB_SETTING" | grep -o '"hour":[0-9]*' | grep -o '[0-9]*')
        MINUTE=$(echo "$DB_SETTING" | grep -o '"minute":[0-9]*' | grep -o '[0-9]*')
        
        if [ -n "$HOUR" ] && [ -n "$MINUTE" ]; then
            echo "   → JST時刻: ${HOUR}:${MINUTE}"
            
            # JSTからUTCに変換
            CRON_HOUR=$(( (HOUR - 9 + 24) % 24 ))
            CRON_MINUTE=$MINUTE
            
            echo "   → UTC時刻: ${CRON_HOUR}:${CRON_MINUTE}"
            
            # cronコマンドを構築
            CRON_CMD="${CRON_MINUTE} ${CRON_HOUR} * * * /home/ubuntu/enhanced-auto-post.sh >> /home/ubuntu/auto-post.log 2>&1"
            
            echo ""
            echo "2. Cron設定を更新中..."
            
            # 既存のcron設定を削除して新しい設定を追加
            (crontab -l 2>/dev/null | grep -v "enhanced-auto-post" || true; echo "$CRON_CMD") | crontab -
            
            if [ $? -eq 0 ]; then
                echo "   ✓ Cron設定成功"
                
                # 確認
                echo ""
                echo "3. 設定確認:"
                ACTUAL_CRON=$(crontab -l | grep "enhanced-auto-post")
                if [ -n "$ACTUAL_CRON" ]; then
                    echo "   ✓ 設定済み: $ACTUAL_CRON"
                else
                    echo "   ✗ Cron設定が見つかりません"
                    exit 1
                fi
            else
                echo "   ✗ Cron設定に失敗しました"
                exit 1
            fi
        else
            echo "   ✗ hourまたはminuteが取得できませんでした"
            exit 1
        fi
    else
        echo "   ✗ データベースに設定が見つかりません"
        echo "   デフォルト設定（15:40 JST = 06:40 UTC）を使用します"
        
        CRON_CMD="40 6 * * * /home/ubuntu/enhanced-auto-post.sh >> /home/ubuntu/auto-post.log 2>&1"
        (crontab -l 2>/dev/null | grep -v "enhanced-auto-post" || true; echo "$CRON_CMD") | crontab -
        echo "   ✓ デフォルト設定でCronを設定しました"
    fi
else
    echo "   ⚠ .envファイルが見つかりません"
    echo "   デフォルト設定（15:40 JST = 06:40 UTC）を使用します"
    
    CRON_CMD="40 6 * * * /home/ubuntu/enhanced-auto-post.sh >> /home/ubuntu/auto-post.log 2>&1"
    (crontab -l 2>/dev/null | grep -v "enhanced-auto-post" || true; echo "$CRON_CMD") | crontab -
    echo "   ✓ デフォルト設定でCronを設定しました"
fi

echo ""
echo "4. スクリプトの実行権限を確認:"
if [ -f "/home/ubuntu/enhanced-auto-post.sh" ]; then
    if [ -x "/home/ubuntu/enhanced-auto-post.sh" ]; then
        echo "   ✓ 実行権限あり"
    else
        echo "   ⚠ 実行権限なし → 追加中..."
        chmod +x /home/ubuntu/enhanced-auto-post.sh
        echo "   ✓ 実行権限を追加しました"
    fi
else
    echo "   ✗ スクリプトが見つかりません: /home/ubuntu/enhanced-auto-post.sh"
    exit 1
fi

echo ""
echo "5. 手動実行テスト:"
echo "   スクリプトを手動で実行してテストしますか？ (y/n)"
read -t 5 -n 1 TEST_RUN || TEST_RUN="n"
if [ "$TEST_RUN" = "y" ] || [ "$TEST_RUN" = "Y" ]; then
    echo ""
    echo "   実行中..."
    /home/ubuntu/enhanced-auto-post.sh
    echo ""
    echo "   ✓ 実行完了（ログを確認してください: tail -f /home/ubuntu/auto-post.log）"
fi

echo ""
echo "=== 完了 ==="
echo ""
echo "次のステップ:"
echo "1. cron設定を確認: crontab -l | grep enhanced-auto-post"
echo "2. ログを確認: tail -f /home/ubuntu/auto-post.log"
echo "3. cronサービスを再起動（必要に応じて）: sudo service cron restart"

