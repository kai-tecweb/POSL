# 基本設定
variable "aws_region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "プロジェクト名"
  type        = string
  default     = "posl"
}

# ネットワーク設定
variable "vpc_cidr" {
  description = "VPC CIDR ブロック"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "パブリックサブネット CIDR ブロック"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "database_subnet_cidrs" {
  description = "データベースサブネット CIDR ブロック"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# EC2設定
variable "key_name" {
  description = "EC2キーペア名"
  type        = string
}

variable "ec2_allowed_cidr_blocks" {
  description = "EC2アクセス許可CIDR"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # 本番環境では特定のIPに制限することを推奨
}

# アプリケーション設定
variable "app_port" {
  description = "アプリケーションポート"
  type        = number
  default     = 3000
}

# データベース設定
variable "db_engine_version" {
  description = "MySQL エンジンバージョン"
  type        = string
  default     = "8.0.39"
}

variable "db_allocated_storage" {
  description = "初期ストレージサイズ (GB)"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "最大ストレージサイズ (GB)"
  type        = number
  default     = 30
}

variable "db_name" {
  description = "データベース名"
  type        = string
  default     = "posl_db"
}

variable "db_username" {
  description = "データベースユーザー名"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "データベースパスワード"
  type        = string
  sensitive   = true
}

variable "db_multi_az" {
  description = "Multi-AZ配置（本番環境では true を推奨）"
  type        = bool
  default     = false  # コスト削減のため false、必要に応じて true に変更
}

variable "db_backup_retention_period" {
  description = "バックアップ保持期間（日）"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "バックアップウィンドウ"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "メンテナンスウィンドウ"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "db_deletion_protection" {
  description = "削除保護（本番環境では true を推奨）"
  type        = bool
  default     = true
}

variable "db_enhanced_monitoring" {
  description = "拡張監視"
  type        = bool
  default     = false  # コスト削減のため false
}

# S3設定
variable "s3_bucket_name" {
  description = "S3バケット名（グローバルで一意である必要があります）"
  type        = string
}

variable "s3_versioning_enabled" {
  description = "S3バージョニング有効化"
  type        = bool
  default     = true
}

variable "s3_lifecycle_enabled" {
  description = "S3ライフサイクル管理有効化"
  type        = bool
  default     = true
}

variable "s3_ia_days" {
  description = "Infrequent Accessに移行する日数"
  type        = number
  default     = 30
}

variable "s3_glacier_days" {
  description = "Glacierに移行する日数"
  type        = number
  default     = 90
}

variable "s3_expiration_days" {
  description = "オブジェクトを削除する日数"
  type        = number
  default     = 2555  # 約7年
}

variable "s3_cors_enabled" {
  description = "S3 CORS設定有効化"
  type        = bool
  default     = true
}

variable "s3_cors_allowed_origins" {
  description = "CORS許可オリジン"
  type        = list(string)
  default     = ["*"]  # 本番環境では特定のドメインに制限することを推奨
}

# 外部API設定
variable "openai_api_key" {
  description = "OpenAI API キー"
  type        = string
  sensitive   = true
}

variable "x_api_credentials" {
  description = "X (Twitter) API認証情報"
  type = object({
    consumer_key        = string
    consumer_secret     = string
    access_token        = string
    access_token_secret = string
  })
  sensitive = true
}