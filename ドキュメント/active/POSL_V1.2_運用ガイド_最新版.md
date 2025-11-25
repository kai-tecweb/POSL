# POSL V1.2 運用ガイド・最新版

**更新日**: 2025年11月19日  
**バージョン**: V1.2  
**対象**: システム管理者・開発者

## 🎯 システム概要

POSLは、OpenAI GPT-4を活用したAI投稿自動生成システムです。設定した時刻に自動でフィンテック・投資関連の投稿をX(Twitter)に投稿します。

## 🚀 基本運用

### 自動投稿システム
- **実行頻度**: 毎日設定時刻（現在：9:50 JST）
- **投稿先**: X(@posl_ai)
- **投稿内容**: AI生成（フィンテック・投資分析関連）
- **制御方法**: フロントエンド設定ページまたはAPI

### システム構成
```
[フロントエンド] → [APIサーバー] → [データベース]
                                 ↓
[cron] → [自動投稿スクリプト] → [OpenAI] → [X API]
```

## ⚙️ 設定管理

### 投稿時刻の変更方法

#### 方法1: フロントエンド設定ページ
1. フロントエンドの設定ページにアクセス
2. 投稿時刻を変更
3. 保存ボタンをクリック
4. 自動でDB・cron設定が更新される

#### 方法2: API直接呼び出し
```bash
curl -X PUT http://localhost:3001/dev/settings/post-time \
  -H "Content-Type: application/json" \
  -d '{"hour": 18, "minute": 30}'
```

#### 方法3: データベース直接更新（非推奨）
```sql
UPDATE settings 
SET setting_data = '{"hour": 18, "minute": 30, "timezone": "Asia/Tokyo", "enabled": true}',
    updated_at = NOW()
WHERE user_id = "demo" AND setting_type = "post-time";
```

### 現在の設定確認
```bash
# API経由
curl -s http://localhost:3001/dev/settings/post-time

# データベース直接
mysql -h posl-production... -e "SELECT * FROM settings WHERE setting_type='post-time';"

# cron設定
crontab -l | grep enhanced-auto-post
```

## 📱 手動投稿操作

### コマンドライン投稿
```bash
cd /home/ubuntu

# テスト投稿（DB保存のみ、X投稿なし）
./manual-post.sh test

# 実際のAI投稿（OpenAI + X投稿）
./manual-post.sh ai-x
./manual-post.sh post    # 短縮形

# シンプルAI投稿（直接OpenAI呼び出し）
./manual-post.sh simple-ai

# 事前準備投稿（OpenAIなし、X投稿あり）
./manual-post.sh real
```

### API直接呼び出し
```bash
# AI+X投稿
curl -X POST http://localhost:3001/dev/post/ai-with-x \
  -H "Content-Type: application/json"

# テスト投稿
curl -X POST http://localhost:3001/dev/post/test-generate \
  -H "Content-Type: application/json"
```

## 🔧 システム管理

### APIサーバー管理
```bash
# 状態確認
ps aux | grep "node.*simple_final_api.js"

# 起動
cd /home/ubuntu/backend
nohup node simple_final_api.js > api_server.log 2>&1 &

# 停止
pkill -f "node.*simple_final_api.js"

# ログ確認
tail -f /home/ubuntu/backend/api_server.log
```

### データベース管理
```bash
# 接続
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db

# 最新投稿確認
SELECT id, LEFT(content, 50) as preview, tweet_id, status, created_at 
FROM posts ORDER BY created_at DESC LIMIT 10;

# 設定確認
SELECT * FROM settings WHERE setting_type = 'post-time';

# エラーログ確認
SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 10;
```

### 自動投稿スクリプト管理
```bash
# スクリプト場所
/home/ubuntu/enhanced-auto-post.sh

# 手動実行
/home/ubuntu/enhanced-auto-post.sh

# ログ確認
tail -f /home/ubuntu/auto-post.log

# エラーログ確認
tail -f /home/ubuntu/auto-post-errors.log
```

## 📊 監視・ログ

### 主要ログファイル
```bash
# APIサーバーログ
/home/ubuntu/backend/api_server.log

# 自動投稿ログ
/home/ubuntu/auto-post.log
/home/ubuntu/auto-post-errors.log
/home/ubuntu/auto-post-performance.log

# Nginxログ
/var/log/nginx/access.log
/var/log/nginx/error.log
```

### 監視項目
- APIサーバーの稼働状況
- 自動投稿の成功/失敗
- データベース接続状況
- X API投稿状況
- ディスク使用量
- メモリ使用量

### アラート設定例
```bash
# 自動投稿失敗検知
grep "❌" /home/ubuntu/auto-post.log | tail -1

# APIサーバーダウン検知
ps aux | grep "node.*simple_final_api.js" | grep -v grep || echo "API Server Down"

# ディスク使用率確認
df -h | grep -E "(8[0-9]|9[0-9])%" || echo "Disk OK"
```

## 🛠️ トラブルシューティング

### よくある問題と解決方法

#### 1. 自動投稿が実行されない
```bash
# cron設定確認
crontab -l

# 手動実行テスト
/home/ubuntu/enhanced-auto-post.sh

# APIサーバー状況確認
curl -s http://localhost:3001/dev/settings/post-time
```

#### 2. X投稿が失敗する
```bash
# X API設定確認
grep "X_API" /home/ubuntu/backend/.env

# 手動投稿テスト
./manual-post.sh ai-x

# エラーログ確認
tail -20 /home/ubuntu/auto-post-errors.log
```

#### 3. OpenAI API呼び出し失敗
```bash
# APIキー確認
grep "OPENAI_API_KEY" /home/ubuntu/backend/.env

# テスト投稿実行
./manual-post.sh simple-ai

# APIレスポンス確認
curl -X POST http://localhost:3001/dev/post/simple-ai
```

#### 4. データベース接続エラー
```bash
# DB接続テスト
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -e "SELECT 1;"

# 環境変数確認
grep "MYSQL" /home/ubuntu/backend/.env
```

### 緊急時対応

#### 自動投稿停止
```bash
# cron設定を無効化
crontab -e
# enhanced-auto-post行をコメントアウト
```

#### 手動投稿実行
```bash
# 緊急投稿
./manual-post.sh ai-x
```

#### システム再起動
```bash
# APIサーバー再起動
pkill -f "node.*simple_final_api.js"
cd /home/ubuntu/backend && nohup node simple_final_api.js > api_server.log 2>&1 &

# Nginx再起動
sudo systemctl restart nginx
```

## 🔐 セキュリティ

### APIキー管理
- OpenAI APIキー: 環境変数で管理
- X API認証情報: 環境変数で管理
- DB認証情報: 環境変数で管理

### アクセス制御
- APIサーバー: localhost のみアクセス許可
- データベース: 特定IP からのみアクセス許可
- SSH: キー認証のみ

### ログ管理
- 機密情報のログ出力回避
- ログローテーション実装
- アクセスログの監視

## 📈 パフォーマンス最適化

### データベース
- インデックス最適化
- クエリ最適化
- 定期メンテナンス

### APIサーバー
- レスポンス時間監視
- メモリ使用量最適化
- エラーレート監視

### 自動投稿
- 投稿成功率追跡
- 実行時間最適化
- リトライ機能実装

---

**作成**: GitHub Copilot  
**更新**: 2025年11月19日  
**次回更新予定**: 必要に応じて