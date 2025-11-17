variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "admin_cidr_blocks" {
  description = "管理者アクセス用CIDRブロック"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # 本番では適切なIPに制限
}

variable "common_tags" {
  description = "共通タグ"
  type        = map(string)
  default     = {}
}