# POSL デプロイパッケージ

このパッケージは他環境でも確実にPOSLシステムをデプロイできるよう作成されています。

## 前提条件

- Ubuntu 22.04 LTS
- Node.js 18.x以上
- MySQL 8.0 (AWS RDS推奨)
- Nginx
- PM2

## セットアップ手順

### 1. 環境変数設定
```bash
cp .env.template .env
nano .env  # 実際のAPI Keyなどを設定
```

### 2. 自動デプロイ実行
```bash
./deploy.sh
```

### 3. データベース初期化
```bash
mysql -h YOUR_RDS_HOST -u admin -p < infrastructure/mysql-schema.sql
```

### 4. PM2でプロセス起動
```bash
pm2 start backend/ecosystem.config.js
pm2 start npm --name "posl-frontend" -- start
pm2 save
```

### 5. Nginx設定
```bash
sudo cp infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl
sudo ln -s /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## 動作確認

```bash
# API健全性確認
curl http://localhost:3001/health

# テスト投稿
./manual-post.sh test

# フロントエンド確認
curl http://localhost/
```

## トラブルシューティング

### PM2が起動しない
```bash
# ログ確認
pm2 logs

# 手動起動テスト
node simple_final_api.js
```

### フロントエンドでCSSが読み込まれない
```bash
# ビルド再実行
cd frontend
rm -rf .next
NODE_ENV=production npm run build
```

### API呼び出しが失敗する
```bash
# Nginx設定確認
sudo nginx -t

# プロキシ動作確認
curl http://localhost/api/health
```

## ファイル構成

```
.
├── simple_final_api.js           # メインAPIサーバー
├── manual-post.sh                # 手動投稿スクリプト
├── enhanced-auto-post.sh         # 自動投稿スクリプト
├── .env.template                 # 環境変数テンプレート
├── deploy.sh                     # 自動デプロイスクリプト
├── backend/
│   ├── ecosystem.config.js       # PM2設定（本番用）
│   └── package.json             # Node.js依存関係
├── frontend/
│   ├── next.config.js           # Next.js設定（本番用）
│   ├── src/utils/api.ts         # API設定（本番対応版）
│   └── package.json             # 依存関係
└── infrastructure/
    ├── nginx-nextjs-production.conf  # Nginx設定
    └── mysql-schema.sql              # DB初期化スクリプト
```

---

**問題が発生した場合は、各コンポーネントを個別にテストしてください。**
