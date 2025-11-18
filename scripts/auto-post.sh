#!/bin/bash

# POSL自動投稿スクリプト (Phase 11 Week 2対応)
# 正しいAPIエンドポイント: /dev/post/generate-and-post

LOG_FILE="/home/ubuntu/cron-post.log"
API_URL="http://localhost:3001/dev/post/generate-and-post"

echo "=== $(date): 自動投稿開始 ===" >> $LOG_FILE

cd /home/ubuntu/POSL-repo/backend

# 自動投稿API呼び出し
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo", "scheduledPost": true}' \
  "$API_URL")

echo "API応答: $RESPONSE" >> $LOG_FILE
echo "=== $(date): 自動投稿完了 ===" >> $LOG_FILE
echo "" >> $LOG_FILE