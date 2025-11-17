#!/bin/bash

# AWS認証情報更新スクリプト
# 新しいアクセスキー・シークレットキーを設定

echo "=== AWS認証情報更新ツール ==="
echo ""

# 現在の設定を表示
echo "現在のAWS設定:"
aws configure list 2>/dev/null || echo "AWS CLI設定が見つかりません"
echo ""

# 新しい認証情報の入力
read -p "新しいアクセスキー ID を入力してください: " NEW_ACCESS_KEY
read -s -p "新しいシークレットアクセスキーを入力してください: " NEW_SECRET_KEY
echo ""
echo ""

# バックアップ作成
echo "既存の認証情報をバックアップ中..."
cp ~/.aws/credentials ~/.aws/credentials.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "既存ファイルなし"

# 新しい認証情報を設定
echo "新しい認証情報を設定中..."
aws configure set aws_access_key_id "$NEW_ACCESS_KEY"
aws configure set aws_secret_access_key "$NEW_SECRET_KEY"
aws configure set region ap-northeast-1

echo "認証情報が更新されました"
echo ""

# 接続テスト
echo "=== 接続テスト実行中 ==="
aws sts get-caller-identity && {
    echo "✅ AWS認証成功"
    
    # IAMユーザー情報表示
    echo ""
    echo "=== IAMユーザー情報 ==="
    aws iam get-user 2>/dev/null || echo "IAM:GetUser権限がありません"
    
    # 権限テスト
    echo ""
    echo "=== 基本権限テスト ==="
    
    # EC2権限
    aws ec2 describe-instances --max-items 1 --output table 2>/dev/null >/dev/null && {
        echo "✅ EC2権限: あり"
    } || {
        echo "❌ EC2権限: なし"
    }
    
    # S3権限
    aws s3 ls 2>/dev/null >/dev/null && {
        echo "✅ S3権限: あり"
    } || {
        echo "❌ S3権限: なし"
    }
    
    # IAM権限
    aws iam list-roles --max-items 1 2>/dev/null >/dev/null && {
        echo "✅ IAM権限: あり"
    } || {
        echo "❌ IAM権限: なし (Terraform実行には必要)"
    }
    
    # RDS権限  
    aws rds describe-db-instances --max-items 1 2>/dev/null >/dev/null && {
        echo "✅ RDS権限: あり"
    } || {
        echo "❌ RDS権限: なし (Terraform実行には必要)"
    }
    
} || {
    echo "❌ AWS認証失敗"
    echo "アクセスキー・シークレットキーを確認してください"
}

echo ""
echo "=== 次のステップ ==="
echo "1. IAM権限が不足している場合:"
echo "   - AWSコンソールで posl-dev-local-user に PowerUserAccess を追加"
echo "   - または AdministratorAccess を一時的に追加"
echo ""
echo "2. Terraform実行:"
echo "   cd /home/iwasaki/work/POSL/terraform/environments/production"
echo "   terraform plan"
echo "   terraform apply"