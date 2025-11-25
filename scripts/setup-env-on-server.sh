#!/bin/bash

# 本番環境の.envファイルを設定するスクリプト

set -e

EC2_HOST="${EC2_HOST:-18.179.104.143}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/posl-production-key.pem}"

echo "=== 本番環境の.envファイル設定 ==="
echo ""
echo "現在の設定を確認中..."

# 現在の.envファイルを確認
CURRENT_ENV=$(ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "cat /home/ubuntu/.env 2>/dev/null || echo 'NOT_FOUND'")

if [ "$CURRENT_ENV" = "NOT_FOUND" ]; then
    echo "⚠ .envファイルが見つかりません"
    echo ""
    echo "以下の情報を入力してください:"
    echo ""
    read -p "MySQL Host (RDSエンドポイント): " MYSQL_HOST
    read -p "MySQL Port [3306]: " MYSQL_PORT
    MYSQL_PORT=${MYSQL_PORT:-3306}
    read -p "MySQL User: " MYSQL_USER
    read -s -p "MySQL Password: " MYSQL_PASSWORD
    echo ""
    read -p "MySQL Database: " MYSQL_DATABASE
    read -p "OpenAI API Key: " OPENAI_API_KEY
    read -p "X API Consumer Key: " X_CONSUMER_KEY
    read -s -p "X API Consumer Secret: " X_CONSUMER_SECRET
    echo ""
    read -p "X API Access Token: " X_ACCESS_TOKEN
    read -s -p "X API Access Token Secret: " X_ACCESS_TOKEN_SECRET
    echo ""
    
    # .envファイルを作成
    ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" << EOF
cat > /home/ubuntu/.env << ENVFILE
MYSQL_HOST=${MYSQL_HOST}
MYSQL_PORT=${MYSQL_PORT}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=${MYSQL_DATABASE}
OPENAI_API_KEY=${OPENAI_API_KEY}
X_CONSUMER_KEY=${X_CONSUMER_KEY}
X_CONSUMER_SECRET=${X_CONSUMER_SECRET}
X_ACCESS_TOKEN=${X_ACCESS_TOKEN}
X_ACCESS_TOKEN_SECRET=${X_ACCESS_TOKEN_SECRET}
ENVFILE
chmod 600 /home/ubuntu/.env
echo "✓ .envファイルを作成しました"
EOF
    
    echo ""
    echo "✅ .envファイルを設定しました"
    echo ""
    echo "PM2を再起動して設定を反映しますか？ (y/n)"
    read -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh -i "${SSH_KEY}" "${EC2_USER}@${EC2_HOST}" "pm2 restart posl-api"
        echo "✅ PM2を再起動しました"
    fi
else
    echo "現在の.envファイル:"
    echo "$CURRENT_ENV" | sed 's/\(PASSWORD\|SECRET\|KEY\)=.*/\1=***/g'
    echo ""
    echo "設定を変更しますか？ (y/n)"
    read -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "上記と同じ手順で設定を更新してください"
    fi
fi

echo ""
echo "=== 完了 ==="

