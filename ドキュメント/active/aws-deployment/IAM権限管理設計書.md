# IAM権限管理設計書

**作成日**: 2025年11月17日  
**プロジェクト**: POSL AWS構築  
**対象**: IAMユーザー・ロール・ポリシー設計  

## 📋 目次

1. [概要](#概要)
2. [既存IAMリソース活用](#既存iamリソース活用)
3. [権限設計原則](#権限設計原則)
4. [IAMロール詳細設計](#iamロール詳細設計)
5. [IAMユーザー詳細設計](#iamユーザー詳細設計)
6. [セキュリティポリシー](#セキュリティポリシー)
7. [運用手順](#運用手順)

---

## 🎯 概要

### 基本方針

POSLプロジェクトでは、**既存の3つのIAMリソース**を最大限活用し、セキュアな権限管理を実現します：

1. **EC2ロール** - アプリケーション実行時の権限
2. **ローカルPC用IAMユーザー** - 開発環境での作業用権限  
3. **GitHub Actions用IAMユーザー** - CI/CD自動化用権限

### セキュリティ原則

- **最小権限の原則**: 必要最低限の権限のみ付与
- **職責分離**: 開発・運用・デプロイで権限を分離
- **定期レビュー**: 四半期ごとの権限見直し
- **監査ログ**: CloudTrailによる全操作追跡

---

## 🔧 既存IAMリソース活用

### 現在の状況確認

既存のIAMリソースの詳細情報を確認し、適切に活用します：

#### 1. EC2ロール
```
目的: EC2インスタンスがAWSサービスにアクセスする際の権限
使用場面:
  - RDSへのデータベース接続
  - S3への音声ファイル読み書き
  - CloudWatch Logsへのログ出力
  - Secrets Managerからの認証情報取得
```

#### 2. ローカルPC用IAMユーザー
```
目的: 開発者がローカル環境から開発・テスト作業を行う権限
使用場面:
  - 開発環境RDSへの接続テスト
  - 開発用S3バケットへのファイルアップロード
  - CloudWatchログの確認・デバッグ
  - 開発環境リソースの操作
```

#### 3. GitHub Actions用IAMユーザー
```
目的: CI/CDパイプラインでの自動デプロイ・テスト実行権限
使用場面:
  - EC2インスタンスへのアプリケーションデプロイ
  - RDSマイグレーション実行
  - S3へのデプロイアーティファクト保存
  - CloudFormation/Terraformの実行
```

---

## 🔒 権限設計原則

### 1. レイヤー別権限分離

```
┌─────────────────────────────────────────────┐
│ GitHub Actions用IAMユーザー                    │
│ - デプロイ・インフラ操作権限                      │
│ - 本番環境への限定的アクセス                      │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ EC2ロール                                    │
│ - アプリケーション実行時権限                      │
│ - RDS、S3、CloudWatchアクセス                 │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ローカルPC用IAMユーザー                         │  
│ - 開発・テスト環境権限                           │
│ - 本番環境への読み取り専用アクセス                  │
└─────────────────────────────────────────────┘
```

### 2. 環境別権限マトリックス

| 権限対象 | 開発環境 | ステージング環境 | 本番環境 |
|---------|---------|---------------|---------|
| **ローカルPC用IAMユーザー** | 読み書き | 読み取り専用 | 読み取り専用 |
| **GitHub Actions用IAMユーザー** | 読み書き | 読み書き | デプロイ専用 |
| **EC2ロール** | - | 実行時権限 | 実行時権限 |

### 3. リソース別アクセスパターン

#### RDS (データベース)
```
本番RDS:
  - EC2ロール: 読み書きアクセス (アプリケーション実行)
  - GitHub Actions: スキーマ変更・マイグレーション
  - ローカルPC: 読み取り専用 (調査・分析)

開発RDS:
  - EC2ロール: フル権限
  - GitHub Actions: フル権限  
  - ローカルPC: フル権限
```

#### S3 (ファイルストレージ)
```
本番S3バケット:
  - EC2ロール: 音声ファイル読み書き
  - GitHub Actions: デプロイアーティファクト保存
  - ローカルPC: 制限付きアクセス

開発S3バケット:
  - 全IAMリソース: フル権限
```

---

## 🚀 IAMロール詳細設計

### EC2ロール: `posl-ec2-role`

#### 基本構成
```json
{
  "RoleName": "posl-ec2-role",
  "AssumeRolePolicyDocument": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ec2.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  },
  "Path": "/",
  "Tags": [
    {
      "Key": "Project",
      "Value": "POSL"
    },
    {
      "Key": "Environment", 
      "Value": "Production"
    }
  ]
}
```

#### アタッチするポリシー

##### 1. カスタムポリシー: `posl-ec2-application-policy`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RDSAccess",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters"
      ],
      "Resource": [
        "arn:aws:rds:ap-northeast-1:ACCOUNT-ID:db:posl-production",
        "arn:aws:rds:ap-northeast-1:ACCOUNT-ID:cluster:posl-production"
      ]
    },
    {
      "Sid": "S3AudioFilesAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::posl-audio-files/*"
    },
    {
      "Sid": "S3AudioFilesBucketAccess", 
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::posl-audio-files"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:ap-northeast-1:ACCOUNT-ID:log-group:/aws/ec2/posl",
        "arn:aws:logs:ap-northeast-1:ACCOUNT-ID:log-group:/aws/ec2/posl:*"
      ]
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow", 
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT-ID:secret:posl/openai-*",
        "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT-ID:secret:posl/x-api-*",
        "arn:aws:secretsmanager:ap-northeast-1:ACCOUNT-ID:secret:posl/database-*"
      ]
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "POSL/Application"
        }
      }
    }
  ]
}
```

##### 2. 管理ポリシー: `CloudWatchAgentServerPolicy`
```
AWS管理ポリシーをアタッチ:
arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
```

---

## 👤 IAMユーザー詳細設計  

### 1. ローカルPC用IAMユーザー: `posl-developer`

#### 用途と使用場面
```
目的: 開発者のローカル環境での開発・デバッグ作業
使用場面:
  - AWS CLI/SDKを使用したローカル開発
  - RDS開発環境への直接接続・クエリ実行
  - S3開発バケットへのテストファイルアップロード
  - CloudWatch Logsの確認・デバッグ
  - 開発環境リソースの操作・確認
```

#### アタッチポリシー: `posl-developer-policy`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RDSDevelopmentAccess",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters", 
        "rds:DescribeDBSnapshots",
        "rds:CreateDBSnapshot"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "ap-northeast-1"
        }
      }
    },
    {
      "Sid": "RDSProductionReadOnly",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters"
      ],
      "Resource": [
        "arn:aws:rds:ap-northeast-1:ACCOUNT-ID:db:posl-production",
        "arn:aws:rds:ap-northeast-1:ACCOUNT-ID:cluster:posl-production"
      ]
    },
    {
      "Sid": "S3DevelopmentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject", 
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::posl-dev-files",
        "arn:aws:s3:::posl-dev-files/*"
      ]
    },
    {
      "Sid": "S3ProductionReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::posl-audio-files",
        "arn:aws:s3:::posl-audio-files/*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:ap-northeast-1:ACCOUNT-ID:log-group:/aws/ec2/posl:*",
        "arn:aws:logs:ap-northeast-1:ACCOUNT-ID:log-group:/aws/lambda/posl-*"
      ]
    },
    {
      "Sid": "EC2ReadOnlyAccess",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets"
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

### 2. GitHub Actions用IAMユーザー: `posl-ci-cd`

#### 用途と使用場面
```
目的: CI/CDパイプラインでの自動化タスク実行
使用場面:
  - GitHub ActionsからのEC2インスタンスへの自動デプロイ
  - RDSマイグレーションスクリプトの実行
  - S3へのデプロイアーティファクトの保存
  - CloudFormation/Terraformテンプレートの実行
  - EC2インスタンスでのコマンド実行 (Systems Manager)
```

#### アタッチポリシー: `posl-ci-cd-policy`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2InstanceManagement",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeImages",
        "ec2:DescribeSnapshots"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SystemsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ssm:DescribeInstanceInformation",
        "ssm:ListCommands",
        "ssm:ListCommandInvocations"
      ],
      "Resource": [
        "arn:aws:ec2:ap-northeast-1:ACCOUNT-ID:instance/*",
        "arn:aws:ssm:ap-northeast-1:*:document/AWS-RunShellScript",
        "arn:aws:ssm:ap-northeast-1:ACCOUNT-ID:*"
      ]
    },
    {
      "Sid": "S3DeploymentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::posl-deployment-artifacts",
        "arn:aws:s3:::posl-deployment-artifacts/*"
      ]
    },
    {
      "Sid": "RDSManagement",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormationAccess",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate"
      ],
      "Resource": [
        "arn:aws:cloudformation:ap-northeast-1:ACCOUNT-ID:stack/posl-*/*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:ap-northeast-1:ACCOUNT-ID:log-group:/aws/ec2/posl:*"
      ]
    }
  ]
}
```

---

## 🔐 セキュリティポリシー

### 1. アクセスキー管理

#### ローカルPC用IAMユーザー
```bash
# ~/.aws/credentials での管理
[posl-dev]
aws_access_key_id = AKIA...
aws_secret_access_key = xxx...
region = ap-northeast-1

# 使用時
export AWS_PROFILE=posl-dev
aws rds describe-db-instances
```

#### GitHub Actions用IAMユーザー
```yaml
# GitHub Secretsでの管理
secrets:
  AWS_ACCESS_KEY_ID: ${{ secrets.POSL_CI_AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.POSL_CI_AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: ap-northeast-1
```

### 2. アクセスキーローテーション

#### 四半期ローテーションスケジュール
```
Q1 (1-3月): ローカルPC用IAMユーザーキー更新
Q2 (4-6月): GitHub Actions用IAMユーザーキー更新  
Q3 (7-9月): ローカルPC用IAMユーザーキー更新
Q4 (10-12月): GitHub Actions用IAMユーザーキー更新
```

#### ローテーション手順
```bash
# 1. 新しいアクセスキー作成
aws iam create-access-key --user-name posl-developer

# 2. 新しいキーでテスト実行
AWS_ACCESS_KEY_ID=AKIA... AWS_SECRET_ACCESS_KEY=xxx... aws sts get-caller-identity

# 3. 動作確認後、古いキー削除
aws iam delete-access-key --user-name posl-developer --access-key-id AKIA[OLD_KEY]
```

### 3. 監査・監視設定

#### CloudTrail設定
```json
{
  "TrailName": "posl-security-audit",
  "S3BucketName": "posl-cloudtrail-logs",
  "IncludeGlobalServiceEvents": true,
  "IsMultiRegionTrail": true,
  "EnableLogFileValidation": true,
  "EventSelectors": [
    {
      "ReadWriteType": "All",
      "IncludeManagementEvents": true,
      "DataResources": [
        {
          "Type": "AWS::S3::Object",
          "Values": ["arn:aws:s3:::posl-*/*"]
        },
        {
          "Type": "AWS::RDS::DBCluster",
          "Values": ["*"]
        }
      ]
    }
  ]
}
```

#### CloudWatch異常検知アラート
```json
{
  "AlarmName": "posl-suspicious-iam-activity",
  "MetricName": "IAMPolicyChanges",
  "ComparisonOperator": "GreaterThanThreshold",
  "Threshold": 0,
  "EvaluationPeriods": 1,
  "AlarmActions": [
    "arn:aws:sns:ap-northeast-1:ACCOUNT-ID:posl-security-alerts"
  ]
}
```

---

## ⚙️ 運用手順

### 1. 日常運用チェック

#### 週次確認項目
```
□ アクセスキー使用状況確認 (Last Used Date)
□ IAM権限使用状況確認 (Access Advisor)
□ CloudTrail異常ログ確認
□ セキュリティ違反アラート確認
```

#### 月次確認項目  
```
□ IAMユーザー・ロール棚卸し
□ 不要な権限の特定・削除
□ アクセスパターン分析
□ セキュリティベストプラクティス準拠確認
```

### 2. 緊急時対応手順

#### アクセスキー漏洩対応
```
1. 即座にアクセスキーを無効化:
   aws iam update-access-key --user-name [USER] --access-key-id [KEY] --status Inactive

2. CloudTrailでアクセスログ確認:
   aws logs filter-log-events --log-group-name CloudTrail/POSLAudit

3. 影響範囲調査・対策実施

4. 新しいアクセスキー発行・配布

5. インシデントレポート作成
```

#### 権限昇格検知時対応
```
1. 該当IAMユーザー・ロールの権限を一時的に最小化

2. 権限変更履歴の確認:
   aws iam get-account-authorization-details

3. 不正な権限変更の特定・ロールバック

4. セキュリティ監査の実施

5. 再発防止策の検討・実施
```

### 3. トラブルシューティング

#### よくある権限エラーと対処法

##### 1. S3アクセス拒否
```bash
# エラー例
An error occurred (AccessDenied) when calling the GetObject operation

# 確認手順
1. IAMポリシーでS3権限確認
2. S3バケットポリシー確認
3. オブジェクト所有者・ACL確認

# 対処法
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/posl-developer \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::posl-audio-files/test.mp3
```

##### 2. RDS接続拒否
```bash
# エラー例  
Access denied for user 'app' @ '[EC2-IP]' (using password: YES)

# 確認手順
1. RDSセキュリティグループ設定確認
2. データベースユーザー権限確認
3. VPC・サブネット設定確認

# 対処法
aws rds describe-db-instances \
  --db-instance-identifier posl-production \
  --query 'DBInstances[0].VpcSecurityGroups'
```

##### 3. CloudWatch Logs書き込み権限不足
```bash
# エラー例
The specified log group does not exist

# 対処法
aws logs create-log-group --log-group-name /aws/ec2/posl
aws logs put-retention-policy --log-group-name /aws/ec2/posl --retention-in-days 30
```

---

## 📊 権限監査レポートテンプレート

### 月次権限レビューレポート

```markdown
# IAM権限監査レポート - [YYYY年MM月]

## 概要
- 監査期間: [YYYY-MM-01] ~ [YYYY-MM-30]
- 監査対象: 3つのIAMリソース
- 異常検知件数: [N]件

## IAMユーザー使用状況

### ローカルPC用IAMユーザー (posl-developer)
- 最終使用日: [YYYY-MM-DD]
- 使用されたサービス: RDS, S3, CloudWatch
- アクセス異常: なし/[異常内容]

### GitHub Actions用IAMユーザー (posl-ci-cd)  
- 最終使用日: [YYYY-MM-DD]
- 使用されたサービス: EC2, SSM, S3
- デプロイ実行回数: [N]回

## IAMロール使用状況

### EC2ロール (posl-ec2-role)
- 使用インスタンス数: [N]台
- 主要アクセスサービス: RDS, S3, CloudWatch
- 異常アクセス: なし/[異常内容]

## 推奨アクション
- [ ] アクセスキーローテーション ([User Name])
- [ ] 不要権限の削除 ([Policy Name])  
- [ ] セキュリティ設定強化 ([Setting Name])

## 次回監査予定日
[YYYY-MM-DD]
```

---

## ✅ チェックリスト

### 構築前確認
- [ ] 既存IAMユーザー・ロールの詳細確認完了
- [ ] 権限要件の確定・承認完了
- [ ] セキュリティポリシーの確定・承認完了

### 構築時確認
- [ ] IAMポリシーの作成・アタッチ完了
- [ ] アクセスキーの設定・テスト完了
- [ ] CloudTrail監査設定完了

### 構築後確認
- [ ] 各権限での動作テスト完了
- [ ] セキュリティ監視アラート設定完了
- [ ] 運用手順書の準備完了
- [ ] 緊急時対応手順の準備完了

---

**更新履歴**
- 2025-11-17: 初版作成
- 2025-11-17: 既存IAMリソース活用設計追加
- 2025-11-17: セキュリティポリシー・運用手順詳細化