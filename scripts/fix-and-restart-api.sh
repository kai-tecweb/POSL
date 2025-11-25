#!/bin/bash

# APIサーバーの問題を修正して再起動するスクリプト

set -e

EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"

echo "=== APIサーバー修正・再起動 ==="

# 1. 既存プロセスを停止
echo "1. 既存プロセスを停止中..."
ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" << 'EOF'
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2
echo "✓ プロセス停止完了"
EOF

# 2. APIサーバーを再起動
echo "2. APIサーバーを再起動中..."
ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" << 'EOF'
cd /home/ubuntu
pm2 start simple_final_api.js --name posl-api
pm2 save
sleep 3
echo "✓ APIサーバー再起動完了"
EOF

# 3. 動作確認
echo "3. 動作確認中..."
sleep 2

STATUS=$(ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "pm2 describe posl-api | grep 'status' | awk '{print \$4}'" || echo "unknown")
HEALTH=$(ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "curl -s http://localhost:3001/health" || echo "failed")

echo ""
echo "=== 確認結果 ==="
echo "PM2ステータス: $STATUS"
echo "ヘルスチェック: $HEALTH"

if [ "$STATUS" = "online" ] && echo "$HEALTH" | grep -q "ok"; then
    echo ""
    echo "✅ APIサーバーは正常に動作しています"
    echo ""
    echo "スケジュール設定を確認:"
    ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "pm2 logs posl-api --lines 20 --nostream | grep -E 'スケジュール|schedule|初期化' || echo 'ログを確認してください'"
else
    echo ""
    echo "❌ APIサーバーの起動に問題があります"
    echo ""
    echo "ログを確認:"
    ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "pm2 logs posl-api --lines 30 --nostream"
fi

echo ""
echo "=== 完了 ==="

