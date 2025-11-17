output "instance_id" {
  description = "EC2インスタンスID"
  value       = aws_instance.main.id
}

output "public_ip" {
  description = "パブリックIP"
  value       = aws_eip.main.public_ip
}

output "private_ip" {
  description = "プライベートIP"
  value       = aws_instance.main.private_ip
}

output "instance_type" {
  description = "インスタンスタイプ"
  value       = aws_instance.main.instance_type
}

output "elastic_ip_id" {
  description = "Elastic IP ID"
  value       = aws_eip.main.id
}