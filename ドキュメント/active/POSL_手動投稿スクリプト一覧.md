# POSL 手動投稿スクリプト一覧

**作成日**: 2025年11月19日  
**対象**: システム管理者・開発者・運用担当者  
**バージョン**: V1.2

## 🎯 概要

POSLシステムでは、自動投稿の他に手動での投稿実行が可能です。このドキュメントでは、各種手動投稿方法とスクリプトの使用方法を詳しく説明します。

## 📋 投稿方法一覧

### 🚀 推奨投稿方法

#### 1. メインAI投稿（実際のX投稿）
```bash
cd /home/ubuntu
./manual-post.sh ai-x
```
**または短縮形**:
```bash
./manual-post.sh post
```

- **機能**: OpenAI GPT-4で投稿文生成 → X(Twitter)投稿 → DB保存
- **推奨度**: ⭐⭐⭐⭐⭐（最高）
- **用途**: 本番投稿、品質重視投稿
- **実行時間**: 約3-5秒
- **成功例**: Tweet ID付きレスポンス、実際のX投稿確認可能

## 🧪 テスト・開発用投稿方法

#### 2. テスト投稿（DB保存のみ）
```bash
./manual-post.sh test
```
**または**:
```bash
./manual-post.sh
```

- **機能**: 事前準備された投稿文でDB保存（X投稿なし）
- **推奨度**: ⭐⭐⭐⭐（テスト用）
- **用途**: 動作確認、DB接続テスト
- **実行時間**: 約1秒
- **安全性**: X投稿なしなので安全
- **カスタマイズ**: 投稿内容の確認・変更が可能（[詳細](#テスト投稿内容のカスタマイズ)）

#### 3. シンプルAI投稿
```bash
./manual-post.sh simple-ai
```
**または**:
```bash
./manual-post.sh sai
```

- **機能**: OpenAI GPT-4で投稿文生成（X投稿エラー時はDB保存のみ）
- **推奨度**: ⭐⭐⭐（開発・テスト用）
- **用途**: AI生成テスト、X APIなし環境
- **実行時間**: 約2-3秒

## 🔧 開発・デバッグ用投稿方法

#### 4. 事前準備投稿（X投稿試行）
```bash
./manual-post.sh real
```

- **機能**: 事前準備された投稿文でX投稿試行
- **推奨度**: ⭐⭐（デバッグ用）
- **用途**: X API接続テスト
- **実行時間**: 約1-2秒

#### 5. 複雑プロンプトAI投稿
```bash
./manual-post.sh ai
```

- **機能**: プロンプトエンジン経由でのAI投稿
- **推奨度**: ⭐（実験用）
- **用途**: プロンプトエンジンテスト
- **実行時間**: 約3-5秒
- **注意**: 設定により動作が不安定な場合あり
- **カスタマイズ**: プロンプトエンジンの高度なカスタマイズが可能（[詳細](#プロンプトエンジンのカスタマイズ)）

## 🌐 API直接呼び出し方法

### メインAI投稿API
```bash
curl -X POST http://localhost:3001/dev/post/ai-with-x \
  -H "Content-Type: application/json"
```

### テスト投稿API
```bash
curl -X POST http://localhost:3001/dev/post/test-generate \
  -H "Content-Type: application/json"
```
**投稿内容**: カスタマイズ可能（ファイル編集により変更）

### シンプルAI投稿API
```bash
curl -X POST http://localhost:3001/dev/post/simple-ai \
  -H "Content-Type: application/json"
```

### 事前準備投稿API
```bash
curl -X POST http://localhost:3001/dev/post/real-post \
  -H "Content-Type: application/json"
```

### 複雑プロンプトAPI
```bash
curl -X POST http://localhost:3001/dev/post/generate-and-post \
  -H "Content-Type: application/json"
```
**プロンプト**: 高度にカスタマイズ可能（データベース設定により変更）

## 📊 投稿結果確認方法

### 1. 最新投稿確認（コマンド）
```bash
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "SELECT id, LEFT(content, 50) as preview, tweet_id, status, created_at FROM posts ORDER BY created_at DESC LIMIT 5;"
```

### 2. API経由確認
```bash
curl -s http://localhost:3001/api/post/logs?limit=5 | jq ".data"
```

### 3. X投稿確認
投稿成功時のレスポンスに含まれる `tweetUrl` でX投稿を確認:
```
https://x.com/posl_ai/status/TWEET_ID
```

### 4. テスト投稿内容確認
現在設定されているテスト投稿内容の確認:
```bash
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 \
  'grep -A 10 "const testContent" /home/ubuntu/backend/simple_final_api.js'
```

### 5. プロンプトエンジン設定確認
現在のプロンプトエンジン設定の確認:
```bash
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143 \
  'mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
   -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
   -e "SELECT setting_type, JSON_PRETTY(setting_data) FROM settings 
       WHERE setting_type IN (\"prompt\", \"tone\", \"template\");"'
```

## 🎛️ スクリプトオプション詳細

### manual-post.sh の完全オプション
```bash
# 基本形式
./manual-post.sh [オプション]

# 利用可能オプション:
# (なし) または test    - テスト投稿
# ai-x または post     - メインAI投稿（推奨）
# simple-ai または sai - シンプルAI投稿
# real                - 事前準備投稿
# ai                  - 複雑プロンプトAI投稿
```

### レスポンス形式
成功時:
```json
{
  "success": true,
  "message": "AI投稿とX投稿処理完了",
  "data": {
    "content": "生成された投稿文...",
    "tweetId": "1234567890",
    "status": "posted",
    "tweetUrl": "https://x.com/posl_ai/status/1234567890",
    "timestamp": "2025-11-19T00:00:00.000Z"
  }
}
```

失敗時:
```json
{
  "success": false,
  "error": "エラーの詳細情報"
}
```

## ⚡ 実行時間とパフォーマンス

| 投稿方法 | 実行時間目安 | CPU使用率 | メモリ使用量 | ネットワーク |
|---------|------------|----------|------------|------------|
| テスト投稿 | ~1秒 | 低 | 低 | DB接続のみ |
| メインAI投稿 | 3-5秒 | 中 | 中 | OpenAI + X API |
| シンプルAI投稿 | 2-3秒 | 中 | 中 | OpenAI API |
| 事前準備投稿 | 1-2秒 | 低 | 低 | X API |
| 複雑プロンプト | 3-5秒 | 高 | 中 | OpenAI API |

## 🔐 セキュリティ・権限

### 必要な権限
- **サーバーアクセス**: SSH接続権限
- **実行権限**: ubuntu ユーザー権限
- **ファイル権限**: `/home/ubuntu/manual-post.sh` 実行権限

### API認証要件
- **OpenAI**: 環境変数 `OPENAI_API_KEY`
- **X API**: 環境変数 `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
- **データベース**: 環境変数 `MYSQL_*`

### セキュリティベストプラクティス
1. **本番投稿前確認**: テスト投稿で動作確認
2. **API制限**: レート制限を考慮した実行間隔
3. **ログ確認**: 実行後は必ずログで結果確認
4. **権限最小化**: 必要最小限の権限で実行

## 📈 使用例・シナリオ

### シナリオ1: 緊急投稿
```bash
# 1. まずテスト投稿で確認
./manual-post.sh test

# 2. 問題なければ本投稿
./manual-post.sh post
```

### シナリオ2: AI生成内容確認
```bash
# 1. AI生成のみでテスト
./manual-post.sh simple-ai

# 2. 内容確認後、実際に投稿
./manual-post.sh ai-x
```

### シナリオ3: システム動作確認
```bash
# 1. API接続確認
curl -s http://localhost:3001/dev/settings/post-time

# 2. テスト投稿実行
./manual-post.sh test

# 3. 結果確認
curl -s http://localhost:3001/api/post/logs?limit=1

# 4. テスト投稿内容確認
grep -A 5 "const testContent" /home/ubuntu/backend/simple_final_api.js
```

### シナリオ5: プロンプトエンジンテスト
```bash
# 1. 現在のプロンプト設定確認
mysql -h posl-production... -e "SELECT setting_type, setting_data FROM settings 
  WHERE setting_type IN ('prompt', 'tone');"

# 2. プロンプトエンジン投稿実行
./manual-post.sh ai

# 3. 結果分析・設定調整
# (必要に応じてプロンプト設定を変更)
```

### シナリオ4: 定期的な品質投稿
```bash
# 高品質なメイン投稿を実行
./manual-post.sh post

# 投稿結果をX上で確認
echo "投稿確認: $(curl -s http://localhost:3001/api/post/logs?limit=1 | jq -r '.data[0].tweet_id')"
```

## 📝 ログ・監視

### 実行ログ確認
```bash
# スクリプト実行時のリアルタイムログ
./manual-post.sh post 2>&1 | tee manual-post-$(date +%Y%m%d-%H%M%S).log

# APIサーバーログ
tail -f /home/ubuntu/backend/api_server.log

# 自動投稿ログ
tail -f /home/ubuntu/auto-post.log
```

### 実行履歴管理
```bash
# 実行履歴の記録
echo "$(date): manual-post.sh $1 executed by $(whoami)" >> /home/ubuntu/manual-post-history.log

# 履歴確認
tail -10 /home/ubuntu/manual-post-history.log
```

## 🎯 推奨運用フロー

### 日常運用
1. **自動投稿メイン**: 毎日9:50の自動投稿を基本とする
2. **手動投稿補助**: 特別な場合のみ手動投稿を実行
3. **品質確保**: 本番投稿前は必ずテスト投稿で確認

### 緊急時運用
1. **即座実行**: `./manual-post.sh post` で緊急投稿
2. **動作確認**: 投稿後は必ずX上で確認
3. **ログ記録**: 緊急実行の理由と結果を記録

### メンテナンス時運用
1. **テスト重点**: システム変更後は十分なテスト投稿
2. **段階実行**: テスト → シンプルAI → メインAI の順で確認
3. **完全確認**: 全てのエンドポイントの動作確認

## 🎨 テスト投稿内容のカスタマイズ

### 📝 現在のテスト投稿内容
```javascript
const testContent = `🚀 POSL V1.0 システムテスト投稿 ${new Date().toLocaleDateString("ja-JP")}

✅ APIサーバー動作確認
✅ データベース接続確認
✅ フロントエンド連携確認

投稿時刻: ${new Date().toLocaleTimeString("ja-JP")}

#POSL #システムテスト #API動作確認`;
```

### 🔧 投稿内容の変更方法
1. **サーバー接続**: `ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143`
2. **APIサーバー停止**: `pkill -f simple_final_api.js`
3. **ファイル編集**: `nano /home/ubuntu/backend/simple_final_api.js`
4. **435行目付近のtestContentを変更**
5. **APIサーバー再起動**: 
   ```bash
   cd /home/ubuntu/backend
   nohup node simple_final_api.js > simple_final_api.log 2>&1 &
   ```
6. **動作確認**: `./manual-post.sh test`

### ✨ カスタマイズ可能な要素
- **メッセージ内容**: 完全自由にカスタマイズ可能
- **日時形式**: JavaScript Date関数で自由にフォーマット
- **システム情報**: リアルタイム情報の追加（稼働時間、メモリ使用量など）
- **ハッシュタグ**: 自由に変更・追加
- **絵文字・装飾**: 自由に使用
- **動的コンテンツ**: 実行時に変化するメッセージ

### 🎯 変更例
**システム情報詳細版**:
```javascript
const testContent = `🔧 POSL V1.2 システム動作テスト ${new Date().toLocaleDateString("ja-JP")}

✅ API Server: Port 3001 Active
✅ Database: MySQL Connection OK
✅ Frontend: React Integration OK
✅ Auth: Token Validation OK

🕐 実行時刻: ${new Date().toLocaleTimeString("ja-JP", {timeZone: "Asia/Tokyo"})}
📊 システム状態: 正常稼働中

#POSL #SystemTest #HealthCheck #API動作確認`;
```

**インタラクティブ版**:
```javascript
const testMessages = [
  "🚀 POSL システム、今日も絶好調！",
  "💡 投稿システム、完璧に動作中！", 
  "⚡ API・DB・UI、すべてグリーンライト！"
];
const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
const testContent = `${randomMessage} ...`;
```

### ⚠️ 変更時の注意点
1. **APIサーバー再起動必須**: コード変更後は必ずサーバー再起動
2. **バックアップ推奨**: 変更前にファイルのバックアップを作成
3. **文字数制限**: X投稿は280文字制限（現在は余裕あり）
4. **エスケープ文字**: バッククォート(`)やドル記号($)の使用に注意

詳細なカスタマイズガイドは `テスト投稿内容カスタマイズガイド.md` を参照してください。

## 🧠 プロンプトエンジンのカスタマイズ

### 📊 現在のプロンプトエンジン設定

#### 🔧 プロンプト設定
```json
{
  "ng_words": [],
  "additional_rules": [
    "自然で親しみやすい文体を心がける",
    "ハッシュタグは#POSL_V1のみ使用",
    "280文字以内で簡潔にまとめる"
  ],
  "creativity_level": 70,
  "preferred_phrases": [
    "今日は", "ふと思った", "やっぱり", "なるほど"
  ]
}
```

#### 🎨 トーン設定（0-100スケール）
```json
{
  "humorous": 40,      // ユーモア度
  "emotional": 55,     // 感情表現度
  "casualness": 50,    // カジュアルさ
  "creativity": 65,    // 創造性
  "politeness": 70,    // 丁寧さ
  "positivity": 75,    // ポジティブ度
  "intellectual": 60   // 知的さ
}
```

### 🛠️ カスタマイズ方法

#### プロンプト設定の変更
```bash
# 投資・フィンテック特化設定例
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "UPDATE settings SET setting_data = JSON_OBJECT(
    'ng_words', JSON_ARRAY('絶対儲かる', '必ず勝てる'),
    'additional_rules', JSON_ARRAY(
      '投資・フィンテック業界の最新情報を分かりやすく解説',
      'リスクと機会の両面を公平に言及',
      'データに基づいた客観的な分析を心がける'
    ),
    'creativity_level', 80,
    'preferred_phrases', JSON_ARRAY(
      '最近の市場動向では', 'データを見ると', '注目すべきは'
    )
  ) WHERE user_id = 'demo' AND setting_type = 'prompt';"
```

#### トーン設定の調整
```bash
# よりプロフェッショナル・知的なトーン
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "UPDATE settings SET setting_data = JSON_OBJECT(
    'humorous', 30,      -- ユーモア控えめ
    'emotional', 40,     -- 感情表現控えめ
    'casualness', 30,    -- フォーマル寄り
    'creativity', 75,    -- 高い創造性
    'politeness', 85,    -- 高い丁寧さ
    'positivity', 70,    -- 適度なポジティブさ
    'intellectual', 90   -- 高い知的レベル
  ) WHERE user_id = 'demo' AND setting_type = 'tone';"
```

### ✨ カスタマイズ可能な要素
- **NGワード**: 使用禁止単語の設定
- **追加ルール**: カスタム投稿ガイドライン
- **創造性レベル**: 0-100%で調整可能
- **好みの表現**: 優先的に使用する言い回し
- **トーン設定**: 7つの軸で細かく調整
- **テンプレート**: 10種類から選択・優先度設定

### 🎯 業界特化設定例

#### 投資・金融特化
- **NGワード**: "絶対儲かる", "リスクなし"
- **ルール**: "データ基づく分析", "リスク言及必須"
- **トーン**: 知的90, 丁寧85, ユーモア30

#### テック・イノベーション特化
- **NGワード**: "古い技術", "時代遅れ"  
- **ルール**: "最新トレンド取り入れ", "未来志向表現"
- **トーン**: 創造性90, ポジティブ85, 知的80

### 🔄 テスト・反映手順
1. **設定変更**: 上記SQLでデータベース更新
2. **APIサーバー再起動**: `pkill -f simple_final_api.js && cd /home/ubuntu/backend && nohup node simple_final_api.js > simple_final_api.log 2>&1 &`
3. **テスト投稿**: `./manual-post.sh ai`
4. **結果確認**: 投稿内容・トーンの変化を分析
5. **微調整**: 必要に応じて設定を段階的に調整

### ⚠️ 注意点
1. **バックアップ必須**: 変更前に現在設定を保存
2. **段階的変更**: 一度に大幅変更せず、段階的に調整
3. **テスト実行**: 本番投稿前に必ずテスト投稿で確認

詳細なプロンプトエンジンカスタマイズガイドは `POSLプロンプトエンジン_カスタマイズガイド.md` を参照してください。

---

**作成**: GitHub Copilot  
**更新**: 2025年11月19日  
**次回更新**: 機能追加時