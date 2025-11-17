#!/bin/bash

# POSL Infrastructure Cleanup Script
# 作成したAWSリソースを安全に削除するスクリプト

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
PRODUCTION_DIR="$TERRAFORM_DIR/environments/production"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/cleanup-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

echo "
╔══════════════════════════════════════════════════════════════════════════════╗
║                         ⚠️  DANGER ZONE ⚠️                                  ║
║                    POSL Infrastructure Cleanup                              ║
║                      インフラストラクチャ削除スクリプト                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
"

cd "$PRODUCTION_DIR"

log "⚠️  インフラストラクチャの削除プロセスを開始します"

# 現在のリソース確認
log "現在のリソースを確認しています..."
terraform show > /dev/null 2>&1

if ! terraform state list > /dev/null 2>&1; then
    log "管理されているリソースがありません"
    exit 0
fi

RESOURCE_COUNT=$(terraform state list | wc -l)
log "管理されているリソース数: $RESOURCE_COUNT"

# S3バケットの内容確認
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
if [ -n "$S3_BUCKET" ]; then
    OBJECT_COUNT=$(aws s3api list-objects --bucket "$S3_BUCKET" --query 'length(Contents)' --output text 2>/dev/null || echo "0")
    log "S3バケット ($S3_BUCKET) 内のオブジェクト数: $OBJECT_COUNT"
    
    if [ "$OBJECT_COUNT" -gt 0 ]; then
        log "⚠️  S3バケットにオブジェクトが存在します"
    fi
fi

# データベースバックアップの確認
RDS_INSTANCE=$(terraform state list | grep aws_db_instance || echo "")
if [ -n "$RDS_INSTANCE" ]; then
    log "⚠️  RDSインスタンスが存在します。重要なデータがある場合はバックアップを取得してください"
fi

# 削除の確認（3段階）
echo ""
echo "🚨 この操作により以下のリソースが完全に削除されます:"
echo "   - EC2インスタンス（アプリケーションデータを含む）"
echo "   - RDSデータベース（全てのデータを含む）"
echo "   - S3バケット（全てのファイルを含む）"
echo "   - その他のAWSリソース（VPC、セキュリティグループなど）"
echo ""
echo "⚠️  この操作は取り消しできません！"
echo ""

# 第1段階確認
read -p "本当にすべてのリソースを削除しますか？ (yes/no): " -r
if [ "$REPLY" != "yes" ]; then
    log "削除をキャンセルしました"
    exit 0
fi

# 第2段階確認
echo ""
read -p "⚠️  最終確認: データベースとファイルが完全に失われます。続行しますか？ (YES/no): " -r
if [ "$REPLY" != "YES" ]; then
    log "削除をキャンセルしました"
    exit 0
fi

# 第3段階確認
echo ""
read -p "🔥 最後の確認: 'DELETE EVERYTHING' と正確に入力してください: " -r
if [ "$REPLY" != "DELETE EVERYTHING" ]; then
    log "削除をキャンセルしました"
    exit 0
fi

echo ""
log "削除プロセスを開始します..."

# S3バケットの空にする（必要に応じて）
if [ -n "$S3_BUCKET" ] && [ "$OBJECT_COUNT" -gt 0 ]; then
    log "S3バケットを空にしています..."
    
    read -p "S3バケット内のすべてのオブジェクトを削除しますか？ (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # バージョニングが有効な場合の全削除
        aws s3api list-object-versions --bucket "$S3_BUCKET" --output json | \
            jq -r '.Versions[]?, .DeleteMarkers[]? | select(.Key != null) | "\(.Key) \(.VersionId)"' | \
            while read key version; do
                if [ -n "$version" ] && [ "$version" != "null" ]; then
                    aws s3api delete-object --bucket "$S3_BUCKET" --key "$key" --version-id "$version" > /dev/null
                fi
            done 2>/dev/null || true
        
        # 通常の削除
        aws s3 rm "s3://$S3_BUCKET" --recursive > /dev/null 2>&1 || true
        log "S3バケットを空にしました"
    fi
fi

# Terraform destroy plan の生成
log "削除プランを生成しています..."
terraform plan -destroy -out=destroy.tfplan | tee -a "$LOG_FILE"

# 最終確認
echo ""
read -p "削除プランを確認しました。実行しますか？ (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "削除をキャンセルしました"
    rm -f destroy.tfplan
    exit 0
fi

# リソースの削除実行
log "リソースを削除しています..."
START_TIME=$(date +%s)

terraform apply destroy.tfplan | tee -a "$LOG_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

log "削除完了! 実行時間: ${DURATION_MIN}分${DURATION_SEC}秒"

# 状態確認
REMAINING_RESOURCES=$(terraform state list 2>/dev/null | wc -l || echo "0")
if [ "$REMAINING_RESOURCES" -eq 0 ]; then
    log "✅ 全てのリソースが正常に削除されました"
else
    log_error "⚠️  $REMAINING_RESOURCES 個のリソースが残っています"
    terraform state list | tee -a "$LOG_FILE"
fi

# Terraform状態ファイルのクリーンアップ
if [ -f "terraform.tfstate" ]; then
    log "Terraform状態ファイルをバックアップしています..."
    cp terraform.tfstate "$LOG_DIR/terraform.tfstate.backup-$(date +%Y%m%d-%H%M%S)"
fi

# プランファイルの削除
rm -f destroy.tfplan

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                            🗑️  削除完了 🗑️                                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
log "インフラストラクチャの削除が完了しました"
echo "削除ログ: $LOG_FILE"

# 最終メッセージ
echo ""
log "📝 削除後の確認事項:"
log "1. AWSコンソールでリソースの削除を確認"
log "2. 予想外の課金が発生していないかチェック"
log "3. 必要に応じてTerraform状態ファイルを削除"
log "4. IAMロールやポリシーの手動削除（必要に応じて）"

log "削除スクリプトを終了します"