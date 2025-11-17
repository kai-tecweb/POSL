output "rds_endpoint" {
  description = "RDS エンドポイント"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "RDS ポート番号"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "データベース名"
  value       = aws_db_instance.main.db_name
}

output "rds_instance_id" {
  description = "RDS インスタンス ID"
  value       = aws_db_instance.main.id
}

output "rds_arn" {
  description = "RDS インスタンス ARN"
  value       = aws_db_instance.main.arn
}

output "rds_availability_zone" {
  description = "RDS 配置アベイラビリティゾーン"
  value       = aws_db_instance.main.availability_zone
}

output "parameter_group_name" {
  description = "DBパラメータグループ名"
  value       = aws_db_parameter_group.main.name
}

output "master_username" {
  description = "マスターユーザー名"
  value       = aws_db_instance.main.username
  sensitive   = true
}