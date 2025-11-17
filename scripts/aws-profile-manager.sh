#!/bin/bash

# AWS プロファイル管理スクリプト
# 複数のAWSアクセスキーを簡単に切り替えるためのツール

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 利用可能なプロファイルを表示
show_profiles() {
    echo "=== 利用可能なAWSプロファイル ==="
    aws configure list-profiles 2>/dev/null || echo "プロファイルが見つかりません"
    echo ""
    echo "=== 現在のプロファイル ==="
    echo "プロファイル: ${AWS_PROFILE:-default}"
    aws sts get-caller-identity 2>/dev/null || echo "認証情報が無効です"
}

# プロファイルを設定
set_profile() {
    local profile=$1
    if [ -z "$profile" ]; then
        echo "使用方法: $0 set <profile_name>"
        echo "例: $0 set posl-admin"
        return 1
    fi
    
    export AWS_PROFILE=$profile
    echo "AWS_PROFILE を '$profile' に設定しました"
    echo "現在のセッションでのみ有効です。永続的にするには以下を実行してください："
    echo "echo 'export AWS_PROFILE=$profile' >> ~/.bashrc"
}

# 新しいプロファイルを追加
add_profile() {
    local profile=$1
    local access_key=$2
    local secret_key=$3
    local region=${4:-ap-northeast-1}
    
    if [ -z "$profile" ] || [ -z "$access_key" ] || [ -z "$secret_key" ]; then
        echo "使用方法: $0 add <profile_name> <access_key> <secret_key> [region]"
        echo "例: $0 add posl-admin AKIAXXXXXXXXXXXXXXXX your-secret-key ap-northeast-1"
        return 1
    fi
    
    aws configure set aws_access_key_id "$access_key" --profile "$profile"
    aws configure set aws_secret_access_key "$secret_key" --profile "$profile"
    aws configure set region "$region" --profile "$profile"
    
    echo "プロファイル '$profile' を追加しました"
}

# プロファイルをテスト
test_profile() {
    local profile=${1:-$AWS_PROFILE}
    if [ -z "$profile" ]; then
        profile="default"
    fi
    
    echo "プロファイル '$profile' をテスト中..."
    AWS_PROFILE=$profile aws sts get-caller-identity 2>/dev/null && {
        echo "✅ プロファイル '$profile' は正常に動作します"
        
        # IAM権限をテスト
        echo ""
        echo "=== IAM権限テスト ==="
        AWS_PROFILE=$profile aws iam list-attached-user-policies --user-name $(AWS_PROFILE=$profile aws sts get-caller-identity --query 'Arn' --output text | cut -d'/' -f2) 2>/dev/null && {
            echo "✅ IAM権限あり"
        } || {
            echo "❌ IAM権限なし"
        }
        
        # EC2権限をテスト
        AWS_PROFILE=$profile aws ec2 describe-instances --max-items 1 2>/dev/null >/dev/null && {
            echo "✅ EC2権限あり"
        } || {
            echo "❌ EC2権限なし"
        }
        
        # RDS権限をテスト
        AWS_PROFILE=$profile aws rds describe-db-instances --max-items 1 2>/dev/null >/dev/null && {
            echo "✅ RDS権限あり"
        } || {
            echo "❌ RDS権限なし"
        }
        
    } || {
        echo "❌ プロファイル '$profile' は無効です"
        return 1
    }
}

# Terraformで使用するプロファイルを設定
set_terraform_profile() {
    local profile=${1:-posl-terraform}
    echo "Terraform用プロファイル設定: $profile"
    
    # 現在のディレクトリにプロファイル設定ファイルを作成
    cat > terraform-profile.env << EOF
# Terraform実行用AWS環境変数
# 使用方法: source terraform-profile.env
export AWS_PROFILE=$profile
export TF_VAR_aws_profile=$profile

echo "Terraform用AWSプロファイルを '$profile' に設定しました"
EOF
    
    echo "terraform-profile.env ファイルを作成しました"
    echo "実行前に 'source terraform-profile.env' を実行してください"
}

# ヘルプ表示
show_help() {
    echo "AWS Profile Manager - 複数のAWSアクセスキー管理ツール"
    echo ""
    echo "使用方法:"
    echo "  $0 list                              - プロファイル一覧表示"
    echo "  $0 set <profile>                     - プロファイル設定"
    echo "  $0 add <profile> <key> <secret> [region] - 新しいプロファイル追加"
    echo "  $0 test [profile]                    - プロファイル権限テスト"
    echo "  $0 terraform [profile]               - Terraform用プロファイル設定"
    echo "  $0 help                              - このヘルプ表示"
    echo ""
    echo "例:"
    echo "  $0 list"
    echo "  $0 set posl-admin"
    echo "  $0 add posl-terraform AKIAXXXXX your-secret-key"
    echo "  $0 test posl-terraform"
    echo "  $0 terraform posl-terraform"
}

# メイン処理
case "${1:-help}" in
    "list"|"show")
        show_profiles
        ;;
    "set"|"use")
        set_profile "$2"
        ;;
    "add"|"create")
        add_profile "$2" "$3" "$4" "$5"
        ;;
    "test"|"check")
        test_profile "$2"
        ;;
    "terraform"|"tf")
        set_terraform_profile "$2"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "不明なコマンド: $1"
        show_help
        exit 1
        ;;
esac