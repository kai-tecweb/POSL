# POSL - Claude Code 作業ルール

このファイルはClaude Codeへの指示です。作業時は必ずこのルールに従ってください。

## 🚨 最重要ルール

### 1. 調査と実装は分ける
- 「調査」と言われたら → 調査のみ。コード変更禁止
- 「実装」と言われたら → 実装してOK
- 判断に迷ったら → 質問する

### 2. 勝手に進めない
- 指示された範囲のみ実行
- 追加の改善提案は「提案」として報告
- 承認なしに実装しない

## 🚫 禁止事項

### ファイル作成
- `xxx_backup.js` 作成禁止
- `xxx_old.js` 作成禁止
- `xxx_v2.js` 作成禁止
- `xxx_test.js` 放置禁止（使ったら削除）
- 一時ファイルは即削除

### 命名
- `simple_final_xxx` のような曖昧な名前禁止
- `new_xxx` 禁止
- 機能がわかる名前をつける

### フォルダ
- ルート直下にファイル散乱禁止
- ドキュメントは `ドキュメント/` フォルダへ
- コードとドキュメントを混在させない

## ✅ 必須ルール

### 作業前
```bash
# 現在のハッシュを記録（ロールバック用）
git rev-parse HEAD
git status
```

### 作業後
```bash
# 変更内容を確認
git diff
git status
```

### 命名規則

| 種類 | 形式 | 例 |
|------|------|-----|
| APIファイル | kebab-case | post-scheduler.js |
| コンポーネント | PascalCase | PostScheduler.tsx |
| 変数 | camelCase | postContent |
| 定数 | UPPER_SNAKE | MAX_RETRY |
| ドキュメント | 日本語OK | 開発ルール.md |

### フォルダ構造

```
POSL/
├── backend/          # バックエンドコード（英語）
├── frontend/         # フロントエンドコード（英語）
├── infrastructure/   # AWS設定（英語）
├── ドキュメント/      # ドキュメント（日本語OK）
└── scripts/          # スクリプト（英語）
```

### Git操作
- コミットメッセージ: `[種類] 変更内容`
- 種類: [機能追加] [修正] [改善] [設定] [ドキュメント]
- 作業完了後は必ず `git status` で確認

## 📍 開発環境

### 開発フロー

```
ローカル（開発）
    ↓ git push
GitHub（コード管理）
    ↓ git pull + build + restart
EC2（本番）
```

### 環境

| 環境 | 用途 | パス |
|------|------|------|
| ローカル | 開発・コード編集 | ~/POSL/ |
| EC2 | 本番運用 | /home/ubuntu/POSL-repo/ |

### デプロイ手順

```bash
# 1. ローカルでコミット・プッシュ
git add .
git commit -m "[種類] 変更内容"
git push origin main

# 2. EC2にSSH接続
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143

# 3. EC2でpull・ビルド・再起動
cd /home/ubuntu/POSL-repo
git pull origin main
cd frontend && npm install && npm run build
pm2 restart posl-frontend
pm2 restart posl-api
```

### 注意

- ローカル環境でのみコード編集する
- EC2で直接コード編集しない
- /home/ubuntu/backend/ と /home/ubuntu/frontend/ は使用しない（廃止予定）

## 📖 詳細ルール

詳細は `ドキュメント/運用手順/開発ルール.md` を参照

---

