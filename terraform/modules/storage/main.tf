# S3バケット
resource "aws_s3_bucket" "main" {
  bucket = var.bucket_name

  tags = merge(
    var.common_tags,
    {
      Name        = "${var.project_name}-${var.environment}-s3-bucket"
      Environment = var.environment
      Purpose     = "Audio file storage"
    }
  )

  lifecycle {
    prevent_destroy = true
  }
}

# S3バケットのバージョニング設定
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Disabled"
  }
}

# S3バケットの暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_id
    }
    bucket_key_enabled = var.kms_key_id != null ? true : false
  }
}

# S3バケットのパブリックアクセスブロック設定
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = var.block_public_acls
  block_public_policy     = var.block_public_policy
  ignore_public_acls      = var.ignore_public_acls
  restrict_public_buckets = var.restrict_public_buckets
}

# S3バケットのライフサイクル設定
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count  = var.lifecycle_enabled ? 1 : 0
  bucket = aws_s3_bucket.main.id

  depends_on = [aws_s3_bucket_versioning.main]

  rule {
    id     = "audio_files_lifecycle"
    status = "Enabled"

    # オーディオファイル用のルール
    filter {
      prefix = "audio/"
    }

    transition {
      days          = var.ia_days
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = var.glacier_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  # 一時ファイル用のルール
  rule {
    id     = "temp_files_cleanup"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 7
    }
  }

  # 不完全なマルチパートアップロードの削除
  rule {
    id     = "incomplete_multipart_upload_deletion"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# S3バケットのCORS設定
resource "aws_s3_bucket_cors_configuration" "main" {
  count  = var.cors_enabled ? 1 : 0
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = var.cors_allowed_headers
    allowed_methods = var.cors_allowed_methods
    allowed_origins = var.cors_allowed_origins
    max_age_seconds = var.cors_max_age_seconds
  }
}

# S3バケットポリシー
resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2RoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = var.allowed_ec2_role_arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
      },
      {
        Sid    = "DenyInsecureConnections"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.main]
}

# S3バケットの通知設定（CloudWatchメトリクス用）
resource "aws_s3_bucket_notification" "main" {
  bucket = aws_s3_bucket.main.id

  # CloudWatch Events用のSNSトピックがある場合の設定例
  # 必要に応じて有効化
  # topic {
  #   topic_arn = aws_sns_topic.s3_notifications.arn
  #   events    = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
  # }
}

# CloudWatchメトリクス設定
resource "aws_s3_bucket_metric" "main" {
  bucket = aws_s3_bucket.main.id
  name   = "audio-files-metrics"

  filter {
    prefix = "audio/"
  }
}

# S3バケットの分析設定
resource "aws_s3_bucket_analytics_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  name   = "audio-storage-analytics"

  filter {
    prefix = "audio/"
  }

  storage_class_analysis {
    data_export {
      destination {
        s3_bucket_destination {
          bucket_arn = aws_s3_bucket.main.arn
          prefix     = "analytics/"
          format     = "CSV"
        }
      }
      output_schema_version = "V_1"
    }
  }
}