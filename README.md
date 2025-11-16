# 🚀 POSL (Personal Social Life) V1.0

POSLは「あなたの分身が書いたような、自然で前向きなX投稿」を毎日20時に自動生成・投稿するパーソナル投稿AIシステムです。

## 🎯 概要

- AIが文章を自動生成して、毎日1回X（旧Twitter）に投稿
- ユーザーの人格データ・日記・トレンド・曜日テーマを混ぜて一貫性のある発信を継続
- Next.js + AWS Serverlessによる現代的なアーキテクチャ

## 📊 開発進捗状況

### ✅ Phase 0: 準備フェーズ (完了)
- [x] Docker開発環境構築
- [x] GitHubリポジトリ初期化  
- [x] ESLint/Prettier設定
- [x] VSCode設定
- [x] プロジェクト構造作成

### ✅ Phase 1: バックエンド基盤 (完了)
- [x] Serverless Framework セットアップ
- [x] AWS サービス接続ライブラリ (DynamoDB, S3, Secrets Manager)
- [x] OpenAI API連携 (GPT-4, Whisper) 
- [x] X (Twitter) API連携
- [x] TypeScript型定義とユーティリティ

### 🚧 Phase 2: API Gateway + Lambda関数 (進行中)
- [ ] トレンド取得API実装
- [ ] DynamoDB CRUD操作層完成
- [ ] プロンプトエンジン実装
- [ ] 投稿生成システム実装

## 🛠 技術スタック

### バックエンド
- AWS Lambda (Node.js 18.x, TypeScript)
- API Gateway
- DynamoDB
- S3
- EventBridge
- Secrets Manager

### フロントエンド
- Next.js 14
- TypeScript
- Tailwind CSS
- Zustand (状態管理)

### 外部サービス
- OpenAI API (GPT-4, Whisper)
- X API
- Google Trends API

## 📁 プロジェクト構造

```
POSL/
├── frontend/          # Next.js アプリケーション
├── backend/           # Lambda 関数群
├── infrastructure/    # AWS インフラ設定
├── ドキュメント/      # 設計書類
└── docker-compose.yml # ローカル開発環境
```

## 🚀 開発環境セットアップ

### 前提条件
- Docker & Docker Compose
- Node.js 18.x
- AWS CLI

### ローカル開発環境

1. リポジトリクローン
```bash
git clone <repository-url>
cd POSL
```

2. Docker環境起動
```bash
docker-compose up -d
```

3. フロントエンド開発サーバー起動
```bash
cd frontend
npm install
npm run dev
```

4. バックエンド開発環境
```bash
cd backend
npm install
npm run dev
```

アプリケーションは `http://localhost:3000` でアクセス可能です。

## 📋 開発ロードマップ

### Phase 0: 準備フェーズ（1-2週間）
- [x] プロジェクト構造作成
- [ ] Docker開発環境構築
- [ ] Git初期化

### Phase 1: バックエンド基盤（2-3週間）
- [ ] Lambda基盤構築
- [ ] 外部API連携実装
- [ ] DynamoDB操作層実装

### Phase 2: API Gateway + Lambda関数（2-3週間）
- [ ] API設計・実装
- [ ] 認証・認可実装
- [ ] プロンプトエンジン実装

### Phase 3: フロントエンド開発（3-4週間）
- [ ] Next.js基盤構築
- [ ] UI画面実装（12画面）
- [ ] 状態管理・API連携

### Phase 4: スケジューラー + EventBridge（1週間）
- [ ] 自動投稿システム実装
- [ ] 日記処理システム

### Phase 5: テスト + 最適化（2週間）
- [ ] ユニット・統合・E2Eテスト
- [ ] パフォーマンス最適化
- [ ] セキュリティ監査

### Phase 6: 本番デプロイ（1週間）
- [ ] 本番環境構築
- [ ] モニタリング・運用体制

## 📚 ドキュメント

- [統合仕様書](./ドキュメント/統合仕様書.md)
- [アーキテクチャ設計](./ドキュメント/アーキテクチャ設計.md)
- [UI設計書](./ドキュメント/UI設計書.md)
- [プロンプト設計書](./ドキュメント/プロンプト設計書.md)
- [開発ロードマップ](./ドキュメント/開発ロードマップ.md)

## 🔐 環境変数

ローカル開発時は以下の環境変数を設定してください：

```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# X API
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_TOKEN_SECRET=your_x_access_token_secret

# AWS (ローカル開発時)
AWS_ENDPOINT_URL=http://localhost:8000
AWS_REGION=ap-northeast-1
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request