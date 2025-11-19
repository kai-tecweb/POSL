# 📡 POSL API エンドポイント仕様書 v2.0

**最終更新**: 2025年11月18日（Phase 11 Week 2完了・自動投稿95%・serverless dev統合）  
**ベースURL**: `http://localhost:3001/dev`（serverless offline・本番環境）  
**API バージョン**: v2.0（自動投稿・GitHub Secrets統合対応）

---

## 🚀 Phase 11 Week 2完了実績

### 自動投稿システム95%完了 🎉
### GitHub Secrets完全設定（11項目） 🎉  
### serverless offline dev stage統合 🎉
### system-monitor.sh監視強化（15ms API応答） 🎉

---

## 📋 エンドポイント一覧

### 🔧 システム・設定関連

#### GET /settings/{settingType}
設定情報を取得

**パラメータ:**
- `settingType`: "tone" | "prompt" | "template" | "week-theme" | "events" | "trends"

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "politeness": 70,
    "positivity": 80,
    "formality": 30,
    "emoji": 50,
    "technical": 20
  }
}
```

#### PUT /settings/{settingType}
設定情報を更新

**リクエストボディ:**
```json
{
  "politeness": 70,
  "positivity": 80,
  "formality": 30
}
```

---

### 📝 投稿関連

#### POST /post/tweet 🎉 **NEW**
X（Twitter）に実際に投稿

**リクエストボディ:**
```json
{
  "content": "投稿内容（280文字以内）",
  "userId": "user-001"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "tweetId": "1234567890",
    "content": "投稿内容",
    "url": "https://twitter.com/user/status/1234567890",
    "engagement": {
      "expectedLikes": 5,
      "expectedRetweets": 2
    }
  }
}
```

#### POST /post/generate-and-post 🎉 **ENHANCED**
自動投稿生成・実行（MySQL統合・X投稿対応）

**リクエストボディ:**
```json
{
  "userId": "user-001",
  "testMode": false
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "message": "Post generated successfully",
    "postLog": {
      "postId": "abc123def456",
      "content": "生成された投稿内容",
      "timestamp": "2025-11-17T03:00:00Z",
      "xPostId": "1234567890",
      "success": true
    },
    "context": {
      "weekTheme": "月曜日は新しいスタート！",
      "events": [],
      "trends": [...],
      "toneDescription": "適度に丁寧で、ポジティブな文体"
    }
  }
}
```

#### GET /post/logs
投稿ログ一覧を取得

**クエリパラメータ:**
- `userId` (optional): 特定ユーザーのログのみ
- `limit` (optional): 取得件数（デフォルト: 50）
- `offset` (optional): オフセット

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "postId": "abc123",
        "content": "投稿内容",
        "timestamp": "2025-11-17T03:00:00Z",
        "xPostId": "1234567890",
        "success": true
      }
    ],
    "total": 125,
    "pagination": {
      "limit": 50,
      "offset": 0,
      "hasNext": true
    }
  }
}
```

#### GET /post/status
投稿ステータス確認

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "lastPost": {
      "timestamp": "2025-11-17T03:00:00Z",
      "success": true
    },
    "nextScheduled": "2025-11-17T11:00:00Z",
    "totalPosts": 125,
    "successRate": 99.2
  }
}
```

#### POST /test/post
テスト投稿機能（従来機能）

---

### 📈 トレンド関連 🎉 **NEW**

#### GET /trends/google
Google Trendsデータ取得

**クエリパラメータ:**
- `country` (optional): 国コード（デフォルト: "JP"）
- `timeframe` (optional): 期間（デフォルト: "now 1-d"）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "keyword": "AI技術",
        "rank": 1,
        "category": "テクノロジー",
        "trafficVolume": 50000,
        "region": "JP",
        "relatedQueries": ["機械学習", "ChatGPT"]
      }
    ],
    "lastUpdated": "2025-11-17T03:00:00Z"
  }
}
```

#### GET /trends/yahoo
Yahoo Trendsデータ取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "keyword": "仮想通貨",
        "rank": 1,
        "category": "金融",
        "trafficVolume": 45000,
        "region": "JP",
        "searchVolume": "急上昇"
      }
    ],
    "categories": ["テクノロジー", "金融", "ビジネス", "スポーツ", "エンターテイメント"]
  }
}
```

#### GET /trends/fetch
統合トレンドデータ取得（Google + Yahoo）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "google": [...],
    "yahoo": [...],
    "merged": [...],
    "summary": {
      "totalKeywords": 25,
      "categories": 5,
      "lastUpdated": "2025-11-17T03:00:00Z"
    }
  }
}
```

---

### 🎤 音声日記関連 🎉 **NEW**

#### POST /diary/transcribe
音声→テキスト変換（Whisper API）

**リクエストボディ:**
```json
{
  "audioData": "UklGRnoAAABXQVZFZm10...", // Base64エンコード
  "format": "webm", // "webm" | "mp3" | "wav" | "m4a"
  "userId": "user-001",
  "title": "今日の日記"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "diaryId": "diary-abc123",
    "transcription": "今日はとても良い天気でした。朝から散歩に出かけて...",
    "confidence": 0.95,
    "duration": 45.2,
    "audioUrl": "s3://posl-audio/user-001/diary-abc123.webm",
    "timestamp": "2025-11-17T03:00:00Z"
  }
}
```

#### PUT /diary/{diaryId}/audio
既存日記に音声ファイル追加

#### GET /diary/{diaryId}
特定の日記取得

---

### 📊 監視・ログ関連

#### GET /errors/logs
エラーログ一覧を取得

**クエリパラメータ:**
- `level` (optional): "error" | "warning" | "info"
- `source` (optional): エラー発生源
- `limit` (optional): 取得件数

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "errorLogs": [
      {
        "id": "error-abc123",
        "timestamp": "2025-11-17T03:00:00Z",
        "level": "error",
        "message": "X API投稿に失敗しました",
        "source": "postTweet",
        "details": {
          "error": "Rate limit exceeded",
          "statusCode": 429,
          "retryAfter": 900
        }
      }
    ]
  }
}
```

#### DELETE /errors/logs
エラーログをクリア

---

## 🔒 認証・認可

### 現在の認証方式
- **開発環境**: 認証なし（localhost制限）
- **本番環境**: Bearer Token予定

### APIキー管理
```bash
# 環境変数
OPENAI_API_KEY=sk-proj-...
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
```

---

## ⚠️ エラーレスポンス

### 標準エラーフォーマット
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "エラーの詳細説明",
  "details": {
    "code": "VALIDATION_ERROR",
    "field": "content",
    "constraint": "280文字以内"
  }
}
```

### エラータイプ一覧
- `ValidationError`: 入力値検証エラー
- `AuthenticationError`: 認証エラー
- `RateLimitError`: API制限エラー
- `ExternalAPIError`: 外部API連携エラー
- `DatabaseError`: DB接続エラー
- `InternalServerError`: サーバー内部エラー

---

## 📊 パフォーマンス指標

### API応答時間目標
- **通常API**: <3秒
- **投稿生成**: <30秒（OpenAI呼び出し含む）
- **音声転写**: <15秒（ファイルサイズに依存）
- **トレンド取得**: <5秒

### レート制限
- **投稿API**: 10回/分
- **トレンドAPI**: 100回/時間  
- **音声転写**: 20回/時間

---

## 🔧 開発者向け情報

### Serverless Offline起動
```bash
cd backend
node start-with-env.js
```

### APIテスト例
```bash
# 自動投稿テスト
curl -X POST http://localhost:3001/local/post/generate-and-post \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-001"}'

# X投稿テスト
curl -X POST http://localhost:3001/local/post/tweet \
  -H "Content-Type: application/json" \
  -d '{"content": "テスト投稿 #POSL"}'

# トレンド取得テスト  
curl "http://localhost:3001/local/trends/google"
```

---

## 🔄 バージョン履歴

### v2.0（2025-11-17）- Phase 7完了
- ✅ X API統合（POST /post/tweet）
- ✅ Google/Yahoo Trends API統合
- ✅ 音声日記機能（Whisper API）
- ✅ 自動投稿スケジューラー完成
- ✅ MySQL統合対応
- ✅ エラーログ機能強化

### v1.5（2025-11-15）- Phase 6完了
- ✅ MySQL統合（MySQLHelper）
- ✅ PromptEngine MySQL対応
- ✅ OpenAI API本格統合

### v1.0（2025-11-10）- Phase 5完了
- ✅ 基本API実装完了
- ✅ DynamoDB統合
- ✅ フロントエンド統合

---

**Phase 7完了により、POSL API v2.0が完成しました。**  
**全ての外部API統合が完了し、実用的な自動投稿システムが稼働可能な状態です。**

---

**作成者**: POSL開発チーム  
**技術レビュー**: バックエンドチーム  
**次回更新予定**: Phase 8完了時