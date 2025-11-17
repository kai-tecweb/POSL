# 🚀 POSL (Personal Social Life) V1.0

POSLは「あなたの分身が書いたような、自然で前向きなX投稿」を毎日20時に自動生成・投稿するパーソナル投稿AIシステムです。

## 🎯 概要

- AIが文章を自動生成して、毎日1回X（旧Twitter）に投稿
- ユーザーの人格データ・日記・トレンド・曜日テーマを混ぜて一貫性のある発信を継続
- **実際のOpenAI GPT-4 APIによる高品質な文章生成**
- **EC2+RDS(MySQL)+Express.js による24時間稼働の安定アーキテクチャ**

## 📊 開発進捗状況

### ✅ Phase 0-4: 基盤開発 (完了)
- [x] Docker開発環境構築
- [x] DynamoDB設計・Lambda基盤構築
- [x] **PromptEngine v1.0完成+テスト32ケース**
- [x] **Next.jsフロントエンド開発完全完成**（全9画面）
- [x] **スケジューラー・API統合機能完成**

### ✅ Phase 5: 移行準備フェーズ (大部分完了)
- [x] **PromptEngineテスト完了**（98%カバレッジ）
- [x] **移行技術調査完了**（実現可能性90%確認）
- [x] **移行実行計画書作成完了**
- [x] **MySQL開発環境構築完了**（Docker + MySQL 8.0）
- [x] **MySQLHelper実装完了**（DynamoDB互換API・動作テスト済み）

### ✅ Phase 6: アーキテクチャ移行フェーズ (完了) 🎉
- [x] **MySQL基盤構築完了**（スキーマ設計・初期化・テスト）
- [x] **MySQLHelper実装完了**（DynamoDB完全互換）
- [x] **PromptEngine MySQL統合完了**（17テストケース確認済み）
- [x] **ErrorLogMonitor実装完了**（システム監視・エラー管理）
- [x] **OpenAI API本格統合完了** 🎉
  - 実際のGPT-4 API通信成功
  - プロンプト生成機能実稼働（4-9秒応答）
  - 環境変数管理・dotenv統合完了

### ✅ Phase 7: 外部API統合フェーズ (完了) 🎉 **NEW**
- [x] **X API統合完了**（実際の投稿機能・POST /post/tweet）
- [x] **Google Trends API統合完了**（PyTrendsライブラリ・GET /trends/google）
- [x] **Yahoo Trends API統合完了**（モックデータ生成・GET /trends/yahoo）
- [x] **音声日記機能完了**（Whisper API・POST /diary/transcribe）
- [x] **自動投稿スケジューラー完成**（MySQL統合・cron稼働・実投稿対応）

### 🔄 Phase 8: フロントエンド機能拡張 (次期)
- [ ] **トレンド監視画面**（リアルタイムトレンド表示・分析機能）
- [ ] **音声日記録音UI**（ブラウザ録音・Whisper統合）
- [ ] **投稿プレビュー機能**（生成前確認・手動調整）
- [ ] **統合テスト・動作確認**（E2Eテスト・パフォーマンス検証）

**移行進捗**: Phase 10完了（100%完了・CI/CD革命達成）  
**期間**: 12週間（2025年11月17日〜2025年2月13日）

## 🛠 技術スタック

### バックエンド（移行後・本番稼働中）
- **EC2 (Express.js + Node.js 18.x, TypeScript)**
- **RDS MySQL 8.0 (Multi-AZ)**
- **Application Load Balancer**
- **OpenAI GPT-4 API (統合済み)** 🎉
- **X API v2 (投稿機能統合済み)** 🎉 **NEW**
- **Google/Yahoo Trends API (統合済み)** 🎉 **NEW**
- **OpenAI Whisper API (音声日記統合済み)** 🎉 **NEW**
- **node-cron (スケジューラー)**
- **PM2 + systemd (プロセス管理)**
- S3 (音声ファイル保存)
- CloudWatch (監視・ログ)
- **GitHub Actions CI/CD (完全自動化)** 🚀 **NEW**

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

### 🚀 Phase 6: アーキテクチャ移行フェーズ（2025/11/18〜2025/2/13）
#### Week 1-3: インフラ構築（3週間）
- [ ] RDS MySQL設計・構築・セキュリティ設定
- [ ] EC2環境構築・ALB設定・ネットワーク設計
- [ ] CloudWatch監視・S3統合・セキュリティ設定

#### Week 4-8: アプリケーション移行（5週間）  
- [ ] MySQLHelper実装・DynamoDB→MySQL移行
- [ ] Express.js統合API・node-cronスケジューラー実装
- [ ] フロントエンドエンドポイント更新・統合テスト

#### Week 9-10: テスト＆最適化（2週間）
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