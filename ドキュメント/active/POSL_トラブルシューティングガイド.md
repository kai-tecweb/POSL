# POSL トラブルシューティングガイド

**作成日**: 2025年11月19日  
**対象**: システム管理者・開発者・運用担当者  
**バージョン**: V1.2

## 🚨 緊急対応チェックリスト

### システム全体が動かない場合
1. ✅ **サーバー接続確認**: `ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143`
2. ✅ **APIサーバー状況**: `ps aux | grep "node.*simple_final_api.js"`
3. ✅ **データベース接続**: `mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com -P 3306 -u admin -p`
4. ✅ **cron設定確認**: `crontab -l | grep enhanced-auto-post`

### 投稿が失敗する場合
1. ✅ **手動テスト投稿**: `./manual-post.sh test`
2. ✅ **API呼び出し確認**: `curl -s http://localhost:3001/dev/settings/post-time`
3. ✅ **最新ログ確認**: `tail -20 /home/ubuntu/auto-post.log`
4. ✅ **環境変数確認**: `env | grep -E "(OPENAI|X_API)"`

## 🔧 問題別トラブルシューティング

## 1️⃣ API接続エラー

### 症状
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

### 原因
- APIサーバーが起動していない
- ポート3001が使用中
- ファイアウォール設定

### 解決手順
```bash
# 1. APIサーバープロセス確認
ps aux | grep "node.*simple_final_api.js"

# 2. プロセスがない場合、起動
cd /home/ubuntu
nohup node simple_final_api.js > api_server.log 2>&1 &

# 3. ポート使用状況確認
netstat -tulpn | grep 3001

# 4. 起動確認
curl -s http://localhost:3001/dev/settings/post-time
```

### 予防策
- サーバー再起動時の自動起動設定
- 定期的なヘルスチェック

---

## 2️⃣ データベース接続エラー

### 症状
```
Error: connect ETIMEDOUT
ER_ACCESS_DENIED_ERROR
```

### 原因
- データベースサーバーダウン
- 認証情報エラー
- ネットワーク接続問題
- 接続数上限

### 解決手順
```bash
# 1. データベース接続テスト
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "SELECT 1;"

# 2. 環境変数確認
env | grep MYSQL

# 3. 接続プロセス確認
netstat -an | grep 3306

# 4. 専用テストスクリプト実行
node test-mysql-connection.js
```

### エラー別対処

#### ER_ACCESS_DENIED_ERROR
```bash
# パスワード再確認
echo $MYSQL_PASSWORD

# 手動接続テスト（パスワード入力）
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com -u admin -p
```

#### ETIMEDOUT
```bash
# ネットワーク疎通確認
ping posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com

# ポート疎通確認
telnet posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com 3306
```

### 予防策
- コネクションプール設定の最適化
- タイムアウト値の調整
- 定期的なDB接続テスト

---

## 3️⃣ OpenAI API エラー

### 症状
```
Error: 401 Unauthorized
Error: 429 Too Many Requests
Error: Invalid API key
```

### 原因
- APIキーの無効化・期限切れ
- レート制限超過
- 残高不足
- ネットワークエラー

### 解決手順
```bash
# 1. APIキー確認
echo $OPENAI_API_KEY

# 2. APIキー有効性テスト
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models | jq ".data[0].id"

# 3. 残高確認（OpenAI Dashboard）
# https://platform.openai.com/usage

# 4. レート制限確認
curl -I -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

### エラー別対処

#### 401 Unauthorized
```bash
# 新しいAPIキーの設定
export OPENAI_API_KEY="新しいAPIキー"
echo 'export OPENAI_API_KEY="新しいAPIキー"' >> ~/.bashrc
```

#### 429 Too Many Requests
```bash
# リクエスト間隔を空けて再実行
sleep 10
./manual-post.sh test
```

#### Invalid API key
```bash
# APIキー形式確認（sk-で始まる必要）
echo $OPENAI_API_KEY | grep -E "^sk-"
```

### 予防策
- APIキーの定期的な更新
- 残高監視の自動化
- レート制限を考慮した実装

---

## 4️⃣ X(Twitter) API エラー

### 症状
```
Error: 401 Unauthorized
Error: 403 Forbidden
Error: 429 Too Many Requests
```

### 原因
- 認証情報エラー
- API権限不足
- レート制限超過
- 投稿内容の制限違反

### 解決手順
```bash
# 1. X API認証情報確認
env | grep X_API

# 2. APIキー有効性テスト
curl -H "Authorization: Bearer $X_ACCESS_TOKEN" \
  https://api.twitter.com/2/users/me

# 3. X Developer Portal確認
# https://developer.twitter.com/en/portal/dashboard

# 4. 投稿権限確認
./manual-post.sh real
```

### エラー別対処

#### 401 Unauthorized
```bash
# 認証情報再設定
export X_API_KEY="新しいAPIキー"
export X_API_SECRET="新しいAPIシークレット"
export X_ACCESS_TOKEN="新しいアクセストークン"
export X_ACCESS_TOKEN_SECRET="新しいアクセストークンシークレット"
```

#### 403 Forbidden
- X Developer Portalでアプリ権限確認
- Read and Write権限の有効化
- アプリ設定の再確認

#### 429 Too Many Requests
```bash
# 15分待機後に再実行
echo "レート制限のため15分待機中..."
sleep 900
./manual-post.sh post
```

### 予防策
- 投稿頻度の制限
- 投稿内容の事前チェック
- API権限の定期確認

---

## 5️⃣ 自動投稿が動かない

### 症状
- 設定時刻に投稿されない
- cronジョブが実行されない
- 投稿ログが更新されない

### 原因
- cron設定エラー
- スクリプトのパス問題
- 権限エラー
- 環境変数未設定

### 解決手順
```bash
# 1. cron設定確認
crontab -l

# 2. cron実行ログ確認
tail -20 /var/log/syslog | grep CRON

# 3. スクリプト権限確認
ls -la /home/ubuntu/enhanced-auto-post.sh

# 4. 手動実行テスト
cd /home/ubuntu
./enhanced-auto-post.sh
```

### cron設定の修正
```bash
# 1. cronエディタ起動
crontab -e

# 2. 正しい設定例
50 9 * * * cd /home/ubuntu && ./enhanced-auto-post.sh >> /home/ubuntu/cron.log 2>&1

# 3. cron再起動
sudo service cron restart
```

### 環境変数問題の解決
```bash
# 1. cronで使用される環境変数確認
crontab -l | head -10

# 2. 必要な環境変数をcronに追加
crontab -e
# 以下を追加:
# OPENAI_API_KEY=sk-...
# X_API_KEY=...
# (他の必要な環境変数)
```

### 予防策
- cron実行ログの定期確認
- テスト実行の自動化
- 環境変数の明示的設定

---

## 6️⃣ 投稿内容の問題

### 症状
- 投稿文が生成されない
- 不適切な内容が生成される
- 文字数制限超過

### 原因
- プロンプト設定エラー
- AIモデルの応答問題
- 文字数カウントエラー

### 解決手順
```bash
# 1. AI生成テスト
./manual-post.sh simple-ai

# 2. 生成内容確認
curl -s http://localhost:3001/api/post/logs?limit=1 | jq ".data[0].content"

# 3. プロンプト設定確認
curl -s http://localhost:3001/dev/settings/post-time
```

### 投稿内容の手動確認
```bash
# 最新の投稿内容と文字数確認
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "SELECT content, CHAR_LENGTH(content) as char_count, created_at FROM posts ORDER BY created_at DESC LIMIT 3;"
```

### プロンプト調整
1. AIモデルへの指示を明確化
2. 文字数制限の明示
3. 投稿スタイルの統一

### 予防策
- 定期的な投稿内容レビュー
- プロンプトのA/Bテスト
- 自動文字数チェック

---

## 7️⃣ システムパフォーマンス問題

### 症状
- レスポンスが遅い（5秒以上）
- メモリ不足エラー
- CPU使用率が高い

### 原因
- リソース不足
- データベース接続数超過
- 重い処理の同時実行

### 解決手順
```bash
# 1. システムリソース確認
top
free -h
df -h

# 2. プロセス確認
ps aux | grep node
ps aux | grep mysql

# 3. 接続数確認
netstat -an | grep :3001 | wc -l
netstat -an | grep :3306 | wc -l
```

### パフォーマンス最適化
```bash
# 1. 不要プロセス終了
kill $(pgrep -f "不要なプロセス")

# 2. メモリクリア
sync
echo 3 > /proc/sys/vm/drop_caches

# 3. API再起動
pkill -f simple_final_api.js
cd /home/ubuntu
nohup node simple_final_api.js > api_server.log 2>&1 &
```

### 予防策
- リソース監視の自動化
- 定期的なシステム再起動
- 接続プールの最適化

---

## 🔍 診断コマンド集

### システム全体診断
```bash
#!/bin/bash
echo "=== POSL システム診断 ==="
echo "実行時刻: $(date)"
echo ""

echo "1. サーバー基本情報"
hostname
uptime
free -h | grep Mem

echo ""
echo "2. APIサーバー状況"
ps aux | grep "node.*simple_final_api.js" | grep -v grep || echo "APIサーバーが停止中"

echo ""
echo "3. データベース接続テスト"
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "SELECT 'DB接続OK' as status;" 2>/dev/null || echo "DB接続エラー"

echo ""
echo "4. API エンドポイント確認"
curl -s http://localhost:3001/dev/settings/post-time >/dev/null && echo "API応答OK" || echo "API応答エラー"

echo ""
echo "5. cron設定"
crontab -l | grep enhanced-auto-post || echo "cron設定なし"

echo ""
echo "6. 最新投稿確認"
curl -s http://localhost:3001/api/post/logs?limit=1 | jq -r ".data[0].created_at // \"投稿データなし\""

echo ""
echo "7. ディスク使用量"
df -h | grep -E "(/$|/home)"

echo "=== 診断完了 ==="
```

### ネットワーク診断
```bash
# 外部接続確認
ping -c 3 8.8.8.8
ping -c 3 api.openai.com
ping -c 3 api.twitter.com

# ポート疎通確認
nc -zv posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com 3306
nc -zv localhost 3001
```

### ログ診断
```bash
# エラーログ確認
tail -50 /home/ubuntu/auto-post.log | grep -i error
tail -50 /home/ubuntu/api_server.log | grep -i error
dmesg | grep -i error | tail -10
```

## 📋 定期メンテナンス

### 日次確認項目
```bash
# 毎日実行推奨
./manual-post.sh test  # 動作確認
curl -s http://localhost:3001/api/post/logs?limit=1  # 最新投稿確認
df -h  # ディスク容量確認
```

### 週次確認項目
```bash
# 週1回実行推奨
crontab -l  # cron設定確認
mysql -h ... -e "SELECT COUNT(*) FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);"  # 投稿数確認
tail -100 /home/ubuntu/auto-post.log | grep -c "成功"  # 成功率確認
```

### 月次確認項目
```bash
# 月1回実行推奨
# OpenAI API使用量確認
# X API制限確認
# データベースサイズ確認
# システムアップデート
```

## 🆘 緊急連絡・エスカレーション

### レベル1: 一般的な問題
- **対応者**: 運用担当者
- **対応時間**: 1時間以内
- **対象**: 投稿失敗、API応答遅延

### レベル2: システム障害
- **対応者**: システム管理者
- **対応時間**: 30分以内  
- **対象**: API全停止、DB接続不可

### レベル3: 緊急事態
- **対応者**: 開発チーム
- **対応時間**: 即座
- **対象**: セキュリティ問題、データ損失

### 緊急時連絡フロー
1. **即座診断**: システム診断コマンド実行
2. **一次対応**: 既知の解決手順実行
3. **エスカレーション**: 上位レベルに報告
4. **記録**: 問題と解決過程を文書化

## 📚 参考リソース

### 公式ドキュメント
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [X API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)

### 内部ドキュメント
- `POSL_V1.2_最終実装完了レポート.md` - システム全体仕様
- `POSL_V1.2_運用ガイド_最新版.md` - 運用手順
- `POSL_V1.2_API仕様書_最新版.md` - API詳細仕様

### ツール・コマンド
- `manual-post.sh` - 手動投稿スクリプト
- `enhanced-auto-post.sh` - 自動投稿スクリプト  
- `simple_final_api.js` - APIサーバー
- `test-mysql-connection.js` - DB接続テスト

---

**作成**: GitHub Copilot  
**更新**: 2025年11月19日  
**緊急時**: このドキュメントを参照してまず自己解決を試行**