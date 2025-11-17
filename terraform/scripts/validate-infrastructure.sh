#!/bin/bash

# POSL Infrastructure Validation Script
# デプロイ後のインフラストラクチャの動作確認を行うスクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
PRODUCTION_DIR="$TERRAFORM_DIR/environments/production"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/validate-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

echo "
╔══════════════════════════════════════════════════════════════════════════════╗
║                    POSL Infrastructure Validation                            ║
║                      インフラストラクチャ検証スクリプト                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

cd "$PRODUCTION_DIR"

log "インフラストラクチャの検証を開始します"

# Terraformリソースの状態確認
log "Terraformリソースの状態を確認しています..."
terraform refresh > /dev/null 2>&1

# 出力値の取得
ELASTIC_IP=$(terraform output -raw elastic_ip 2>/dev/null)
APP_PORT=$(terraform output -raw app_port 2>/dev/null || echo "3000")
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null)
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null)

log "取得した情報:"
log "- Elastic IP: $ELASTIC_IP"
log "- RDS Endpoint: $RDS_ENDPOINT"
log "- S3 Bucket: $S3_BUCKET"

# EC2インスタンスの接続確認
log "EC2インスタンスの接続確認..."
if timeout 10 bash -c "nc -z $ELASTIC_IP 22" > /dev/null 2>&1; then
    log "✅ SSH接続: OK"
else
    log_error "❌ SSH接続: 失敗"
fi

# Webサーバーの確認
log "Webサーバーの応答確認..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$ELASTIC_IP:$APP_PORT" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    log "✅ Webサーバー: OK (HTTP $HTTP_STATUS)"
elif [ "$HTTP_STATUS" = "000" ]; then
    log "⚠️  Webサーバー: 接続タイムアウト（アプリケーションが起動中の可能性があります）"
else
    log "⚠️  Webサーバー: HTTP $HTTP_STATUS"
fi

# RDSの接続確認
log "RDSの接続確認..."
RDS_HOST=$(echo $RDS_ENDPOINT | cut -d: -f1)
RDS_PORT="3306"

if timeout 10 bash -c "nc -z $RDS_HOST $RDS_PORT" > /dev/null 2>&1; then
    log "✅ RDS接続: OK"
else
    log_error "❌ RDS接続: 失敗"
fi

# S3バケットの確認
log "S3バケットの確認..."
if aws s3 ls "s3://$S3_BUCKET" > /dev/null 2>&1; then
    log "✅ S3バケット: アクセス可能"
    
    # S3バケットの設定確認
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "$S3_BUCKET" --query 'Status' --output text 2>/dev/null || echo "None")
    ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$S3_BUCKET" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null || echo "None")
    
    log "  - バージョニング: $VERSIONING"
    log "  - 暗号化: $ENCRYPTION"
else
    log_error "❌ S3バケット: アクセス失敗"
fi

# セキュリティグループの確認
log "セキュリティグループの確認..."
EC2_SG_ID=$(terraform output -raw ec2_security_group_id 2>/dev/null)
RDS_SG_ID=$(terraform output -raw rds_security_group_id 2>/dev/null)

if [ -n "$EC2_SG_ID" ]; then
    EC2_RULES=$(aws ec2 describe-security-groups --group-ids "$EC2_SG_ID" --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`]' --output json)
    if [ "$EC2_RULES" != "[]" ]; then
        log "✅ EC2セキュリティグループ: SSH許可ルールあり"
    else
        log "⚠️  EC2セキュリティグループ: SSH許可ルールが見つかりません"
    fi
fi

# ディスク使用量とメモリ確認（SSH経由）
log "システムリソースの確認..."
if command -v ssh > /dev/null 2>&1; then
    # キーファイルの場所を推測
    KEY_NAME=$(terraform output -raw key_name 2>/dev/null || echo "unknown")
    
    echo "SSH経由でのシステム確認をスキップします（キー設定が必要）"
    log "手動でSSH接続してシステムリソースを確認してください:"
    log "ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$ELASTIC_IP"
fi

# コスト見積もりの表示
log "月額コスト見積もり:"
log "- EC2 (t3.medium): $30.37"
log "- Elastic IP: $3.65"
log "- RDS (db.t3.micro): $15.33"
log "- EBS (20GB): $2.00"
log "- S3: ~$6.00"
log "- 合計: 約$60/月"

# 推奨事項の表示
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                              検証結果サマリー                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

log "🔍 検証完了"

# 推奨事項
echo ""
log "📋 推奨事項:"
log "1. SSH接続してアプリケーションログを確認"
log "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$ELASTIC_IP"
log "   sudo journalctl -u posl-app -f"

log "2. データベース接続テスト"
log "   mysql -h $RDS_HOST -u admin -p"

log "3. S3アップロードテスト"
log "   aws s3 cp test-file.txt s3://$S3_BUCKET/test/"

log "4. アプリケーションの動作確認"
log "   curl http://$ELASTIC_IP:$APP_PORT/health"

log "5. セキュリティ設定の見直し"
log "   - EC2アクセスを特定IPに制限"
log "   - S3 CORSオリジンを特定ドメインに制限"

echo ""
log "検証ログ: $LOG_FILE"