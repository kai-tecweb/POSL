output "bucket_name" {
  description = "S3バケット名"
  value       = aws_s3_bucket.main.bucket
}

output "bucket_arn" {
  description = "S3バケットARN"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "S3バケットドメイン名"
  value       = aws_s3_bucket.main.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "S3バケットリージョナルドメイン名"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "bucket_hosted_zone_id" {
  description = "S3バケットホストゾーンID"
  value       = aws_s3_bucket.main.hosted_zone_id
}

output "bucket_region" {
  description = "S3バケットリージョン"
  value       = aws_s3_bucket.main.region
}

output "bucket_id" {
  description = "S3バケットID"
  value       = aws_s3_bucket.main.id
}

output "versioning_status" {
  description = "バージョニング状態"
  value       = aws_s3_bucket_versioning.main.versioning_configuration[0].status
}

output "encryption_algorithm" {
  description = "暗号化アルゴリズム"
  value       = "AES256"
}

output "lifecycle_enabled" {
  description = "ライフサイクル管理が有効かどうか"
  value       = var.lifecycle_enabled
}

output "cors_enabled" {
  description = "CORS設定が有効かどうか"
  value       = var.cors_enabled
}