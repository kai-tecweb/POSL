# Terraform実行用IAM権限リスト
# POSLプロジェクトのAWSインフラ構築に必要な最小権限

## 🎯 必須権限一覧

### 1. EC2関連権限
```json
{
  "Sid": "EC2FullAccess",
  "Effect": "Allow",
  "Action": [
    "ec2:*"
  ],
  "Resource": "*"
}
```

### 2. IAM関連権限 (Terraformでロール・ポリシー作成用)
```json
{
  "Sid": "IAMManagement", 
  "Effect": "Allow",
  "Action": [
    "iam:CreateRole",
    "iam:DeleteRole", 
    "iam:GetRole",
    "iam:ListRoles",
    "iam:UpdateAssumeRolePolicy",
    "iam:TagRole",
    "iam:UntagRole",
    "iam:CreateInstanceProfile",
    "iam:DeleteInstanceProfile",
    "iam:GetInstanceProfile",
    "iam:AddRoleToInstanceProfile",
    "iam:RemoveRoleFromInstanceProfile",
    "iam:CreatePolicy",
    "iam:DeletePolicy",
    "iam:GetPolicy",
    "iam:GetPolicyVersion",
    "iam:AttachRolePolicy",
    "iam:DetachRolePolicy",
    "iam:PutRolePolicy",
    "iam:DeleteRolePolicy",
    "iam:GetRolePolicy",
    "iam:ListAttachedRolePolicies",
    "iam:ListRolePolicies"
  ],
  "Resource": "*"
}
```

### 3. RDS関連権限
```json
{
  "Sid": "RDSManagement",
  "Effect": "Allow", 
  "Action": [
    "rds:CreateDBInstance",
    "rds:DeleteDBInstance",
    "rds:DescribeDBInstances",
    "rds:DescribeDBClusters",
    "rds:ModifyDBInstance",
    "rds:CreateDBParameterGroup",
    "rds:DeleteDBParameterGroup",
    "rds:DescribeDBParameterGroups",
    "rds:ModifyDBParameterGroup",
    "rds:CreateDBSubnetGroup",
    "rds:DeleteDBSubnetGroup",
    "rds:DescribeDBSubnetGroups",
    "rds:ModifyDBSubnetGroup",
    "rds:AddTagsToResource",
    "rds:ListTagsForResource",
    "rds:RemoveTagsFromResource"
  ],
  "Resource": "*"
}
```

### 4. S3関連権限
```json
{
  "Sid": "S3Management",
  "Effect": "Allow",
  "Action": [
    "s3:CreateBucket",
    "s3:DeleteBucket",
    "s3:GetBucketLocation",
    "s3:GetBucketVersioning",
    "s3:PutBucketVersioning",
    "s3:GetBucketEncryption", 
    "s3:PutBucketEncryption",
    "s3:GetBucketPolicy",
    "s3:PutBucketPolicy",
    "s3:DeleteBucketPolicy",
    "s3:GetBucketPublicAccessBlock",
    "s3:PutBucketPublicAccessBlock",
    "s3:GetBucketTagging",
    "s3:PutBucketTagging",
    "s3:ListBucket"
  ],
  "Resource": "*"
}
```

### 5. VPC関連権限
```json
{
  "Sid": "VPCManagement",
  "Effect": "Allow",
  "Action": [
    "ec2:CreateVpc",
    "ec2:DeleteVpc",
    "ec2:DescribeVpcs",
    "ec2:ModifyVpcAttribute",
    "ec2:CreateSubnet",
    "ec2:DeleteSubnet", 
    "ec2:DescribeSubnets",
    "ec2:ModifySubnetAttribute",
    "ec2:CreateInternetGateway",
    "ec2:DeleteInternetGateway",
    "ec2:DescribeInternetGateways",
    "ec2:AttachInternetGateway",
    "ec2:DetachInternetGateway",
    "ec2:CreateRouteTable",
    "ec2:DeleteRouteTable",
    "ec2:DescribeRouteTables",
    "ec2:AssociateRouteTable",
    "ec2:DisassociateRouteTable",
    "ec2:CreateRoute",
    "ec2:DeleteRoute",
    "ec2:CreateSecurityGroup",
    "ec2:DeleteSecurityGroup",
    "ec2:DescribeSecurityGroups",
    "ec2:AuthorizeSecurityGroupIngress",
    "ec2:AuthorizeSecurityGroupEgress",
    "ec2:RevokeSecurityGroupIngress",
    "ec2:RevokeSecurityGroupEgress"
  ],
  "Resource": "*"
}
```

### 6. その他必要な権限
```json
{
  "Sid": "AdditionalServices",
  "Effect": "Allow",
  "Action": [
    "elasticloadbalancing:*",
    "autoscaling:*",
    "cloudwatch:*",
    "logs:*",
    "sns:*",
    "ssm:GetParameter",
    "ssm:GetParameters",
    "ssm:PutParameter",
    "secretsmanager:CreateSecret",
    "secretsmanager:GetSecretValue",
    "secretsmanager:PutSecretValue",
    "secretsmanager:UpdateSecret",
    "secretsmanager:TagResource"
  ],
  "Resource": "*"
}
```

## 🔧 完全なIAMポリシー (1つのユーザー用)

### `posl-terraform-full-policy`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TerraformFullAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "iam:*",
        "rds:*",
        "s3:*",
        "elasticloadbalancing:*",
        "autoscaling:*", 
        "cloudwatch:*",
        "logs:*",
        "sns:*",
        "ssm:*",
        "secretsmanager:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-northeast-1"
        }
      }
    },
    {
      "Sid": "GlobalResourceAccess",
      "Effect": "Allow",
      "Action": [
        "iam:ListRoles",
        "iam:ListPolicies", 
        "iam:ListInstanceProfiles",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation"
      ],
      "Resource": "*"
    }
  ]
}
```

## ⚠️ 現在の権限不足

### 現在のユーザー (posl-dev-local-user) で不足している権限:
- ❌ `iam:CreateRole` - EC2ロール作成
- ❌ `iam:CreateInstanceProfile` - EC2インスタンスプロファイル作成  
- ❌ `rds:CreateDBParameterGroup` - RDSパラメータグループ作成
- ❌ `rds:CreateDBSubnetGroup` - RDSサブネットグループ作成
- ❌ `rds:CreateDBInstance` - RDSインスタンス作成

## 🎯 対応方法

### オプション1: 現在のユーザーに権限を追加
AWSコンソールで `posl-dev-local-user` に `posl-terraform-full-policy` をアタッチ

### オプション2: 新しいTerraform専用ユーザーを作成  
1. AWSコンソールで新しいIAMユーザー `posl-terraform-user` を作成
2. `posl-terraform-full-policy` をアタッチ
3. アクセスキー・シークレットキーを生成
4. ローカル認証情報を更新

### オプション3: 一時的に管理者権限を使用
1. AWSコンソールで `posl-dev-local-user` に `AdministratorAccess` を一時的にアタッチ
2. インフラ構築完了後に権限を最小権限に戻す

## 📋 権限確認コマンド
```bash
# 現在の権限をテスト
aws iam simulate-principal-policy \
  --policy-source-arn $(aws sts get-caller-identity --query 'Arn' --output text) \
  --action-names iam:CreateRole rds:CreateDBParameterGroup rds:CreateDBSubnetGroup \
  --resource-arns "*"

# IAMロール作成テスト
aws iam create-role --role-name test-terraform-role --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' --dry-run

# RDSパラメータグループ作成テスト  
aws rds create-db-parameter-group --db-parameter-group-name test-params --db-parameter-group-family mysql8.0 --description "Test" --dry-run
```