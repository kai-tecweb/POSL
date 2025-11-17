# VPC情報
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "VPC CIDR ブロック"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "パブリックサブネット ID リスト"
  value       = module.vpc.public_subnet_ids
}

output "database_subnet_ids" {
  description = "データベースサブネット ID リスト"
  value       = module.vpc.database_subnet_ids
}

# セキュリティ情報
output "ec2_security_group_id" {
  description = "EC2セキュリティグループ ID"
  value       = module.security.ec2_security_group_id
}

output "rds_security_group_id" {
  description = "RDSセキュリティグループ ID"
  value       = module.security.rds_security_group_id
}

# EC2情報
output "ec2_instance_id" {
  description = "EC2インスタンス ID"
  value       = module.compute.instance_id
}

output "ec2_public_ip" {
  description = "EC2パブリック IP"
  value       = module.compute.public_ip
}

output "ec2_private_ip" {
  description = "EC2プライベート IP"
  value       = module.compute.private_ip
}

output "elastic_ip" {
  description = "Elastic IP"
  value       = module.compute.public_ip
}

# RDS情報
output "rds_endpoint" {
  description = "RDS エンドポイント"
  value       = module.database.rds_endpoint
}

output "rds_port" {
  description = "RDS ポート番号"
  value       = module.database.rds_port
}

output "database_name" {
  description = "データベース名"
  value       = module.database.database_name
}

# S3情報
output "s3_bucket_name" {
  description = "S3バケット名"
  value       = module.storage.bucket_name
}

output "s3_bucket_arn" {
  description = "S3バケット ARN"
  value       = module.storage.bucket_arn
}

output "s3_bucket_domain_name" {
  description = "S3バケットドメイン名"
  value       = module.storage.bucket_domain_name
}

# アプリケーション接続情報
output "application_url" {
  description = "アプリケーション URL"
  value       = "http://${module.compute.public_ip}:${var.app_port}"
}

output "ssh_connection" {
  description = "SSH接続コマンド"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ubuntu@${module.compute.public_ip}"
}

# データベース接続情報
output "database_connection_string" {
  description = "データベース接続文字列（パスワードは別途設定）"
  value       = "mysql://${var.db_username}:<PASSWORD>@${module.database.rds_endpoint}:${module.database.rds_port}/${module.database.database_name}"
  sensitive   = true
}

# 環境情報サマリー
output "environment_summary" {
  description = "本番環境の構成サマリー"
  value = {
    environment    = "production"
    region         = var.aws_region
    vpc_cidr       = var.vpc_cidr
    instance_type  = "t3.medium"
    db_instance    = "db.t3.micro"
    multi_az       = var.db_multi_az
    backup_enabled = var.db_backup_retention_period > 0
    s3_versioning  = var.s3_versioning_enabled
    s3_lifecycle   = var.s3_lifecycle_enabled
  }
}