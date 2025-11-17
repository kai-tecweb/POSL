# 本番環境用のTerraform設定

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Terraform State管理用のS3バックエンド設定
  # 実際にデプロイする前に、State用のS3バケットを手動作成してください
  # backend "s3" {
  #   bucket         = "posl-terraform-state-production"
  #   key            = "production/terraform.tfstate"
  #   region         = "ap-northeast-1"
  #   encrypt        = true
  #   dynamodb_table = "posl-terraform-locks"
  # }
}

# AWSプロバイダー設定
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      Project     = var.project_name
      ManagedBy   = "Terraform"
      Owner       = "POSL-Team"
      CostCenter  = "Development"
      Backup      = "Required"
    }
  }
}

# データソース：利用可能なアベイラビリティゾーン
data "aws_availability_zones" "available" {
  state = "available"
}

# ローカル値
locals {
  environment = "production"

  # 本番環境固有の設定
  instance_type     = "t3.medium"
  db_instance_class = "db.t3.micro"

  # 共通タグ
  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# VPCモジュール
module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = local.environment
  vpc_cidr     = var.vpc_cidr

  public_subnet_cidrs   = var.public_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs

  availability_zones = data.aws_availability_zones.available.names

  common_tags = local.common_tags
}

# セキュリティモジュール
module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = local.environment
  vpc_id       = module.vpc.vpc_id

  admin_cidr_blocks = var.ec2_allowed_cidr_blocks

  common_tags = local.common_tags
}

# コンピュートモジュール
module "compute" {
  source = "../../modules/compute"

  project_name              = var.project_name
  environment               = local.environment
  instance_type             = local.instance_type
  key_pair_name             = var.key_name
  subnet_id                 = module.vpc.public_subnet_ids[0]
  security_group_id         = module.security.ec2_security_group_id
  iam_instance_profile_name = module.security.ec2_instance_profile_name

  common_tags = local.common_tags

  depends_on = [
    module.database,
    module.storage
  ]
}

# データベースモジュール
module "database" {
  source = "../../modules/database"

  project_name          = var.project_name
  environment           = local.environment
  engine_version        = var.db_engine_version
  instance_class        = local.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  database_name         = var.db_name
  master_username       = var.db_username
  master_password       = var.db_password
  db_subnet_group_name  = module.vpc.db_subnet_group_name
  security_group_id     = module.security.rds_security_group_id

  # 本番環境設定
  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_period
  backup_window           = var.db_backup_window
  maintenance_window      = var.db_maintenance_window
  deletion_protection     = var.db_deletion_protection
  enhanced_monitoring     = var.db_enhanced_monitoring

  common_tags = local.common_tags
}

# ストレージモジュール
module "storage" {
  source = "../../modules/storage"

  project_name       = var.project_name
  environment        = local.environment
  bucket_name        = var.s3_bucket_name
  versioning_enabled = var.s3_versioning_enabled
  lifecycle_enabled  = var.s3_lifecycle_enabled

  # ライフサイクル設定
  ia_days         = var.s3_ia_days
  glacier_days    = var.s3_glacier_days
  expiration_days = var.s3_expiration_days

  # セキュリティ設定
  allowed_ec2_role_arn = module.security.ec2_iam_role_arn

  # CORS設定
  cors_enabled         = var.s3_cors_enabled
  cors_allowed_origins = var.s3_cors_allowed_origins

  common_tags = local.common_tags
}