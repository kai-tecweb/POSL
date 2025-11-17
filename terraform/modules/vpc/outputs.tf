output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "internet_gateway_id" {
  description = "Internet Gateway ID"
  value       = aws_internet_gateway.main.id
}

output "public_subnet_ids" {
  description = "パブリックサブネットのIDリスト"
  value       = aws_subnet.public[*].id
}

output "database_subnet_ids" {
  description = "データベースサブネットのIDリスト"
  value       = aws_subnet.database[*].id
}

output "db_subnet_group_name" {
  description = "データベースサブネットグループ名"
  value       = aws_db_subnet_group.main.name
}