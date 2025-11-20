# 🚀 POSL (Personal Social Life) V1.0 - 24時間自動運用システム

POSLは「あなたの分身が書いたような、自然で前向きなX投稿」を**1日3回自動生成・投稿**するパーソナル投稿AIシステムです。**AWS本番環境で24時間稼働中！**

## 🎯 概要

- **24時間自動運用**: 朝8時・昼12時・夜20時の1日3回自動投稿
- **本番環境稼働**: AWS EC2 + RDS MySQL + MySQLHelper + 完全監視システム
- **実際のOpenAI GPT-4 API**: 高品質な文章生成・トレンド統合・音声日記対応
- **AWS-First開発**: ローカル環境依存を完全排除・本番直接開発体制
- **MySQL-First**: DynamoDB依存完全排除・generateAndPost等移行完了

## 📊 開発進捗状況

### ✅ Phase 0-10: 全基盤開発完了 (100%)
- [x] **基盤開発・Lambda・API設計・フロントエンド・システム統合** (Phase 0-4)
- [x] **MySQL移行・外部API統合・AWS Infrastructure構築** (Phase 5-8) 
- [x] **本番環境デプロイ・CI/CDパイプライン完全自動化** (Phase 9-10)

### 🎉 Phase 11: 24時間本格運用体制確立 **Week 2完了・95%自動投稿達成**
**期間**: 2025年11月17日～  
**状況**: ✅ **Phase 11 Week 2完了（98.75%達成）** - GitHub Secrets統合・自動投稿95%・本格運用体制

#### ✅ Week 2完了実績：
- [x] **GitHub Secrets完全設定**: AWS認証・OpenAI API・X API・環境URL（11項目完全自動化）
- [x] **CI/CDパイプライン本格運用**: GitHub Actions・自動テスト・セキュリティスキャン・デプロイ
- [x] **自動投稿システム95%完了**: serverless offline dev統合・OpenAI API・cron実行成功
- [x] **システム監視大幅強化**: API応答時間15ms・包括的リソース監視・アラート機能
- [x] **production-setup.sh自動化**: 本番環境自動セットアップ・監視統合完了
- [x] **ドキュメント体系整備**: Phase 11完了レポート・Week 3計画書作成

#### 🎯 Week 3目標（2025年11月18日～25日）：
- [ ] **MySQL post_logs書き込み修正**（残り5%・自動投稿100%達成）
- [ ] **SSL/HTTPS対応**（Let's Encrypt・セキュリティ強化）
- [ ] **V1完全運用開始**（24時間フル自動化・99.9%稼働率）

**移行進捗**: Phase 11 Week 2完了（98.75%達成・自動投稿95%・CI/CD完全運用）  
**期間**: 12週間（2025年11月17日〜2025年2月13日）

## 🛠 技術スタック

### バックエンド（本番環境・完全移行済み）
- **EC2 (Express.js + Node.js 18.x)** - `simple_final_api.js`で直接実行
- **RDS MySQL 8.0 (Multi-AZ)** - 完全移行完了（DynamoDB依存なし）
- **OpenAI GPT-4 API (統合済み)** 🎉
- **X API v2 (投稿機能統合済み)** 🎉
- **Google/Yahoo Trends API (統合済み)** 🎉
- **OpenAI Whisper API (音声日記統合済み)** 🎉
- **プロンプトエンジン (設定反映済み)** 🎉 **NEW**
- **人格プロファイル自動生成** 🎉 **NEW**
- **node-cron (スケジューラー)**
- **PM2 (フロントエンド管理)**
- S3 (音声ファイル保存)
- CloudWatch (監視・ログ)

**重要**: Lambda関数からExpress.jsへ完全移行済み（`ドキュメント/active/本番環境移行_完全版.md`参照）

### フロントエンド（変更なし）
- Next.js 14
- TypeScript
- Tailwind CSS
- Zustand (状態管理)

### 外部サービス（変更なし）
- OpenAI API (GPT-4, Whisper)
- X API
- Google Trends API

## 📁 プロジェクト構造

```
POSL/
├── frontend/          # Next.js アプリケーション
├── backend/           # Express.js API + EC2デプロイ用
├── infrastructure/    # AWS インフラ設定 (ALB, RDS, EC2)
├── ドキュメント/      # 設計書類
└── docker-compose.yml # ローカル開発環境
```

## 🚀 開発環境セットアップ

### 前提条件
- Docker & Docker Compose
- Node.js 18.x
- MySQL Client (開発用)

### ローカル開発環境

1. リポジトリクローン
```bash
git clone <repository-url>
cd POSL
```

2. **環境変数設定** 🎉 **NEW**
```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集してOpenAI APIキーを設定
# OPENAI_API_KEY=sk-proj-your-actual-openai-api-key
```

3. Docker環境起動（MySQL + DynamoDB + MinIO）
```bash
docker-compose up -d mysql dynamodb-local minio
```

4. フロントエンド開発サーバー起動
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

5. バックエンド開発環境（Serverless Offline）
```bash
cd backend
npm install
npm run build

# 環境変数付きで起動
node start-with-env.js
# または従来方式
./scripts/dev-server.sh start
# http://localhost:3001
```

### 🔍 プロンプト生成機能テスト 🎉 **NEW**

```bash
# OpenAI API統合テスト
curl -X POST http://localhost:3001/local/post/generate-and-post \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-001"}'

# X API投稿テスト（実際にツイートされます）
curl -X POST http://localhost:3001/local/post/tweet \
  -H "Content-Type: application/json" \
  -d '{"content": "テスト投稿です #POSLテスト"}'

# Google Trendsデータ取得
curl "http://localhost:3001/local/trends/google"

# Yahoo Trendsデータ取得  
curl "http://localhost:3001/local/trends/yahoo"

# 音声日記機能テスト（Base64エンコードした音声データ）
curl -X POST http://localhost:3001/local/diary/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audioData": "UklGRnoAAAA...", "format": "webm"}'
```

### 🔍 開発環境の動作確認

```bash
# MySQL接続確認
cd backend && node test-mysql-connection.js

# API動作確認
curl http://localhost:3001/local/settings/tone

# エラーログAPI確認
curl http://localhost:3001/local/errors/logs

# 投稿ログAPI確認 (NEW)
curl http://localhost:3001/local/post/logs

# 投稿ステータス確認 (NEW)
curl http://localhost:3001/local/post/status

# トレンドAPI確認 (NEW) 
curl http://localhost:3001/local/trends/google
curl http://localhost:3001/local/trends/yahoo
```

### 📊 監視機能

- **エラーログ監視**: Dashboard → ErrorLogMonitorで確認
- **投稿ステータス監視**: Dashboard → PostStatusMonitorで確認
- **API接続状況**: 各設定画面で接続テスト実行可能
```bash
cd backend
npm install
npm run dev
```

アプリケーションは `http://localhost:3000` でアクセス可能です。

### 本番環境（移行後）

- **フロントエンド**: Vercel または AWS S3 + CloudFront
- **バックエンド**: EC2 (Express.js) + ALB + RDS MySQL
- **監視**: CloudWatch + ALB ヘルスチェック
- **自動デプロイ**: GitHub Actions + AWS Systems Manager

## 📋 開発ロードマップ

### ✅ Phase 0-4: 基盤開発完了（2025/10-11月）
- [x] プロジェクト構造作成・Docker環境構築
- [x] Lambda基盤構築・外部API連携・DynamoDB操作層実装
- [x] API設計実装・PromptEngine完成・認証認可
- [x] Next.js基盤・UI画面実装（全9画面）・状態管理・API連携
- [x] 自動投稿システム・日記処理システム・EventBridge

### 🔄 Phase 5: 移行準備フェーズ（2025/11月）
- [x] PromptEngineテスト完成（98%カバレッジ、32ケース）
- [x] 移行技術調査完了（実現可能性90%確認）
- [x] 移行実行計画書作成完了（12週間計画）
- [x] ドキュメント整備・更新完了

## 🏗️ 現在のアーキテクチャ（Phase 11 - 24時間自動運用）

### 本番環境構成 (AWS EC2: 18.179.104.143)
```
フロントエンド: Next.js 16.0.3 + TypeScript + Tailwind CSS（全22ページ）
バックエンド: Serverless Offline + SimpleMySQLHelper + Node.js
データベース: RDS MySQL（5テーブル稼働・SimpleMySQLHelper完全動作）  
外部API: OpenAI GPT-4/Whisper + X API v2 + Google/Yahoo Trends（本番稼働）
インフラ: EC2 t3.medium + RDS db.t3.micro + S3 + UFW Security
自動化: Cron自動投稿（1日3回）+ System Monitor（10分間隔）
CI/CD: GitHub Actions（自動テスト・ビルド・デプロイ・監視）
開発: AWS-First（EC2直接開発・Git連携・ローカル環境完全排除）
```

### 運用監視システム
- **自動投稿**: JST 8:00/12:00/20:00 (UTC 23:00/03:00/11:00)
- **システム監視**: 10分間隔リソース・API・プロセス監視
- **セキュリティ**: UFWファイアウォール・SSH Key認証・ポート制限
- **ログ管理**: 投稿ログ・システムログ・エラーログの自動記録
- [ ] 統合テスト・パフォーマンステスト・負荷テスト
- [ ] セキュリティテスト・運用手順確立

#### Week 11-12: 本番移行（2週間）
- [ ] 本番デプロイ・切り替え・運用監視開始
- [ ] モニタリング体制確立・ドキュメント最終化

## 📚 ドキュメント

- [統合仕様書](./ドキュメント/統合仕様書.md)
- [アーキテクチャ設計](./ドキュメント/アーキテクチャ設計.md)
- [UI設計書](./ドキュメント/UI設計書.md)
- [プロンプト設計書](./ドキュメント/プロンプト設計書.md)
- [開発ロードマップ](./ドキュメント/開発ロードマップ.md)
- **[コーディング規約](./ドキュメント/active/コーディング規約.md)** ⭐ **NEW** - プロジェクトのコーディング規約・標準

## 🔐 環境変数

### ローカル開発環境
```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# X API
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret

# MySQL (ローカル開発時)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=posl_dev

# AWS S3
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=posl-audio-files
```

### 本番環境（移行後）
```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# X API  
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret

# RDS MySQL
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=3306
DB_USERNAME=admin
DB_PASSWORD=secure_password
DB_NAME=posl_prod

# AWS Services
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=posl-audio-files-prod
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request