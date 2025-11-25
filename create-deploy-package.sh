#!/bin/bash

# POSL完全デプロイパッケージ生成スクリプト（実行版）
# 作成日: 2025年11月19日

set -e

# 設定
BASE_DIR="/home/iwasaki/work/POSL"
PACKAGE_NAME="posl-deploy-package-$(date +%Y%m%d-%H%M%S)"
PACKAGE_DIR="$BASE_DIR/$PACKAGE_NAME"

echo "=== POSL完全デプロイパッケージ生成開始 ==="
echo "パッケージ名: $PACKAGE_NAME"

# パッケージディレクトリ作成
mkdir -p "$PACKAGE_DIR"

# 1. ルートファイル
echo "📦 ルートファイルをコピー中..."
cp "$BASE_DIR/simple_final_api.js" "$PACKAGE_DIR/" || echo "⚠ simple_final_api.js not found"
cp "$BASE_DIR/manual-post.sh" "$PACKAGE_DIR/" || echo "⚠ manual-post.sh not found"  
cp "$BASE_DIR/enhanced-auto-post.sh" "$PACKAGE_DIR/" || echo "⚠ enhanced-auto-post.sh not found"
cp "$BASE_DIR/.env.example" "$PACKAGE_DIR/.env.template" || echo "⚠ .env.example not found"

# 2. バックエンド
echo "📦 バックエンドファイルをコピー中..."
mkdir -p "$PACKAGE_DIR/backend"
cp "$BASE_DIR/backend/package.json" "$PACKAGE_DIR/backend/" || echo "⚠ backend/package.json not found"
cp "$BASE_DIR/backend/ecosystem.production.config.js" "$PACKAGE_DIR/backend/ecosystem.config.js" || echo "⚠ ecosystem.production.config.js not found"
mkdir -p "$PACKAGE_DIR/backend/logs"

# 3. フロントエンド
echo "📦 フロントエンドファイルをコピー中..."
mkdir -p "$PACKAGE_DIR/frontend"

# 必須フロントエンドファイル
if [ -d "$BASE_DIR/frontend/src" ]; then
    cp -r "$BASE_DIR/frontend/src" "$PACKAGE_DIR/frontend/"
else
    echo "⚠ frontend/src ディレクトリが見つかりません"
fi

if [ -d "$BASE_DIR/frontend/public" ]; then
    cp -r "$BASE_DIR/frontend/public" "$PACKAGE_DIR/frontend/"
fi

cp "$BASE_DIR/frontend/package.json" "$PACKAGE_DIR/frontend/" || echo "⚠ frontend/package.json not found"
cp "$BASE_DIR/frontend/next.config.production.js" "$PACKAGE_DIR/frontend/next.config.js" || echo "⚠ next.config.production.js not found"
cp "$BASE_DIR/frontend/tailwind.config.js" "$PACKAGE_DIR/frontend/" || echo "⚠ tailwind.config.js not found"
cp "$BASE_DIR/frontend/postcss.config.js" "$PACKAGE_DIR/frontend/" || echo "⚠ postcss.config.js not found"
cp "$BASE_DIR/frontend/tsconfig.json" "$PACKAGE_DIR/frontend/" || echo "⚠ tsconfig.json not found"

# 修正版API設定をコピー
if [ -f "$BASE_DIR/frontend/src/utils/api.corrected.ts" ]; then
    cp "$BASE_DIR/frontend/src/utils/api.corrected.ts" "$PACKAGE_DIR/frontend/src/utils/api.ts"
    echo "✓ 修正版API設定を適用"
else
    echo "⚠ api.corrected.ts not found"
fi

# 4. インフラ
echo "📦 インフラファイルをコピー中..."
mkdir -p "$PACKAGE_DIR/infrastructure"
cp "$BASE_DIR/infrastructure/nginx-nextjs-production.conf" "$PACKAGE_DIR/infrastructure/" || echo "⚠ nginx-nextjs-production.conf not found"

# MySQL スキーマファイルを探す
if [ -f "$BASE_DIR/infrastructure/mysql-schema.sql" ]; then
    cp "$BASE_DIR/infrastructure/mysql-schema.sql" "$PACKAGE_DIR/infrastructure/"
elif [ -f "$BASE_DIR/backend/resources/mysql-schema.sql" ]; then
    cp "$BASE_DIR/backend/resources/mysql-schema.sql" "$PACKAGE_DIR/infrastructure/"
else
    echo "⚠ mysql-schema.sql not found - creating basic schema"
    cat > "$PACKAGE_DIR/infrastructure/mysql-schema.sql" << 'EOF'
-- POSL Database Schema
CREATE DATABASE IF NOT EXISTS posl_db;
USE posl_db;

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  tweet_id VARCHAR(255),
  status ENUM('draft', 'posted', 'failed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL DEFAULT 'demo',
  setting_type VARCHAR(50) NOT NULL,
  setting_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_setting (user_id, setting_type)
);

CREATE TABLE error_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  error_type VARCHAR(100),
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trend_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
fi

# 5. デプロイスクリプト作成
echo "📦 デプロイスクリプトを生成中..."
cat > "$PACKAGE_DIR/deploy.sh" << 'EOF'
#!/bin/bash
# POSL自動デプロイスクリプト
set -e

echo "=== POSL デプロイ開始 ==="

# 権限設定
chmod +x manual-post.sh enhanced-auto-post.sh 2>/dev/null || true

# バックエンドセットアップ
echo "📦 バックエンドセットアップ中..."
cd backend
npm install
mkdir -p logs
cd ..

# フロントエンドセットアップ
echo "📦 フロントエンドセットアップ中..."
cd frontend
npm install

# 環境変数設定
cat > .env.production << 'ENVEOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
ENVEOF

cat > .env.local << 'ENVEOF'  
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
ENVEOF

NODE_ENV=production npm run build
cd ..

echo "✓ デプロイ完了"
echo ""
echo "次のステップ:"
echo "1. .env ファイルを編集してAPI Keyを設定"
echo "2. PM2でプロセス起動:"
echo "   pm2 start backend/ecosystem.config.js"
echo "   pm2 start npm --name \"posl-frontend\" -- start"
echo "3. Nginxの設定:"
echo "   sudo cp infrastructure/nginx-nextjs-production.conf /etc/nginx/sites-available/posl"
echo "   sudo ln -s /etc/nginx/sites-available/posl /etc/nginx/sites-enabled/"
echo "   sudo systemctl restart nginx"
echo "4. 動作確認:"
echo "   ./manual-post.sh test"
EOF

chmod +x "$PACKAGE_DIR/deploy.sh"

# 6. README作成
echo "📦 READMEを生成中..."
cat > "$PACKAGE_DIR/README.md" << 'EOF'
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
EOF

# 7. パッケージ情報表示
echo ""
echo "=== パッケージ内容確認 ==="
find "$PACKAGE_DIR" -type f | head -20

# 8. パッケージ圧縮
echo ""
echo "📦 パッケージ圧縮中..."
cd "$BASE_DIR"
tar czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"

echo ""
echo "✓ デプロイパッケージ生成完了!"
echo "📦 ファイル: ${BASE_DIR}/${PACKAGE_NAME}.tar.gz"
echo "📊 サイズ: $(du -h "${PACKAGE_NAME}.tar.gz" | cut -f1)"
echo ""
echo "使用方法:"
echo "1. パッケージを展開: tar xzf ${PACKAGE_NAME}.tar.gz"
echo "2. デプロイ実行: cd ${PACKAGE_NAME} && ./deploy.sh"