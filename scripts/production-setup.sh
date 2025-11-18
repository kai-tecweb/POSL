#!/bin/bash

# 🚀 POSL Production Server Setup Script
# Phase 11 Week 2: 本番環境serverless offline設定修正

echo "🔧 POSL本番環境セットアップ開始"

# serverless offline プロセス停止
echo "📦 既存プロセス停止..."
pkill -f "serverless offline" || true
pkill -f "node.*3001" || true
sleep 3

# 作業ディレクトリ移動
cd /home/ubuntu/POSL-repo/backend || exit 1

# 環境変数確認
echo "🔍 環境変数確認:"
if [ -f .env ]; then
    echo "✅ .env ファイル存在"
else
    echo "❌ .env ファイル不存在"
    exit 1
fi

# serverless offline をdev stageで起動
echo "🚀 serverless offline (dev stage) 起動..."
nohup npx serverless offline --stage dev --host 0.0.0.0 --httpPort 3001 > /tmp/serverless-dev.log 2>&1 &

# 起動待機
sleep 10

# プロセス確認
echo "📊 プロセス確認:"
if ps aux | grep -q "[s]erverless.*dev.*3001"; then
    echo "✅ serverless offline (dev stage) 起動確認"
else
    echo "❌ serverless offline 起動失敗"
    echo "ログ確認:"
    tail -n 10 /tmp/serverless-dev.log 2>/dev/null || echo "ログファイルなし"
    exit 1
fi

# API動作確認
echo "🧪 API動作確認:"
sleep 5
API_RESPONSE=$(curl -s "http://localhost:3001/dev/test/health" || echo "API応答なし")
if [[ "$API_RESPONSE" == *"healthy"* ]] || [[ "$API_RESPONSE" == *"success"* ]]; then
    echo "✅ API正常動作確認"
else
    echo "⚠️ API応答: $API_RESPONSE"
fi

echo ""
echo "🎉 POSL本番環境セットアップ完了"
echo "📊 サーバー情報:"
echo "  - Stage: dev"
echo "  - Port: 3001"
echo "  - Host: 0.0.0.0"
echo "  - Endpoint: http://localhost:3001/dev/*"
echo ""
echo "📝 次のステップ:"
echo "  1. auto-post.sh スクリプトテスト: ./auto-post.sh"
echo "  2. cron動作確認: crontab -l"
echo "  3. システム監視確認: ./system-monitor.sh"