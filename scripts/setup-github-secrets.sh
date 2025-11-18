#!/bin/bash

# 🔐 GitHub Secrets 自動設定スクリプト
# Phase 11 Week 2: CI/CD本格運用のための必須Secret設定

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 GitHub Secrets 設定スクリプト開始${NC}"
echo -e "${BLUE}Phase 11 Week 2: CI/CD本格運用準備${NC}"
echo ""

# 基本情報確認
echo -e "${YELLOW}📋 現在の設定値確認:${NC}"
echo "リポジトリ: kai-tecweb/POSL"
echo "ブランチ: main"
echo "AWS Region: ap-northeast-1"
echo "EC2 Public IP: 18.179.104.143"
echo ""

# 必須Secrets一覧
echo -e "${YELLOW}🔐 設定が必要なGitHub Secrets:${NC}"
echo ""

echo -e "${GREEN}🚀 AWS Infrastructure:${NC}"
echo "  AWS_ACCESS_KEY_ID"
echo "  AWS_SECRET_ACCESS_KEY"
echo ""

echo -e "${GREEN}🤖 外部API認証:${NC}"
echo "  OPENAI_API_KEY"
echo "  TWITTER_API_KEY"
echo "  TWITTER_API_SECRET"
echo "  TWITTER_ACCESS_TOKEN"
echo "  TWITTER_ACCESS_TOKEN_SECRET"
echo ""

echo -e "${GREEN}🌐 環境URL設定:${NC}"
echo "  PROD_API_URL: http://18.179.104.143:3001"
echo "  DEV_API_URL: http://18.179.104.143:3001"
echo ""

echo -e "${GREEN}📦 S3/CloudFront設定:${NC}"
echo "  PROD_S3_BUCKET: posl-audio-storage-prod-iwasaki-2024"
echo "  DEV_S3_BUCKET: posl-audio-storage-dev-iwasaki-2024"
echo "  PROD_CLOUDFRONT_ID: (設定予定)"
echo "  DEV_CLOUDFRONT_ID: (設定予定)"
echo ""

echo -e "${GREEN}📢 通知・監視設定:${NC}"
echo "  SLACK_WEBHOOK_URL (オプション)"
echo "  SNYK_TOKEN (オプション)"
echo "  SONAR_TOKEN (オプション)"
echo ""

# 手動設定ガイド
echo -e "${BLUE}🔧 手動設定手順:${NC}"
echo ""
echo "1. GitHub リポジトリ設定ページに移動："
echo "   https://github.com/kai-tecweb/POSL/settings/secrets/actions"
echo ""
echo "2. 'New repository secret' をクリック"
echo ""
echo "3. 以下のSecretsを順次追加："
echo ""

# AWS設定
echo -e "${YELLOW}   AWS_ACCESS_KEY_ID${NC}"
echo "   値: $(aws configure get aws_access_key_id 2>/dev/null || echo '【AWSクレデンシャルファイルから取得】')"
echo ""
echo -e "${YELLOW}   AWS_SECRET_ACCESS_KEY${NC}"
echo "   値: 【AWSクレデンシャルファイルから取得】"
echo ""

# API設定
echo -e "${YELLOW}   PROD_API_URL${NC}"
echo "   値: http://18.179.104.143:3001"
echo ""

echo -e "${YELLOW}   PROD_S3_BUCKET${NC}"
echo "   値: posl-audio-storage-prod-iwasaki-2024"
echo ""

# 外部API（要入力）
echo -e "${YELLOW}   OPENAI_API_KEY${NC}"
echo "   値: sk-proj-... 【OpenAI APIキーを入力】"
echo ""

echo -e "${YELLOW}   TWITTER_API_KEY${NC}"
echo "   値: 【X Developer Portal から取得】"
echo ""

echo -e "${YELLOW}   TWITTER_API_SECRET${NC}"
echo "   値: 【X Developer Portal から取得】"
echo ""

echo -e "${YELLOW}   TWITTER_ACCESS_TOKEN${NC}"
echo "   値: 【X Developer Portal から取得】"
echo ""

echo -e "${YELLOW}   TWITTER_ACCESS_TOKEN_SECRET${NC}"
echo "   値: 【X Developer Portal から取得】"
echo ""

# 設定確認
echo -e "${BLUE}✅ 設定完了後の確認方法:${NC}"
echo ""
echo "1. GitHub Actions タブで動作確認"
echo "2. プッシュして CI/CD パイプライン実行"
echo "3. デプロイ成功の確認"
echo ""

echo -e "${GREEN}🎉 設定完了により24時間CI/CD自動運用体制が確立されます！${NC}"
echo ""
echo -e "${BLUE}📝 詳細ガイド: scripts/github-secrets-setup.md${NC}"

# 現在のGitHub CLI確認
if command -v gh &> /dev/null; then
    echo ""
    echo -e "${BLUE}💡 GitHub CLI利用可能: 'gh secret set SECRET_NAME' でCLI設定も可能${NC}"
fi

echo ""
echo -e "${GREEN}🔐 GitHub Secrets設定スクリプト完了${NC}"