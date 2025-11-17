output "ec2_security_group_id" {
  description = "EC2セキュリティグループID"
  value       = aws_security_group.ec2.id
}

output "rds_security_group_id" {
  description = "RDSセキュリティグループID"
  value       = aws_security_group.rds.id
}

output "ec2_iam_role_name" {
  description = "EC2 IAMロール名"
  value       = aws_iam_role.ec2_role.name
}

output "ec2_instance_profile_name" {
  description = "EC2インスタンスプロファイル名"
  value       = aws_iam_instance_profile.ec2_profile.name
}