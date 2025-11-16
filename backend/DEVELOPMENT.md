# 🚀 POSL開発サーバー管理

このプロジェクトでは、ポート競合やプロセス管理の問題を解決するための自動化スクリプトを提供しています。

## 📋 使用方法

### 基本コマンド

```bash
# サーバー起動（自動ポート検出・既存プロセス停止）
npm run dev

# サーバー停止
npm run dev:stop

# サーバー再起動
npm run dev:restart

# サーバー状態確認
npm run dev:status

# リアルタイムログ表示
npm run dev:logs

# 従来の直接起動（手動管理）
npm run dev:raw
```

## 🔧 機能

### 🎯 自動ポート管理
- **スマートポート検出**: 3001〜3101の範囲で使用可能なポートを自動検出
- **競合回避**: 既に使用中のポートを避けて起動
- **ポート表示**: 起動後に使用中のポートURLを表示

### 🛠 プロセス管理
- **既存プロセス自動停止**: 起動前に関連プロセスを安全に停止
- **PIDファイル管理**: プロセス追跡とクリーンな停止
- **強制停止**: 通常停止が失敗した場合の強制停止

### 📊 状態監視
- **稼働状態確認**: サーバーの動作状況をリアルタイム確認
- **API疎通テスト**: エンドポイントの応答確認
- **ログ監視**: リアルタイムログ表示

## 🎨 出力例

### サーバー起動時
```
[INFO] 既存のPOSLサーバーを停止中...
[INFO] TypeScriptコンパイル中...
[INFO] ポート 3001 でサーバーを起動中...
[INFO] ✅ サーバーが起動しました！
[INFO] 🌐 URL: http://localhost:3001
[INFO] 📋 API一覧: http://localhost:3001/local
[INFO] 📝 ログ: tail -f /tmp/posl-backend-dev.log
[INFO] 🛑 停止: scripts/dev-server.sh stop
```

### 状態確認時
```
[INFO] ✅ POSLサーバーは稼働中です
[INFO] 🌐 ポート 3001 でリッスン中: http://localhost:3001
[INFO] 📋 PID: 203456 (管理中)
[INFO] ✅ API疎通確認成功
```

## 🔨 技術詳細

### ファイル構成
- `scripts/dev-server.sh` - メイン管理スクリプト
- `/tmp/posl-backend-dev.pid` - PIDファイル
- `/tmp/posl-backend-dev.log` - ログファイル

### 利用可能なAPIエンドポイント
起動後、以下のエンドポイントが利用可能になります：

```
GET  /local/settings/{settingType}     - 設定取得
PUT  /local/settings/{settingType}     - 設定更新
GET  /local/post/logs                  - 投稿ログ取得
GET  /local/post/status                - 投稿ステータス取得
PUT  /local/post/status/{postId}       - 投稿ステータス更新
POST /local/test/post                  - テスト投稿
POST /local/post/generate-and-post     - 投稿生成・実行
GET  /local/trends/fetch               - トレンド取得
```

## ⚡ トラブルシューティング

### ポート競合が発生した場合
```bash
npm run dev:stop  # 既存プロセス停止
npm run dev       # 再起動
```

### プロセスが残っている場合
```bash
# 手動でプロセス確認
ps aux | grep serverless

# 手動でポート確認
ss -tulpn | grep :3001

# 強制的にクリーンアップ
npm run dev:stop
```

### ログが見たい場合
```bash
npm run dev:logs  # リアルタイム表示
# または
tail -f /tmp/posl-backend-dev.log
```

## 🎯 従来の問題と解決

| 問題 | 従来 | 現在の解決 |
|------|------|-----------|
| ポート競合 | 手動でプロセス停止が必要 | **自動ポート検出・プロセス停止** |
| プロセス管理 | バックグラウンド実行で管理困難 | **PIDファイル・状態確認** |
| エラー対応 | ログ確認が煩雑 | **リアルタイム状態表示** |
| 開発効率 | 起動・停止が手動 | **ワンコマンド管理** |

これで**ポート競合問題が完全に解決**され、開発効率が大幅に向上しました！🚀