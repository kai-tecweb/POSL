# Terraform Infrastructure as Code 設計書

**作成日**: 2025年11月17日  
**プロジェクト**: POSL AWS構築  
**対象**: Terraformによるインフラ自動化  

## 📋 目次

1. [概要](#概要)
2. [Terraformプロジェクト構成](#terraformプロジェクト構成)
3. [モジュール設計](#モジュール設計)
4. [環境別設定](#環境別設定)
5. [実行手順](#実行手順)
6. [状態管理](#状態管理)
7. [セキュリティ設定](#セキュリティ設定)

---

## 🎯 概要

### 基本方針

- **Infrastructure as Code**: 全インフラをコードで管理
- **モジュール化**: 再利用可能なコンポーネント設計
- **環境分離**: dev/staging/productionの明確な分離
- **状態管理**: S3 + DynamoDBによるリモート状態管理

### 対象インフラ

```
VPC・ネットワーク: サブネット、ルートテーブル、IGW、NAT Gateway
セキュリティ: セキュリティグループ、NACLs、IAMロール・ポリシー
コンピューティング: EC2、Auto Scaling、Launch Template
データベース: RDS MySQL、サブネットグループ、パラメータグループ
ロードバランサー: ALB、Target Group、リスナー
ストレージ: S3バケット、バケットポリシー
監視: CloudWatch、SNS、アラーム
セキュリティ: WAF、ACM証明書
```

---

## 📁 Terraformプロジェクト構成

### ディレクトリ構造

```
terraform/
├── main.tf                    # プロバイダー設定
├── variables.tf               # グローバル変数
├── outputs.tf                # グローバル出力
├── versions.tf               # Terraformバージョン制約
├── terraform.tfvars.example  # 環境変数テンプレート
├── modules/                  # 再利用可能モジュール
│   ├── vpc/                 # VPC・ネットワーク
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── data.tf
│   ├── security/            # セキュリティグループ・IAM
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── iam.tf
│   ├── compute/             # EC2・Auto Scaling
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── launch_template.tf
│   │   └── user_data.sh
│   ├── database/            # RDS
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── parameter_group.tf
│   ├── loadbalancer/        # ALB
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── target_group.tf
│   ├── storage/             # S3
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── bucket_policy.tf
│   └── monitoring/          # CloudWatch・SNS
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── alarms.tf
├── environments/            # 環境別設定
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   ├── backend.tf
│   │   └── outputs.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   ├── backend.tf
│   │   └── outputs.tf
│   └── production/
│       ├── main.tf
│       ├── terraform.tfvars
│       ├── backend.tf
│       └── outputs.tf
└── scripts/                # 実行スクリプト
    ├── init.sh             # 初期化スクリプト
    ├── plan.sh             # プラン確認スクリプト
    ├── apply.sh            # 適用スクリプト
    └── destroy.sh          # 削除スクリプト（開発環境用）
```

---

## 🧩 モジュール設計

### 1. VPCモジュール

#### modules/vpc/main.tf
```hcl
# VPC作成
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

# インターネットゲートウェイ
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

# パブリックサブネット
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-subnet-${count.index + 1}"
    Type = "Public"
  })
}

# プライベートサブネット（アプリケーション用）
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-subnet-${count.index + 1}"
    Type = "Private"
  })
}

# データベースサブネット
resource "aws_subnet" "database" {
  count = length(var.database_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-${count.index + 1}"
    Type = "Database"
  })
}

# NAT Gateway用 Elastic IP
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? length(var.public_subnet_cidrs) : 0
  domain = "vpc"

  depends_on = [aws_internet_gateway.main]

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
  })
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? length(var.public_subnet_cidrs) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-gateway-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.main]
}

# パブリックルートテーブル
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-rt"
  })
}

# プライベートルートテーブル
resource "aws_route_table" "private" {
  count = var.enable_nat_gateway ? length(var.private_subnet_cidrs) : 0

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
  })
}

# ルートテーブル関連付け
resource "aws_route_table_association" "public" {
  count = length(var.public_subnet_cidrs)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count = var.enable_nat_gateway ? length(var.private_subnet_cidrs) : 0

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

#### modules/vpc/variables.tf
```hcl
variable "project_name" {
  description = "プロジェクト名"
  type        = string
}

variable "environment" {
  description = "環境名 (dev/staging/production)"
  type        = string
}

variable "vpc_cidr" {
  description = "VPCのCIDRブロック"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "使用するアベイラビリティゾーン"
  type        = list(string)
  default     = ["ap-northeast-1a", "ap-northeast-1c"]
}

variable "public_subnet_cidrs" {
  description = "パブリックサブネットのCIDRブロック"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "プライベートサブネットのCIDRブロック"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "database_subnet_cidrs" {
  description = "データベースサブネットのCIDRブロック"
  type        = list(string)
  default     = ["10.0.30.0/24", "10.0.40.0/24"]
}

variable "enable_nat_gateway" {
  description = "NAT Gatewayを有効にするか"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "共通タグ"
  type        = map(string)
  default     = {}
}
```

### 2. Computeモジュール (EC2・Auto Scaling)

#### modules/compute/main.tf
```hcl
# Launch Template
resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-${var.environment}-"
  description   = "Launch template for ${var.project_name} application"
  image_id      = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [var.security_group_id]

  iam_instance_profile {
    name = var.iam_instance_profile_name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    project_name = var.project_name
    environment  = var.environment
    rds_endpoint = var.rds_endpoint
    s3_bucket    = var.s3_bucket_name
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.common_tags, {
      Name = "${var.project_name}-${var.environment}-app"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(var.common_tags, {
      Name = "${var.project_name}-${var.environment}-app-volume"
    })
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      iops                  = var.root_volume_iops
      throughput            = var.root_volume_throughput
      encrypted             = true
      delete_on_termination = true
    }
  }

  tags = var.common_tags
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name                = "${var.project_name}-${var.environment}-asg"
  vpc_zone_identifier = var.subnet_ids
  target_group_arns   = [var.target_group_arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # スケーリングポリシー
  enabled_metrics = [
    "GroupMinSize",
    "GroupMaxSize",
    "GroupDesiredCapacity",
    "GroupInServiceInstances",
    "GroupTotalInstances"
  ]

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${var.environment}-asg"
    propagate_at_launch = false
  }

  dynamic "tag" {
    for_each = var.common_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}

# スケーリングポリシー - CPU利用率ベース
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.project_name}-${var.environment}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.app.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.project_name}-${var.environment}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.app.name
}

# CloudWatch アラーム
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "${var.project_name}-${var.environment}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "20"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app.name
  }

  tags = var.common_tags
}
```

#### modules/compute/user_data.sh
```bash
#!/bin/bash
yum update -y

# CloudWatch エージェントインストール
yum install -y amazon-cloudwatch-agent

# Node.js 18インストール
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# PM2インストール
npm install -g pm2

# アプリケーションディレクトリ作成
mkdir -p /opt/${project_name}
chown ec2-user:ec2-user /opt/${project_name}

# Git設定
yum install -y git

# MySQL クライアントインストール
yum install -y mysql

# 環境変数設定
cat > /opt/${project_name}/.env << EOL
NODE_ENV=${environment}
DB_HOST=${rds_endpoint}
DB_PORT=3306
DB_NAME=posl_${environment}
S3_BUCKET=${s3_bucket}
AWS_REGION=ap-northeast-1
EOL

# systemdサービス設定
cat > /etc/systemd/system/${project_name}.service << EOL
[Unit]
Description=${project_name} Application
After=network.target

[Service]
Type=forking
User=ec2-user
WorkingDirectory=/opt/${project_name}
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env ${environment}
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 stop all
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

systemctl enable ${project_name}.service

# CloudWatch設定
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOL
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "metrics": {
    "namespace": "${project_name}/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/${project_name}/logs/*.log",
            "log_group_name": "/aws/ec2/${project_name}",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOL

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### 3. Databaseモジュール (RDS)

#### modules/database/main.tf
```hcl
# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "mysql8.0"
  name   = "${var.project_name}-${var.environment}-db-params"

  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "max_connections"
    value = "200"
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
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false

  # 可用性・バックアップ設定
  multi_az               = var.multi_az
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window
  copy_tags_to_snapshot  = true

  # パラメータ・オプション
  parameter_group_name = aws_db_parameter_group.main.name

  # 削除保護
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.environment != "production"

  final_snapshot_identifier = var.environment == "production" ? 
    "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # 性能監視
  performance_insights_enabled = var.performance_insights_enabled
  monitoring_interval         = var.enhanced_monitoring ? 60 : 0
  monitoring_role_arn        = var.enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-db"
  })
}

# Enhanced Monitoring用IAMロール
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.enhanced_monitoring ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = var.enhanced_monitoring ? 1 : 0
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Read Replica (本番環境のみ)
resource "aws_db_instance" "read_replica" {
  count = var.environment == "production" && var.enable_read_replica ? 1 : 0

  identifier = "${var.project_name}-${var.environment}-read-replica"

  replicate_source_db = aws_db_instance.main.id
  instance_class      = var.read_replica_instance_class

  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false

  auto_minor_version_upgrade = false
  skip_final_snapshot       = true

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-read-replica"
  })
}
```

---

## 🌍 環境別設定

### 本番環境設定

#### environments/production/main.tf
```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "posl-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "posl-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "POSL Team"
    }
  }
}

# 共通変数
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# VPCモジュール
module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  
  vpc_cidr                = "10.0.0.0/16"
  availability_zones      = ["ap-northeast-1a", "ap-northeast-1c"]
  public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs    = ["10.0.10.0/24", "10.0.20.0/24"]
  database_subnet_cidrs   = ["10.0.30.0/24", "10.0.40.0/24"]
  enable_nat_gateway      = true

  common_tags = local.common_tags
}

# セキュリティモジュール
module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id

  common_tags = local.common_tags
}

# データベースモジュール
module "database" {
  source = "../../modules/database"

  project_name = var.project_name
  environment  = var.environment
  
  subnet_ids         = module.vpc.database_subnet_ids
  security_group_id  = module.security.rds_security_group_id

  # 本番環境設定
  instance_class              = "db.t3.small"
  allocated_storage           = 20
  max_allocated_storage       = 100
  multi_az                   = true
  backup_retention_period    = 7
  deletion_protection        = true
  performance_insights_enabled = true
  enhanced_monitoring        = true
  enable_read_replica        = false  # 初期は無効

  database_name     = "posl_production"
  master_username   = var.db_master_username
  master_password   = var.db_master_password

  common_tags = local.common_tags
}

# ロードバランサーモジュール
module "loadbalancer" {
  source = "../../modules/loadbalancer"

  project_name = var.project_name
  environment  = var.environment
  
  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.public_subnet_ids
  security_group_id = module.security.alb_security_group_id
  
  domain_name       = var.domain_name
  certificate_arn   = var.ssl_certificate_arn

  common_tags = local.common_tags
}

# Computeモジュール
module "compute" {
  source = "../../modules/compute"

  project_name = var.project_name
  environment  = var.environment
  
  subnet_ids                  = module.vpc.private_subnet_ids
  security_group_id           = module.security.ec2_security_group_id
  iam_instance_profile_name   = module.security.ec2_instance_profile_name
  target_group_arn           = module.loadbalancer.target_group_arn

  # 本番環境設定
  instance_type     = "t3.medium"
  min_size         = 1
  max_size         = 3
  desired_capacity = 1
  
  root_volume_size = 20
  key_pair_name    = var.ec2_key_pair_name

  # データベース接続情報
  rds_endpoint    = module.database.rds_endpoint
  s3_bucket_name  = module.storage.audio_bucket_name

  common_tags = local.common_tags
}

# ストレージモジュール
module "storage" {
  source = "../../modules/storage"

  project_name = var.project_name
  environment  = var.environment

  common_tags = local.common_tags
}

# 監視モジュール
module "monitoring" {
  source = "../../modules/monitoring"

  project_name = var.project_name
  environment  = var.environment

  # 監視対象
  alb_arn               = module.loadbalancer.alb_arn
  target_group_arn      = module.loadbalancer.target_group_arn
  rds_instance_id       = module.database.rds_instance_id
  autoscaling_group_name = module.compute.autoscaling_group_name

  # 通知設定
  notification_email = var.notification_email

  common_tags = local.common_tags
}
```

#### environments/production/terraform.tfvars
```hcl
# 基本設定
project_name = "posl"
environment  = "production"
aws_region   = "ap-northeast-1"

# ドメイン・SSL設定
domain_name         = "api.posl.example.com"
ssl_certificate_arn = "arn:aws:acm:ap-northeast-1:ACCOUNT-ID:certificate/CERT-ID"

# EC2設定
ec2_key_pair_name = "posl-production-key"

# データベース設定 (機密情報はAWS Secrets Managerから取得)
db_master_username = "admin"
db_master_password = "PLACEHOLDER_USE_SECRETS_MANAGER"

# 通知設定
notification_email = "admin@posl.example.com"
```

---

## 🔧 実行手順

### 初期化スクリプト

#### scripts/init.sh
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="posl"

echo "🚀 Initializing Terraform for $ENVIRONMENT environment"

# 環境ディレクトリに移動
cd "environments/$ENVIRONMENT"

# S3バケット作成 (初回のみ)
if [ "$ENVIRONMENT" = "production" ]; then
  echo "📦 Creating S3 bucket for Terraform state..."
  
  aws s3 mb "s3://${PROJECT_NAME}-terraform-state" --region ap-northeast-1 || true
  
  aws s3api put-bucket-versioning \
    --bucket "${PROJECT_NAME}-terraform-state" \
    --versioning-configuration Status=Enabled
  
  aws s3api put-bucket-encryption \
    --bucket "${PROJECT_NAME}-terraform-state" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'

  # DynamoDB テーブル作成 (状態ロック用)
  echo "🔒 Creating DynamoDB table for state locking..."
  
  aws dynamodb create-table \
    --table-name "${PROJECT_NAME}-terraform-locks" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region ap-northeast-1 || true
fi

# Terraform初期化
echo "⚡ Running terraform init..."
terraform init

echo "✅ Terraform initialization completed for $ENVIRONMENT!"
```

#### scripts/plan.sh
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-production}

echo "📋 Running Terraform plan for $ENVIRONMENT environment"

cd "environments/$ENVIRONMENT"

# プラン実行
terraform plan -out=tfplan

echo "✅ Terraform plan completed!"
echo "📁 Plan file saved as: tfplan"
echo ""
echo "To apply this plan, run:"
echo "  ./scripts/apply.sh $ENVIRONMENT"
```

#### scripts/apply.sh
```bash
#!/bin/bash

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Applying Terraform plan for $ENVIRONMENT environment"

cd "environments/$ENVIRONMENT"

# プランファイルの存在確認
if [ ! -f "tfplan" ]; then
  echo "❌ Error: tfplan file not found!"
  echo "Please run: ./scripts/plan.sh $ENVIRONMENT"
  exit 1
fi

# 適用前の最終確認
echo "⚠️  WARNING: This will apply changes to $ENVIRONMENT environment!"
echo "Press CTRL+C to cancel, or any other key to continue..."
read -n 1

# 適用実行
terraform apply tfplan

# プランファイル削除
rm -f tfplan

echo "✅ Terraform apply completed for $ENVIRONMENT!"

# 重要な出力情報表示
echo ""
echo "📊 Important outputs:"
terraform output
```

---

## 💾 状態管理

### S3バックエンド設定

#### リモート状態管理の利点
```
- 状態ファイルの共有・同期
- 状態ロック（DynamoDBによる）
- 状態ファイルの暗号化
- バージョニング・バックアップ
```

#### environments/production/backend.tf
```hcl
terraform {
  backend "s3" {
    bucket         = "posl-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "posl-terraform-locks"
    encrypt        = true
  }
}
```

### 状態操作コマンド

#### 状態確認
```bash
# 状態一覧表示
terraform state list

# 特定リソースの状態表示
terraform state show aws_instance.app

# 状態ファイルのバックアップ
terraform state pull > terraform.tfstate.backup
```

#### 状態修復
```bash
# リソースのインポート
terraform import aws_instance.app i-1234567890abcdef0

# リソースの移動
terraform state mv aws_instance.old aws_instance.new

# リソースの削除（状態のみ）
terraform state rm aws_instance.unused
```

---

## 🔒 セキュリティ設定

### 機密情報管理

#### AWS Secrets Managerとの統合
```hcl
# データソース: Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "posl/${var.environment}/db-password"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string)
}

# RDS設定で使用
resource "aws_db_instance" "main" {
  # ...
  password = local.db_creds.password
  # ...
}
```

### Terraformセキュリティベストプラクティス

#### .gitignore設定
```gitignore
# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl
tfplan

# 機密ファイル
*.tfvars
!terraform.tfvars.example
.env
*.pem
*.key
```

#### 権限最小化
```hcl
# Terraform実行用IAMポリシー例
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "rds:*",
        "s3:*",
        "iam:*",
        "elbv2:*",
        "cloudwatch:*",
        "sns:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-northeast-1"
        }
      }
    }
  ]
}
```

---

## 📊 監視・ログ

### Terraform実行ログ

#### ログレベル設定
```bash
# デバッグログ有効化
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log

terraform plan
```

#### CI/CDでの実行ログ
```yaml
# GitHub Actions例
- name: Terraform Plan
  run: |
    cd environments/production
    terraform plan -detailed-exitcode -out=tfplan
  env:
    TF_LOG: INFO
    TF_IN_AUTOMATION: true
```

---

## ✅ チェックリスト

### 構築前確認
- [ ] AWS CLIの設定・認証情報確認
- [ ] Terraformバージョン確認 (>= 1.0)
- [ ] 必要なIAM権限確認
- [ ] S3バケット・DynamoDBテーブル準備完了

### 環境別構築確認
- [ ] 開発環境: Terraform plan/apply成功
- [ ] ステージング環境: Terraform plan/apply成功  
- [ ] 本番環境: Terraform plan確認・approve済み
- [ ] 各環境の動作確認完了

### セキュリティ確認
- [ ] 機密情報のSecrets Manager管理完了
- [ ] IAM権限最小化確認
- [ ] セキュリティグループ設定確認
- [ ] 暗号化設定確認

### 運用準備確認
- [ ] 状態管理設定確認
- [ ] バックアップ戦略確認
- [ ] 監視・アラート設定確認
- [ ] ドキュメント整備完了

---

**更新履歴**
- 2025-11-17: 初版作成
- 2025-11-17: モジュール設計詳細化
- 2025-11-17: セキュリティ・運用設定追加