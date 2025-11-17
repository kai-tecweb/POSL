# AWS構築実行計画・テスト戦略書

**作成日**: 2025年11月17日  
**プロジェクト**: POSL AWS構築  
**対象**: テスト戦略・実行手順・リリース計画  

## 📋 目次

1. [実行概要](#実行概要)
2. [事前準備チェック](#事前準備チェック)
3. [段階別実行計画](#段階別実行計画)
4. [テスト戦略](#テスト戦略)
5. [リリース手順](#リリース手順)
6. [緊急時対応](#緊急時対応)
7. [成功判定基準](#成功判定基準)

---

## 🎯 実行概要

### 基本方針

- **段階的構築**: dev → staging → production の順次構築
- **テスト重視**: 各段階で十分な検証を実施
- **リスク最小化**: ロールバック可能な構築手順
- **ドキュメント化**: 全手順の記録・共有

### 構築スケジュール

```
Week 1-2: 開発環境構築・テスト
Week 3-4: ステージング環境構築・統合テスト  
Week 5-6: 本番環境構築・性能テスト
Week 7: 本番リリース・運用開始
```

### 成功指標

- **技術指標**: 稼働率99.9%、応答時間500ms以内、セキュリティ違反ゼロ
- **品質指標**: 全テストケース成功、運用手順書完備
- **ビジネス指標**: サービス停止時間最小化、機能利用率99%以上

---

## ✅ 事前準備チェック

### 1. AWS環境準備

#### アカウント・IAM設定
```bash
# AWS CLI設定確認
aws sts get-caller-identity

# IAMユーザー・ロール確認
aws iam list-users --query 'Users[?contains(UserName, `posl`)]'
aws iam list-roles --query 'Roles[?contains(RoleName, `posl`)]'

# 必要権限確認
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:user/posl-ci-cd \
  --action-names ec2:RunInstances s3:CreateBucket rds:CreateDBInstance \
  --resource-arns '*'
```

#### 事前作成リソース
```
✅ EC2キーペア作成済み
✅ SSL証明書 (ACM) 取得済み  
✅ Route53ホストゾーン設定済み
✅ Secrets Manager機密情報登録済み
```

### 2. 開発環境準備

#### ローカル環境
```bash
# 必要ツールバージョン確認
terraform version  # >= 1.0
aws --version      # >= 2.0
node --version     # >= 18.0
git --version      # >= 2.0

# プロジェクトクローン・依存関係インストール
git clone https://github.com/your-org/posl.git
cd posl
npm install
```

#### GitHub Actions設定
```yaml
# 必要なSecrets設定確認
secrets:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY  
  - DB_MASTER_PASSWORD
  - OPENAI_API_KEY
  - X_API_CREDENTIALS
```

### 3. ネットワーク・セキュリティ準備

#### VPC設計確認
```
本番環境:
  VPC CIDR: 10.0.0.0/16
  Public Subnets: 10.0.1.0/24, 10.0.2.0/24 (ALB)
  Private Subnets: 10.0.10.0/24, 10.0.20.0/24 (EC2)  
  Database Subnets: 10.0.30.0/24, 10.0.40.0/24 (RDS)
```

#### セキュリティ要件確認
```
✅ WAF規則定義完了
✅ セキュリティグループ規則設計完了
✅ IAMポリシー最小権限設計完了
✅ 暗号化設定 (RDS・S3・EBS) 確認完了
```

---

## 📅 段階別実行計画

### Phase 1: 開発環境構築 (Week 1)

#### Day 1-2: Terraform基盤構築
```bash
# 1. Terraformプロジェクト初期化
cd terraform/environments/dev
./../../scripts/init.sh dev

# 2. 開発環境プラン確認
./../../scripts/plan.sh dev

# 3. インフラ構築実行
./../../scripts/apply.sh dev
```

**構築対象**:
- [x] VPC・サブネット・ルートテーブル
- [x] セキュリティグループ・IAMロール
- [x] RDS開発インスタンス (db.t3.micro)
- [x] S3バケット (開発用)
- [x] CloudWatch・SNS設定

#### Day 3-5: アプリケーションデプロイ・テスト
```bash
# 1. データベーススキーマ作成
mysql -h dev-rds-endpoint -u admin -p < sql/schema.sql

# 2. アプリケーションデプロイ
cd ansible
ansible-playbook -i inventory/dev.yml playbooks/deploy-app.yml

# 3. 動作確認テスト
curl -X GET "http://dev-alb-dns/health"
curl -X POST "http://dev-alb-dns/api/settings/post-time" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","hour":20,"minute":0}'
```

**検証項目**:
- [x] 全API エンドポイント動作確認
- [x] データベース接続・CRUD操作確認
- [x] S3ファイルアップロード・ダウンロード確認
- [x] CloudWatchログ出力確認

### Phase 2: ステージング環境構築 (Week 2-3)

#### 本番環境と同等構成での統合テスト
```bash
# 1. ステージング環境構築
cd terraform/environments/staging  
./../../scripts/init.sh staging
./../../scripts/plan.sh staging
./../../scripts/apply.sh staging

# 2. 本番データ移行テスト
node scripts/export-dynamodb.js --env staging
node scripts/migrate-to-mysql.js --env staging  
node scripts/verify-migration.js --env staging

# 3. 負荷テスト実行
artillery run load-tests/api-load-test.yml --target https://staging-api.posl.example.com
```

**検証項目**:
- [x] DynamoDB→MySQL移行テスト成功
- [x] 全機能統合テスト成功
- [x] 負荷テスト性能要件クリア
- [x] セキュリティテスト脆弱性ゼロ

### Phase 3: 本番環境構築 (Week 4-5)

#### Week 4: インフラ構築
```bash
# 1. 本番環境Terraform実行
cd terraform/environments/production
./../../scripts/init.sh production  
./../../scripts/plan.sh production

# 管理者承認後
./../../scripts/apply.sh production

# 2. 本番環境設定
ansible-playbook -i inventory/production.yml playbooks/site.yml
```

#### Week 5: 本番データ移行・検証
```bash
# 1. 本番データバックアップ  
aws dynamodb create-backup --table-name posl-settings --backup-name pre-migration-backup

# 2. 段階的データ移行
node scripts/migrate-to-mysql.js --env production --batch-size 100 --dry-run
node scripts/migrate-to-mysql.js --env production --batch-size 100

# 3. データ整合性検証
node scripts/verify-migration.js --env production --thorough
```

### Phase 4: 本番リリース (Week 6-7)

#### 段階的サービス移行
```bash
# 1. 並行運用開始（DNS重み付け）
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
  --change-batch file://dns-migration-step1.json  # 10% traffic

# 2. 監視・検証（24時間）
./scripts/health-check.sh --continuous --duration 24h

# 3. 段階的トラフィック増加
# 50% traffic → 100% traffic (各24時間検証)

# 4. 完全移行・旧システム停止
aws lambda update-function-configuration --function-name posl-* \
  --environment Variables='{MAINTENANCE_MODE=true}'
```

---

## 🧪 テスト戦略

### 1. 単体テスト (Unit Testing)

#### 対象コンポーネント
```typescript
// MySQLHelper CRUD操作テスト
describe('MySQLHelper', () => {
  test('findOne should return correct record', async () => {
    const result = await MySQLHelper.findOne('settings', {
      user_id: 'test-user',
      setting_type: 'post-time'
    });
    expect(result).toHaveProperty('data');
  });

  test('create should insert new record', async () => {
    const newSetting = {
      user_id: 'test-user-2',
      setting_type: 'week-theme', 
      data: { monday: 'motivation' }
    };
    await MySQLHelper.create('settings', newSetting);
    
    const retrieved = await MySQLHelper.findOne('settings', {
      user_id: 'test-user-2',
      setting_type: 'week-theme'
    });
    expect(retrieved.data.monday).toBe('motivation');
  });
});

// PromptEngine統合テスト
describe('PromptEngine', () => {
  test('generatePost should create valid post content', async () => {
    const engine = new PromptEngine('test-user-001');
    const post = await engine.generatePost();
    
    expect(post).toHaveProperty('content');
    expect(post.content.length).toBeLessThanOrEqual(280);
    expect(post).toHaveProperty('metadata');
  });
});
```

#### 実行方法
```bash
# テスト環境セットアップ  
npm run test:setup

# 単体テスト実行
npm run test:unit

# カバレッジレポート生成
npm run test:coverage
```

### 2. 統合テスト (Integration Testing)

#### APIエンドポイントテスト
```javascript
// Jest + Supertest
describe('API Integration Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    app = require('../src/index');
    server = app.listen(3001);
  });

  afterAll(async () => {
    await server.close();
  });

  test('POST /api/settings/post-time', async () => {
    const response = await request(app)
      .post('/api/settings/post-time')
      .send({
        userId: 'test-user',
        hour: 20,
        minute: 0
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });

  test('GET /api/posts/logs', async () => {
    const response = await request(app)
      .get('/api/posts/logs')
      .query({ userId: 'test-user' })
      .expect(200);

    expect(response.body).toHaveProperty('posts');
    expect(Array.isArray(response.body.posts)).toBe(true);
  });
});
```

#### データベース統合テスト
```javascript
describe('Database Integration Tests', () => {
  test('Settings CRUD operations', async () => {
    const userId = 'integration-test-user';
    
    // Create
    await request(app)
      .post('/api/settings/week-theme')
      .send({
        userId,
        data: { monday: 'productivity', tuesday: 'creativity' }
      })
      .expect(200);

    // Read
    const getResponse = await request(app)
      .get(`/api/settings/week-theme`)
      .query({ userId })
      .expect(200);
    
    expect(getResponse.body.data.monday).toBe('productivity');

    // Update
    await request(app)
      .put('/api/settings/week-theme')
      .send({
        userId,
        data: { monday: 'motivation', tuesday: 'creativity' }
      })
      .expect(200);

    // Verify Update
    const updatedResponse = await request(app)
      .get('/api/settings/week-theme')
      .query({ userId })
      .expect(200);
    
    expect(updatedResponse.body.data.monday).toBe('motivation');
  });
});
```

### 3. 負荷テスト (Load Testing)

#### Artillery設定
```yaml
# load-tests/api-load-test.yml
config:
  target: 'https://staging-api.posl.example.com'
  phases:
    - duration: 300  # 5分間
      arrivalRate: 1
      name: "Warm up"
    - duration: 600  # 10分間  
      arrivalRate: 5
      name: "Normal load"
    - duration: 300  # 5分間
      arrivalRate: 10
      name: "Peak load"

scenarios:
  - name: "API Health Check"
    weight: 30
    flow:
      - get:
          url: "/health"
          
  - name: "Settings Operations"  
    weight: 40
    flow:
      - post:
          url: "/api/settings/post-time"
          json:
            userId: "load-test-{{ $randomString() }}"
            hour: 20
            minute: 0
      - get:
          url: "/api/settings/post-time"
          qs:
            userId: "load-test-user"

  - name: "Post Generation"
    weight: 20
    flow:
      - post:
          url: "/api/posts/generate-and-post"
          json:
            userId: "load-test-{{ $randomString() }}"
          
  - name: "Post Logs Retrieval"
    weight: 10
    flow:
      - get:
          url: "/api/posts/logs"
          qs:
            userId: "load-test-user"
```

#### 負荷テスト実行
```bash
# 基本負荷テスト
artillery run load-tests/api-load-test.yml

# レポート生成付き
artillery run load-tests/api-load-test.yml --output load-test-results.json
artillery report load-test-results.json

# CloudWatch監視と並行実行
artillery run load-tests/api-load-test.yml &
aws logs tail /aws/ec2/posl --follow &
```

#### 成功基準
```
平均応答時間: < 500ms
P95応答時間: < 1000ms  
P99応答時間: < 2000ms
エラー率: < 1%
スループット: > 50 req/sec
```

### 4. セキュリティテスト

#### OWASP ZAP自動化スキャン
```bash
# DockerでOWASP ZAP実行
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://staging-api.posl.example.com \
  -f openapi \
  -d \
  -P zap-report.html

# 脆弱性レポート確認
cat zap-report.html
```

#### AWS Config セキュリティ監査
```bash
# Security Hubでセキュリティ検査
aws securityhub get-findings \
  --filters '{"ResourceType":[{"Comparison":"EQUALS","Value":"AwsRdsDbInstance"}]}'

# IAMアクセス分析
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::ACCOUNT:role/posl-ec2-role
```

### 5. 災害復旧テスト

#### RDSフェイルオーバーテスト
```bash
# Multi-AZ フェイルオーバー実行
aws rds failover-db-instance --db-instance-identifier posl-production

# 復旧時間測定
start_time=$(date +%s)
while ! mysql -h $RDS_ENDPOINT -e "SELECT 1" >/dev/null 2>&1; do
  sleep 5
done
end_time=$(date +%s)
echo "Failover time: $((end_time - start_time)) seconds"
```

#### EC2インスタンス障害シミュレーション
```bash
# インスタンス強制終了
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# Auto Scaling による復旧確認
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names posl-production-asg \
  --query 'AutoScalingGroups[0].Instances'

# ALBヘルスチェック状態確認
aws elbv2 describe-target-health \
  --target-group-arn $TARGET_GROUP_ARN
```

---

## 🚀 リリース手順

### 段階的リリースプロセス

#### Phase 1: Blue-Green準備 (24時間前)
```bash
# 1. 本番環境最終確認
./scripts/health-check.sh --environment production --comprehensive

# 2. DNS TTL短縮 (切り替え高速化)
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://dns-ttl-reduction.json

# 3. 本番データ最終バックアップ
aws dynamodb create-backup \
  --table-name posl-settings \
  --backup-name pre-migration-final-backup

aws rds create-db-snapshot \
  --db-snapshot-identifier posl-production-pre-migration \
  --db-instance-identifier posl-production
```

#### Phase 2: サービス移行開始
```bash
# 1. メンテナンスモード有効化 (既存Lambda)
aws lambda update-function-configuration \
  --function-name posl-generateAndPost \
  --environment Variables='{MAINTENANCE_MODE=true}'

# 2. 最終データ移行実行
node scripts/incremental-migration.js --env production

# 3. 新システムヘルスチェック
./scripts/health-check.sh --target https://api.posl.example.com --retry 5

# 4. DNS切り替え (10%トラフィック)
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://dns-migration-10percent.json
```

#### Phase 3: 段階的トラフィック増加
```bash
# 30分ごとにトラフィック増加
# 10% → 25% → 50% → 75% → 100%

for percentage in 25 50 75 100; do
  echo "Increasing traffic to ${percentage}%..."
  
  aws route53 change-resource-record-sets \
    --hosted-zone-id $HOSTED_ZONE_ID \
    --change-batch file://dns-migration-${percentage}percent.json
  
  # 30分待機・監視
  sleep 1800
  
  # ヘルスチェック
  if ./scripts/health-check.sh --silent; then
    echo "✅ ${percentage}% migration successful"
  else
    echo "❌ ${percentage}% migration failed - initiating rollback"
    ./scripts/rollback.sh
    exit 1
  fi
done
```

#### Phase 4: 完全移行・クリーンアップ
```bash
# 1. 旧システム完全停止
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `posl-`)]' | \
  jq -r '.[].FunctionName' | \
  xargs -I {} aws lambda delete-function --function-name {}

# 2. DynamoDBテーブル削除
aws dynamodb delete-table --table-name posl-settings
aws dynamodb delete-table --table-name posl-posts  
aws dynamodb delete-table --table-name posl-diaries

# 3. 不要リソースクリーンアップ
aws cloudformation delete-stack --stack-name posl-serverless-stack

# 4. DNS TTL復旧
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://dns-ttl-restore.json

# 5. 成功通知
./scripts/notify-migration-success.sh
```

---

## 🆘 緊急時対応

### ロールバック手順

#### 即座のロールバック (5分以内)
```bash
#!/bin/bash
# scripts/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# 1. DNS即座切り戻し
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://dns-rollback-emergency.json

# 2. 旧システム再有効化
aws lambda update-function-configuration \
  --function-name posl-generateAndPost \
  --environment Variables='{MAINTENANCE_MODE=false}'

# 3. 新システム緊急停止
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name posl-production-asg \
  --desired-capacity 0

# 4. 緊急通知送信
aws sns publish \
  --topic-arn arn:aws:sns:ap-northeast-1:ACCOUNT:posl-emergency-alerts \
  --subject "POSL Emergency Rollback Executed" \
  --message "Emergency rollback completed. System reverted to legacy Lambda architecture."

echo "✅ Emergency rollback completed"
```

#### データ復旧手順
```bash
# 1. RDS スナップショット復旧
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier posl-production-recovery \
  --db-snapshot-identifier posl-production-pre-migration

# 2. DynamoDB復旧
aws dynamodb restore-table-from-backup \
  --target-table-name posl-settings \
  --backup-arn arn:aws:dynamodb:ap-northeast-1:ACCOUNT:table/posl-settings/backup/pre-migration-final-backup

# 3. S3データ復旧 (必要に応じて)
aws s3 sync s3://posl-audio-files-backup s3://posl-audio-files --delete
```

### 障害対応フローチャート

```
障害検知
    ↓
ヘルスチェック実行
    ↓
障害レベル判定
    ↓
┌─────────────────┬─────────────────┐
│ Level 1: 軽微    │ Level 2: 重大   │ Level 3: 致命的
│ (エラー率<5%)   │ (エラー率5-20%) │ (エラー率>20%)
│                │                │
│ → 監視継続      │ → 調査・修正   │ → 即座ロールバック
│ → 自動修復試行  │ → 30分制限     │ → 緊急対応チーム招集
└─────────────────┴─────────────────┴─────────────────
```

---

## 📏 成功判定基準

### 技術指標

#### システム性能
```
✅ API応答時間
  - 平均: < 500ms
  - P95: < 1000ms  
  - P99: < 2000ms

✅ 稼働率
  - 目標: 99.9% (月間43分以内ダウンタイム)
  - 測定期間: リリース後30日間

✅ スループット
  - 同時接続: 100セッション対応
  - API処理: 50 req/sec以上

✅ エラー率
  - HTTP 5xx: < 0.1%
  - API処理エラー: < 1%
```

#### データ整合性
```
✅ 移行データ整合性
  - 全レコード数一致: 100%
  - データ内容一致: 99.9%以上
  - 関連データ整合性: 100%

✅ リアルタイム同期
  - 新規データ処理: 正常動作100%
  - バックアップ処理: 正常動作100%
```

### 運用指標

#### 監視・アラート
```
✅ 監視体制
  - CloudWatch監視: 24時間稼働
  - アラート応答: 5分以内
  - 障害通知: SNS経由即座配信

✅ ログ管理
  - アプリケーションログ: 100%取得
  - システムログ: 100%取得  
  - ログ検索: 1秒以内応答
```

#### セキュリティ
```
✅ セキュリティ要件
  - 脆弱性: Critical/High = 0件
  - アクセス制御: 最小権限100%適用
  - 暗号化: 保存時・転送時100%適用

✅ 監査対応
  - CloudTrail: 全操作ログ記録
  - アクセスログ: 6ヶ月保持
  - セキュリティ監査: 月次実施
```

### ビジネス指標

#### サービス継続性
```
✅ サービス影響
  - 計画停止時間: 4時間以内
  - 予期しない停止: 0分
  - データ損失: 0件

✅ 機能提供
  - 全API機能: 100%提供継続
  - 投稿生成: 100%正常動作
  - 日記処理: 100%正常動作
```

#### ユーザー体験
```
✅ 利用体験
  - 機能応答性: 改善または同等維持
  - エラー発生: 移行前比較で改善
  - 新機能利用: 安定提供開始
```

---

## 📋 最終チェックリスト

### 構築完了確認
- [ ] **インフラ**: 全AWS リソース正常稼働
- [ ] **アプリケーション**: 全API機能正常動作
- [ ] **データベース**: MySQL接続・CRUD操作正常
- [ ] **ストレージ**: S3ファイル操作正常
- [ ] **監視**: CloudWatch・SNSアラート正常動作

### テスト完了確認  
- [ ] **単体テスト**: 全テストケース成功・90%カバレッジ達成
- [ ] **統合テスト**: 全APIシナリオ成功
- [ ] **負荷テスト**: 性能要件クリア
- [ ] **セキュリティテスト**: 脆弱性ゼロ確認
- [ ] **災害復旧テスト**: RTO/RPO目標達成

### 運用準備確認
- [ ] **ドキュメント**: 運用手順書・障害対応手順完備
- [ ] **監視**: 24時間監視体制構築完了
- [ ] **バックアップ**: 自動バックアップ設定完了
- [ ] **セキュリティ**: IAM権限・暗号化設定完了

### リリース準備確認
- [ ] **DNS**: 切り替え準備・TTL調整完了
- [ ] **データ移行**: 移行スクリプト・検証完了
- [ ] **ロールバック**: 緊急時手順準備・テスト完了
- [ ] **通知**: ステークホルダー連絡体制確立

---

**最終承認**

| 項目 | 責任者 | 承認日 | サイン |
|------|--------|--------|--------|
| 技術設計 | Technical Lead | YYYY-MM-DD | _______ |
| セキュリティ設計 | Security Officer | YYYY-MM-DD | _______ |
| 運用設計 | Operations Manager | YYYY-MM-DD | _______ |
| 最終承認 | Project Manager | YYYY-MM-DD | _______ |

---

**更新履歴**
- 2025-11-17: 初版作成
- 2025-11-17: テスト戦略詳細化
- 2025-11-17: リリース手順・緊急対応追加