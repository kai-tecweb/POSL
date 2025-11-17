variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "instance_type" {
  description = "EC2インスタンスタイプ"
  type        = string
  default     = "t3.medium"
}

variable "key_pair_name" {
  description = "EC2キーペア名"
  type        = string
}

variable "subnet_id" {
  description = "サブネットID"
  type        = string
}

variable "security_group_id" {
  description = "セキュリティグループID"
  type        = string
}

variable "iam_instance_profile_name" {
  description = "IAMインスタンスプロファイル名"
  type        = string
}

variable "root_volume_size" {
  description = "ルートボリュームサイズ (GB)"
  type        = number
  default     = 20
}

variable "root_volume_iops" {
  description = "ルートボリュームIOPS"
  type        = number
  default     = 3000
}

variable "root_volume_throughput" {
  description = "ルートボリュームスループット (MB/s)"
  type        = number
  default     = 125
}

variable "private_key_path" {
  description = "SSH秘密鍵のパス"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "common_tags" {
  description = "共通タグ"
  type        = map(string)
  default     = {}
}