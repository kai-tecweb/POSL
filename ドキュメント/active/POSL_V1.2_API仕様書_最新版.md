# POSL V1.2 API仕様書 - 最新版

**更新日**: 2025年11月19日  
**バージョン**: V1.2  
**API基盤**: Node.js Express + TypeScript

## 🚀 API概要

POSLシステムのRESTful APIドキュメントです。AI投稿生成、設定管理、データ取得の機能を提供します。

### ベースURL
```
http://localhost:3001
```

### 認証
現在の実装では認証は不要です（内部システム利用）

### レスポンス形式
```json
{
  "success": true|false,
  "message": "メッセージ",
  "data": {}, 
  "error": "エラー詳細（エラー時のみ）"
}
```

## 📝 投稿管理API

### AI投稿生成・投稿
**実際のX投稿を行うメインエンドポイント**

```
POST /dev/post/ai-with-x
```

**機能**: OpenAI GPT-4で投稿文生成 → X投稿 → DB保存

**レスポンス例**:
```json
{
  "success": true,
  "message": "AI投稿とX投稿処理完了",
  "data": {
    "content": "🚀POSLはAI投資分析の最前線を走っています！...",
    "tweetId": "1990943156742074435",
    "status": "posted",
    "xPostResult": "success",
    "xPostError": null,
    "tweetUrl": "https://x.com/posl_ai/status/1990943156742074435",
    "timestamp": "2025-11-19T00:40:13.345Z",
    "aiModel": "gpt-4",
    "note": "X投稿成功"
  }
}
```

### シンプルAI投稿
```
POST /dev/post/simple-ai
```

**機能**: OpenAI GPT-4で投稿文生成（X投稿エラー時はDB保存のみ）

### テスト投稿
```
POST /dev/post/test-generate
```

**機能**: 事前準備された投稿文でDB保存（X投稿なし）

### 実投稿（事前準備文）
```
POST /dev/post/real-post
```

**機能**: 事前準備された投稿文でX投稿試行

### 従来のAI投稿（プロンプトエンジン使用）
```
POST /dev/post/generate-and-post
```

**機能**: プロンプトエンジン経由でのAI投稿（設定により動作）

## ⚙️ 設定管理API

### 投稿時刻設定
```
PUT /dev/settings/post-time
```

**リクエストボディ**:
```json
{
  "hour": 9,
  "minute": 50
}
```

**機能**:
- データベースの投稿時刻設定を更新
- cron設定を自動更新（JST→UTC変換）
- 新しい時刻で自動投稿スケジュール開始

**レスポンス例**:
```json
{
  "success": true,
  "message": "投稿時刻を9:50に設定しました"
}
```

### 投稿時刻取得
```
GET /dev/settings/post-time
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "hour": 9,
    "minute": 50,
    "timezone": "Asia/Tokyo",
    "enabled": true
  }
}
```

## 📊 データ取得API

### トレンド情報取得
```
GET /api/trends
```

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "trend_name": "AI投資",
      "tweet_volume": 15000,
      "category": "テクノロジー",
      "country_code": "JP",
      "fetched_at": "2025-11-19T00:00:00.000Z",
      "trend_data": {}
    }
  ]
}
```

### 投稿ログ取得
```
GET /api/post/logs?limit=20
```

**クエリパラメータ**:
- `limit` (optional): 取得件数（デフォルト: 20）

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 8,
      "user_id": "demo",
      "content": "🚀POSLが投資界に革命を起こします！...",
      "tweet_id": "ai_1763512649843",
      "status": "posted",
      "posted_at": "2025-11-19T00:37:30.000Z",
      "created_at": "2025-11-19T00:37:30.000Z",
      "updated_at": "2025-11-19T00:37:30.000Z"
    }
  ],
  "total": 1,
  "limit": 20
}
```

### 投稿状況取得
```
GET /api/post/status
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "recent_posts": [...],
    "today_post_count": 3,
    "next_scheduled_time": "9:50",
    "status": "active"
  }
}
```

### エラーログ取得
```
GET /api/errors/logs?limit=20
```

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": "demo",
      "error_type": "API_ERROR",
      "error_message": "X投稿失敗",
      "stack_trace": "...",
      "timestamp": "2025-11-19T00:00:00.000Z",
      "severity": "HIGH",
      "resolved": false,
      "request_data": {}
    }
  ],
  "total": 1,
  "limit": 20
}
```

### 一般ログ取得
```
GET /api/logs
```

### Googleトレンド取得
```
GET /api/trends/google
```

**レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "keyword": "フィンテック",
      "volume": 25000,
      "category": "Technology",
      "country": "JP",
      "timestamp": "2025-11-19T00:00:00.000Z",
      "source": "google_trends",
      "trend_data": {}
    }
  ],
  "source": "Google Trends API",
  "last_updated": "2025-11-19T00:46:37.000Z"
}
```

## 🔧 実装詳細

### CORS設定
```javascript
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "PUT,GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
```

### エラーハンドリング
すべてのエンドポイントで統一されたエラーハンドリング:
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### データベース接続
MySQL2 Promise APIを使用:
```javascript
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});
```

### OpenAI統合
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  max_tokens: 300,
  temperature: 0.7
});
```

### X API統合
```javascript
const { XHelper } = require("./dist/libs/x-api.js");
const postResult = await XHelper.postTweet(content);
```

## 🚨 エラーコード

### HTTP ステータスコード
- `200`: 成功
- `400`: リクエストエラー
- `500`: サーバーエラー

### アプリケーションエラー
- `AI_ERROR`: OpenAI API呼び出し失敗
- `X_API_ERROR`: X投稿失敗
- `DB_ERROR`: データベースエラー
- `VALIDATION_ERROR`: 入力値検証エラー

## 📈 パフォーマンス

### レスポンス時間目安
- 設定API: 〜100ms
- データ取得API: 〜200ms
- AI投稿API: 2-5秒（OpenAI処理時間含む）

### レート制限
- 現在制限なし（内部システム利用）
- OpenAI APIのレート制限に依存

## 🔐 セキュリティ

### 環境変数
- `OPENAI_API_KEY`: OpenAI API認証
- `X_API_KEY`, `X_API_SECRET`: X API認証
- `MYSQL_*`: データベース認証

### アクセス制御
- localhost のみアクセス許可
- プロダクション環境では適切な認証実装推奨

---

**API実装**: Node.js Express + TypeScript  
**作成**: GitHub Copilot  
**更新**: 2025年11月19日