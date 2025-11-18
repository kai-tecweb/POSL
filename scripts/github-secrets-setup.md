# 🔐 GitHub Secrets 設定ガイド

**Phase 11 Week 2**: CI/CD本格運用のための必須Secret設定

## 📋 必須Secrets一覧

### 🚀 AWS Infrastructure
```bash
AWS_ACCESS_KEY_ID          # AWS IAMアクセスキーID
AWS_SECRET_ACCESS_KEY      # AWS IAMシークレットアクセスキー
```

### 🤖 外部API認証
```bash
OPENAI_API_KEY             # OpenAI GPT-4 APIキー
TWITTER_API_KEY            # X (Twitter) Consumer Key
TWITTER_API_SECRET         # X (Twitter) Consumer Secret  
TWITTER_ACCESS_TOKEN       # X (Twitter) Access Token
TWITTER_ACCESS_TOKEN_SECRET # X (Twitter) Access Token Secret
```

### 🌐 環境URL設定
```bash
DEV_API_URL               # 開発環境APIエンドポイント
PROD_API_URL              # 本番環境APIエンドポイント (http://18.179.104.143:3001)
```

### 📦 S3/CloudFront設定
```bash
DEV_S3_BUCKET             # 開発環境S3バケット
PROD_S3_BUCKET            # 本番環境S3バケット
DEV_CLOUDFRONT_ID         # 開発環境CloudFront Distribution ID
PROD_CLOUDFRONT_ID        # 本番環境CloudFront Distribution ID
```

### 📢 通知・監視設定
```bash
SLACK_WEBHOOK_URL         # Slack通知用Webhookプライマリ
SNYK_TOKEN               # セキュリティスキャン用（オプション）
SONAR_TOKEN              # コード品質監視用（オプション）
```

## 🔧 セットアップ手順

### 1. GitHubリポジトリSecretsに移動
```
https://github.com/kai-tecweb/POSL/settings/secrets/actions
```

### 2. 必須Secretsを順次登録
各Secretについて「New repository secret」で登録

### 3. 設定値の例

#### AWS設定
- `AWS_ACCESS_KEY_ID`: AKIAI...（IAMユーザーのアクセスキー）
- `AWS_SECRET_ACCESS_KEY`: wJalrXUt...（IAMユーザーのシークレット）

#### 本番環境URL
- `PROD_API_URL`: `http://18.179.104.143:3001`
- `DEV_API_URL`: `http://18.179.104.143:3001` (本番と統一)

#### S3バケット（現在の設定）
- `PROD_S3_BUCKET`: `posl-audio-storage-prod-iwasaki-2024`
- `DEV_S3_BUCKET`: `posl-audio-storage-dev-iwasaki-2024`

## ⚡ 設定確認

### GitHub Actions動作確認
```bash
# プッシュ時にActions動作確認
git add .
git commit -m "🔐 GitHub Secrets設定完了テスト"
git push origin main
```

### CI/CDパイプライン確認ポイント
- [ ] Build Job成功
- [ ] Test Job実行
- [ ] Deploy Job実行（本番環境）
- [ ] Health Check成功
- [ ] Slack通知受信

## 🚨 セキュリティ注意事項

1. **Secretsの最小権限**: 必要最小限の権限のみ設定
2. **定期更新**: API Keyの定期的な更新・ローテーション
3. **アクセス監視**: GitHubアクセスログの定期確認
4. **バックアップ**: 重要な認証情報の安全な保管

## 🎯 完了後の確認事項

- [ ] 全必須Secrets設定完了
- [ ] CI/CDパイプライン正常実行
- [ ] 本番環境デプロイ成功  
- [ ] API動作確認完了
- [ ] 監視・通知システム稼働

**🎉 設定完了により24時間CI/CD自動運用体制が確立されます！**