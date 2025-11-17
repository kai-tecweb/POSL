variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "bucket_name" {
  description = "S3バケット名"
  type        = string
}

variable "versioning_enabled" {
  description = "バージョニングの有効化"
  type        = bool
  default     = true
}

variable "lifecycle_enabled" {
  description = "ライフサイクル管理の有効化"
  type        = bool
  default     = true
}

variable "ia_days" {
  description = "Infrequent Accessに移行する日数"
  type        = number
  default     = 30
}

variable "glacier_days" {
  description = "Glacierに移行する日数"
  type        = number
  default     = 90
}

variable "expiration_days" {
  description = "オブジェクトを削除する日数"
  type        = number
  default     = 2555  # 約7年
}

variable "block_public_acls" {
  description = "パブリック ACL をブロック"
  type        = bool
  default     = true
}

variable "block_public_policy" {
  description = "パブリックバケットポリシーをブロック"
  type        = bool
  default     = true
}

variable "ignore_public_acls" {
  description = "パブリック ACL を無視"
  type        = bool
  default     = true
}

variable "restrict_public_buckets" {
  description = "パブリックバケットアクセスを制限"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS キー ID（指定しない場合はS3管理キーを使用）"
  type        = string
  default     = null
}

variable "allowed_ec2_role_arn" {
  description = "S3アクセスを許可するEC2ロールのARN"
  type        = string
}

variable "cors_enabled" {
  description = "CORS設定の有効化"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "CORS許可オリジン"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_methods" {
  description = "CORS許可メソッド"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE"]
}

variable "cors_allowed_headers" {
  description = "CORS許可ヘッダー"
  type        = list(string)
  default     = ["*"]
}

variable "cors_max_age_seconds" {
  description = "CORSプリフライトリクエストのキャッシュ時間（秒）"
  type        = number
  default     = 3000
}

variable "common_tags" {
  description = "共通タグ"
  type        = map(string)
  default     = {}
}