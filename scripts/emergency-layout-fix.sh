#!/bin/bash

# POSL緊急レイアウト修復スクリプト
# 実行日時: 2025年11月19日

set -e

echo "🚨 POSL緊急レイアウト修復を開始します..."

# 現在のディレクトリを確認
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "📁 プロジェクトディレクトリ: $PROJECT_ROOT"
echo "📁 フロントエンドディレクトリ: $FRONTEND_DIR"

# フロントエンドディレクトリに移動
cd "$FRONTEND_DIR"

echo ""
echo "🔧 ステップ1: 設定ファイルの修正確認"
echo "✓ next.config.js が修正済みか確認..."
if grep -q "NEXT_PUBLIC_API_URL.*'/api'" next.config.js; then
    echo "✅ next.config.js は正しく設定済み"
else
    echo "❌ next.config.js の設定に問題があります"
fi

echo "✓ api.ts が修正済みか確認..."
if grep -q "window.location.host" src/utils/api.ts; then
    echo "✅ api.ts は正しく設定済み"
else
    echo "❌ api.ts の設定に問題があります"
fi

echo ""
echo "🔧 ステップ2: 環境変数の設定"
echo "✓ 本番環境用環境変数を設定中..."

# .env.productionファイルが存在するかチェック
if [ -f ".env.production" ]; then
    echo "✅ .env.production が存在します"
    cat .env.production
else
    echo "📝 .env.production を作成中..."
    cat > .env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF
    echo "✅ .env.production を作成しました"
fi

# .env.localファイルが存在するかチェック
if [ -f ".env.local" ]; then
    echo "✅ .env.local が存在します"
    cat .env.local
else
    echo "📝 .env.local を作成中..."
    cat > .env.local << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
EOF
    echo "✅ .env.local を作成しました"
fi

echo ""
echo "🔧 ステップ3: 依存関係の確認"
echo "✓ package.json を確認中..."
if [ -f "package.json" ]; then
    echo "✅ package.json が存在します"
    
    # 主要な依存関係を確認
    echo "📋 主要依存関係:"
    npm list next tailwindcss postcss autoprefixer 2>/dev/null || echo "一部パッケージが見つかりません（npm install が必要な可能性）"
else
    echo "❌ package.json が見つかりません"
    exit 1
fi

echo ""
echo "🔧 ステップ4: Tailwind CSS設定の確認"
if [ -f "tailwind.config.js" ]; then
    echo "✅ tailwind.config.js が存在します"
    echo "📋 Tailwindパスの確認:"
    grep -A 5 '"content"' tailwind.config.js || echo "content設定が見つかりません"
else
    echo "❌ tailwind.config.js が見つかりません"
fi

if [ -f "postcss.config.js" ]; then
    echo "✅ postcss.config.js が存在します"
else
    echo "❌ postcss.config.js が見つかりません"
fi

echo ""
echo "🔧 ステップ5: グローバルCSS確認"
if [ -f "src/app/globals.css" ]; then
    echo "✅ globals.css が存在します"
    echo "📋 Tailwind インポートの確認:"
    head -5 src/app/globals.css
else
    echo "❌ globals.css が見つかりません"
fi

echo ""
echo "🔧 ステップ6: クリーンアップとリビルド"
echo "🗑️ 古いビルドファイルを削除中..."
rm -rf .next

echo "🔄 .nextキャッシュを削除中..."
rm -rf node_modules/.cache 2>/dev/null || true

echo "📦 本番ビルドを実行中..."
echo "実行コマンド: NODE_ENV=production npm run build"

# ビルド実行
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルドが成功しました"
    
    echo ""
    echo "📊 ビルド結果確認:"
    echo "📁 .next/static/ ディレクトリの内容:"
    ls -la .next/static/ | head -10
    
    echo ""
    echo "📁 CSS ファイルの確認:"
    find .next/static -name "*.css" -type f | head -5
    
    echo ""
    echo "📊 ファイルサイズ確認:"
    du -h .next/static/css/*.css 2>/dev/null | head -3 || echo "CSSファイルが見つかりません"
    
else
    echo "❌ ビルドが失敗しました"
    echo ""
    echo "🔍 よくある問題と解決策:"
    echo "1. TypeScriptエラー → next.config.js で ignoreBuildErrors: true に設定済みか確認"
    echo "2. ESLintエラー → next.config.js で ignoreDuringBuilds: true に設定済みか確認"
    echo "3. 依存関係エラー → npm install を実行"
    echo "4. メモリ不足 → NODE_OPTIONS='--max-old-space-size=4096' を追加"
    
    exit 1
fi

echo ""
echo "🔧 ステップ7: 動作確認のための基本チェック"
echo "✅ Next.js設定の確認:"
node -e "console.log('Next.js設定:', JSON.stringify(require('./next.config.js'), null, 2))" | head -15

echo ""
echo "✅ 環境変数の確認:"
echo "NODE_ENV=${NODE_ENV:-'not set'}"
echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-'not set'}"

echo ""
echo "🎉 緊急レイアウト修復が完了しました！"
echo ""
echo "📋 次のステップ:"
echo "1. 本番サーバーでこのビルドをデプロイ"
echo "2. PM2でNext.jsプロセスを再起動"
echo "3. Nginxの設定確認と再起動"
echo "4. ブラウザでの動作確認"
echo ""
echo "🚀 本番サーバーでの適用コマンド例:"
echo "   pm2 restart posl-frontend"
echo "   sudo systemctl restart nginx"
echo "   curl -I http://localhost/"
echo ""
echo "🔧 このスクリプト完了時刻: $(date)"