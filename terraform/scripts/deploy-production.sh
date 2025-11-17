#!/bin/bash

# POSL AWS Infrastructure Deployment Script
# 本番環境のインフラストラクチャを一括デプロイするスクリプト

set -e

# スクリプトの設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
PRODUCTION_DIR="$TERRAFORM_DIR/environments/production"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"

# ログディレクトリの作成
mkdir -p "$LOG_DIR"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# エラーハンドリング
handle_error() {
    log_error "デプロイ中にエラーが発生しました。ログを確認してください: $LOG_FILE"
    exit 1
}

trap handle_error ERR

# バナー表示
echo "
╔══════════════════════════════════════════════════════════════════════════════╗
║                    POSL AWS Infrastructure Deployment                        ║
║                           本番環境デプロイスクリプト                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

log "POSL本番環境デプロイを開始します"

# 前提条件チェック
log "前提条件をチェックしています..."

# Terraformのチェック
if ! command -v terraform &> /dev/null; then
    log_error "Terraformがインストールされていません"
    exit 1
fi

TERRAFORM_VERSION=$(terraform version -json | jq -r .terraform_version)
log "Terraform バージョン: $TERRAFORM_VERSION"

# AWS CLIのチェック
if ! command -v aws &> /dev/null; then
    log_error "AWS CLIがインストールされていません"
    exit 1
fi

AWS_IDENTITY=$(aws sts get-caller-identity --output table 2>/dev/null)
if [ $? -eq 0 ]; then
    log "AWS認証確認完了:"
    echo "$AWS_IDENTITY" | tee -a "$LOG_FILE"
else
    log_error "AWS認証が設定されていません"
    exit 1
fi

# 作業ディレクトリの確認
if [ ! -d "$PRODUCTION_DIR" ]; then
    log_error "本番環境ディレクトリが見つかりません: $PRODUCTION_DIR"
    exit 1
fi

cd "$PRODUCTION_DIR"
log "作業ディレクトリ: $(pwd)"

# 設定ファイルのチェック
if [ ! -f "terraform.tfvars" ]; then
    log_error "terraform.tfvars ファイルが見つかりません"
    log "terraform.tfvars.example をコピーして設定してください:"
    log "cp terraform.tfvars.example terraform.tfvars"
    exit 1
fi

# 必須設定の確認
check_required_vars() {
    local required_vars=(
        "key_name"
        "db_password" 
        "s3_bucket_name"
        "openai_api_key"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var\s*=" terraform.tfvars; then
            log_error "必須設定 '$var' が terraform.tfvars に設定されていません"
            exit 1
        fi
    done
    
    log "必須設定の確認完了"
}

check_required_vars

# デプロイ確認
echo ""
read -p "本番環境をデプロイしますか？ (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "デプロイをキャンセルしました"
    exit 0
fi

# Terraform初期化
log "Terraform初期化を実行しています..."
terraform init | tee -a "$LOG_FILE"

# フォーマットチェック
log "Terraformコードのフォーマットをチェックしています..."
terraform fmt -check -recursive || {
    log "フォーマットエラーを修正しています..."
    terraform fmt -recursive
}

# バリデーションチェック
log "Terraformコードの検証を行っています..."
terraform validate | tee -a "$LOG_FILE"

# プランの生成
log "実行プランを生成しています..."
terraform plan -out=production.tfplan | tee -a "$LOG_FILE"

# プラン確認
echo ""
read -p "プランを確認しました。実行を続行しますか？ (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "デプロイをキャンセルしました"
    exit 0
fi

# インフラストラクチャの作成
log "インフラストラクチャを作成しています..."
START_TIME=$(date +%s)

terraform apply production.tfplan | tee -a "$LOG_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

log "デプロイ完了! 実行時間: ${DURATION_MIN}分${DURATION_SEC}秒"

# 出力情報の表示
log "デプロイされたリソースの情報を出力しています..."
terraform output | tee -a "$LOG_FILE"

# 接続情報の生成
log "接続情報を生成しています..."

ELASTIC_IP=$(terraform output -raw elastic_ip 2>/dev/null || echo "取得中...")
APP_URL=$(terraform output -raw application_url 2>/dev/null || echo "取得中...")
SSH_CMD=$(terraform output -raw ssh_connection 2>/dev/null || echo "取得中...")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "取得中...")

# 接続情報ファイルの作成
CONNECTION_FILE="$LOG_DIR/connection-info-$(date +%Y%m%d-%H%M%S).txt"
cat > "$CONNECTION_FILE" << EOF
╔══════════════════════════════════════════════════════════════════════════════╗
║                         POSL 本番環境 接続情報                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

デプロイ完了時刻: $(date)

【アプリケーション情報】
・アプリケーションURL: $APP_URL
・Elastic IP: $ELASTIC_IP

【SSH接続】
・接続コマンド: $SSH_CMD
・ポート転送: ssh -L 3000:localhost:3000 -i ~/.ssh/[key-name].pem ubuntu@$ELASTIC_IP

【AWS リソース】
・S3バケット: $S3_BUCKET
・RDSエンドポイント: $(terraform output -raw rds_endpoint 2>/dev/null || echo "取得中...")

【次のステップ】
1. SSH接続してアプリケーションのデプロイを確認
2. アプリケーションの設定ファイルを更新
3. データベースの初期化を実行
4. アプリケーションの動作確認

【重要】
- データベースパスワードは terraform.tfvars で設定したものを使用
- 本番環境のセキュリティ設定を再確認してください
- 定期的なバックアップの設定を確認してください
EOF

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                            🎉 デプロイ完了! 🎉                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
log "デプロイが正常に完了しました!"
echo "接続情報: $CONNECTION_FILE"
echo "ログファイル: $LOG_FILE"
echo ""
echo "接続情報:"
cat "$CONNECTION_FILE"

# cleanup
rm -f production.tfplan

log "デプロイスクリプトを終了します"