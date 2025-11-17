variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "engine_version" {
  description = "MySQLエンジンバージョン"
  type        = string
  default     = "8.0.39"
}

variable "instance_class" {
  description = "RDSインスタンスクラス"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "初期ストレージサイズ (GB)"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "最大ストレージサイズ (GB)"
  type        = number
  default     = 30
}

variable "database_name" {
  description = "データベース名"
  type        = string
}

variable "master_username" {
  description = "マスターユーザー名"
  type        = string
  default     = "admin"
}

variable "master_password" {
  description = "マスターパスワード"
  type        = string
  sensitive   = true
}

variable "db_subnet_group_name" {
  description = "DBサブネットグループ名"
  type        = string
}

variable "security_group_id" {
  description = "セキュリティグループID"
  type        = string
}

variable "multi_az" {
  description = "Multi-AZ配置"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "バックアップ保持期間（日）"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "バックアップウィンドウ"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "メンテナンスウィンドウ"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "deletion_protection" {
  description = "削除保護"
  type        = bool
  default     = false
}

variable "enhanced_monitoring" {
  description = "拡張監視"
  type        = bool
  default     = false
}

variable "common_tags" {
  description = "共通タグ"
  type        = map(string)
  default     = {}
}