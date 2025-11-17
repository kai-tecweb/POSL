# POSL AWS Infrastructure

このディレクトリには、POSL (Personal Opinion Sharing Life) プロジェクトのAWSインフラストラクチャを管理するTerraformコードが含まれています。

## 📁 ディレクトリ構成

```
terraform/
├── modules/                    # 再利用可能なTerraformモジュール
│   ├── vpc/                   # VPC・ネットワーク設定
│   ├── security/              # セキュリティグループ・IAM設定
│   ├── compute/               # EC2インスタンス設定
│   ├── database/              # RDS MySQL設定
│   └── storage/               # S3バケット設定
├── environments/              # 環境別設定
│   └── production/           # 本番環境設定
├── scripts/                  # デプロイ・管理スクリプト
└── docs/                     # ドキュメント
```

## 🏗️ アーキテクチャ概要

### インフラストラクチャ構成

- **EC2**: Ubuntu 22.04 LTS (t3.medium)
- **RDS**: MySQL 8.0 (db.t3.micro, Single-AZ)
- **S3**: 音声ファイルストレージ
- **VPC**: パブリックサブネット（EC2用）+ プライベートサブネット（RDS用）

### コスト最適化

- 月額推定コスト: **約$60**
- ALB・NAT Gateway未使用でコスト削減
- Single-AZ RDSでコスト削減

### セキュリティ

- セキュリティグループによるネットワーク分離
- IAM最小権限の原則
- S3バケットのパブリックアクセスブロック

## 🚀 デプロイ手順

### 1. 前提条件

- AWS CLI設定済み
- Terraform >= 1.0 インストール済み
- 適切なIAM権限を持つAWSアカウント

### 2. 初期設定

```bash
# リポジトリのクローン
cd /home/iwasaki/work/POSL/terraform

# 設定ファイルの準備
cd environments/production
cp terraform.tfvars.example terraform.tfvars
```

### 3. 設定ファイルの編集

`terraform.tfvars`を編集して、以下の値を設定してください：

```hcl
# EC2キーペア名
key_name = "your-existing-key-pair"

# データベースパスワード
db_password = "your-secure-password"

# S3バケット名（グローバルで一意）
s3_bucket_name = "posl-audio-storage-production-your-unique-name"

# OpenAI APIキー
openai_api_key = "your-openai-api-key"

# X (Twitter) API認証情報
x_api_credentials = {
  consumer_key        = "your-consumer-key"
  consumer_secret     = "your-consumer-secret"
  access_token        = "your-access-token"
  access_token_secret = "your-access-token-secret"
}
```

### 4. Terraformの実行

```bash
# Terraform初期化
terraform init

# 実行プランの確認
terraform plan

# インフラストラクチャの作成
terraform apply
```

### 5. デプロイ後の設定

デプロイ完了後、以下の出力値を確認してください：

- `application_url`: アプリケーションURL
- `ssh_connection`: SSH接続コマンド
- `rds_endpoint`: データベースエンドポイント

## 📋 運用管理

### リソース確認

```bash
# 現在のリソース状態確認
terraform show

# 出力値の確認
terraform output
```

### 設定変更

```bash
# 設定変更後の差分確認
terraform plan

# 変更の適用
terraform apply
```

### リソース削除

```bash
# リソースの削除（注意：データが失われます）
terraform destroy
```

## 🔧 モジュール詳細

### VPCモジュール

- VPC作成（10.0.0.0/16）
- パブリックサブネット（EC2用）
- プライベートサブネット（RDS用）
- インターネットゲートウェイ
- ルートテーブル設定

### セキュリティモジュール

- EC2セキュリティグループ（HTTP/HTTPS/SSH）
- RDSセキュリティグループ（MySQL）
- EC2用IAMロール（S3・RDS・CloudWatch権限）

### コンピュートモジュール

- Ubuntu 22.04 LTS
- t3.medium インスタンス
- Elastic IP
- 自動セットアップスクリプト（Node.js、PM2、Nginx）

### データベースモジュール

- MySQL 8.0
- db.t3.micro
- 自動バックアップ
- パラメータグループ設定

### ストレージモジュール

- S3バケット（音声ファイル用）
- バージョニング有効
- ライフサイクルポリシー
- CORS設定

## 🛡️ セキュリティベストプラクティス

### 本番環境での推奨設定

1. **ネットワークアクセス制限**
   ```hcl
   ec2_allowed_cidr_blocks = ["YOUR_OFFICE_IP/32"]
   ```

2. **S3 CORSオリジン制限**
   ```hcl
   s3_cors_allowed_origins = ["https://yourdomain.com"]
   ```

3. **RDS設定**
   ```hcl
   db_multi_az = true              # 高可用性
   db_deletion_protection = true   # 削除保護
   ```

### セキュリティチェックリスト

- [ ] EC2アクセスが特定IPに制限されている
- [ ] RDSがプライベートサブネットに配置されている
- [ ] S3バケットのパブリックアクセスがブロックされている
- [ ] IAMロールが最小権限の原則に従っている
- [ ] 強固なデータベースパスワードが設定されている

## 📊 コスト分析

### 月額料金内訳（東京リージョン）

| サービス | インスタンス | 月額料金 |
|---------|-------------|---------|
| EC2 | t3.medium | $30.37 |
| Elastic IP | 1個 | $3.65 |
| RDS | db.t3.micro (Single-AZ) | $15.33 |
| EBS | 20GB (gp3) | $2.00 |
| S3 | 標準料金 | $6.00 |
| **合計** | | **約$60** |

### コスト最適化施策

1. **ALB除去**: $23/月 削減
2. **NAT Gateway除去**: $45/月 削減
3. **Single-AZ RDS**: Multi-AZと比較して50%削減

## 🔧 トラブルシューティング

### よくある問題

1. **キーペアが見つからない**
   ```bash
   aws ec2 describe-key-pairs --region ap-northeast-1
   ```

2. **S3バケット名が重複**
   - グローバルで一意な名前に変更

3. **IAM権限不足**
   - EC2、RDS、S3の必要権限を確認

4. **RDS接続エラー**
   - セキュリティグループ設定を確認
   - プライベートサブネット配置を確認

### ログ確認

```bash
# EC2インスタンスログ
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_ELASTIC_IP
sudo journalctl -u your-app

# CloudWatch Logs確認
aws logs describe-log-groups --region ap-northeast-1
```

## 📝 更新履歴

- 2024年: 初期版作成
- アーキテクチャ最適化（コスト削減）
- モジュール化対応

## 🤝 貢献

バグ報告や改善提案は Issue で受け付けています。

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。