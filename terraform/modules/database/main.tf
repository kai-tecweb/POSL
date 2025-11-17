# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "mysql8.0"
  name   = "${var.project_name}-${var.environment}-params"

  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "max_connections"
    value = "100"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  parameter {
    name  = "general_log"
    value = "0"
  }

  tags = var.common_tags
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}"

  # エンジン設定
  engine         = "mysql"
  engine_version = var.engine_version
  instance_class = var.instance_class

  # ストレージ設定
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # データベース設定
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password

  # ネットワーク設定
  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false

  # 可用性・バックアップ設定
  multi_az               = var.multi_az
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  copy_tags_to_snapshot  = true

  # パラメータ設定
  parameter_group_name = aws_db_parameter_group.main.name

  # 削除保護
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.environment != "production"

  final_snapshot_identifier = var.environment == "production" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # 性能監視（本番環境かつt3.micro以外のみ）
  performance_insights_enabled = var.environment == "production" && var.instance_class != "db.t3.micro" ? true : false
  monitoring_interval         = var.enhanced_monitoring ? 60 : 0

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db"
  })
}