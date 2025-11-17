# 📚 POSLプロジェクト ドキュメント

このディレクトリにはPOSL (Personal Opinion SNS Launcher) プロジェクトの全ドキュメントが整理されています。

## 📁 ディレクトリ構造

### 🟢 `/active` - 現在アクティブなドキュメント
現在の開発で使用されている最新のドキュメント群

- **`API仕様書_v2.0.md`** - 全APIエンドポイントの仕様
- **`UI設計書.md`** - フロントエンド画面設計・コンポーネント仕様
- **`アーキテクチャ設計.md`** - システム全体のアーキテクチャ設計
- **`プロンプト設計書.md`** - AI生成用プロンプトの設計指針
- **`統合仕様書.md`** - プロジェクト全体の統合仕様
- **`開発ロードマップ.md`** - 開発フェーズとマイルストーン

### 📦 `/archive` - アーカイブドキュメント
過去のフェーズで作成された履歴ドキュメント

#### `/archive/phase5-6_migration`
- **`MySQL_Schema_Design.md`** - データベース設計書
- **`Phase6_Week1-2_実装レポート.md`** - MySQL移行実装レポート
- **`アーキテクチャ移行調査報告書.md`** - DynamoDB→MySQL移行調査
- **`移行実行計画書.md`** - データ移行計画書

#### `/archive/phase7_external-api`
- **`Phase7_完了レポート.md`** - 外部API統合フェーズの完了報告

## 🚀 現在の開発状況

### ✅ **完了フェーズ**
- **Phase 0-4**: 基盤開発 (Docker、DynamoDB、Lambda基盤)
- **Phase 5**: MySQL移行・データベース最適化
- **Phase 6**: PromptEngine v1.0・フロントエンド完成
- **Phase 7**: 外部API統合 (OpenAI、X API、Trends API)
- **Phase 8**: Next.js 16アップグレード・機能強化

### 🔄 **現在のフェーズ**
**Phase 8 Week 3-4**: 最終機能実装・UI改善
- 投稿プレビュー機能
- ダッシュボード強化
- システム監視・分析機能

## 📊 ドキュメント更新履歴

| 日付 | 更新内容 | 対象ドキュメント |
|------|----------|-----------------|
| 2024-11-17 | ドキュメント構造整理・アーカイブ化 | 全体構造 |
| 2024-11-16 | Phase 8完了・最新機能反映 | 統合仕様書、API仕様書 |
| 2024-11-15 | Next.js 16対応・UI仕様更新 | UI設計書 |

## 🔗 関連リンク

- **GitHub Repository**: https://github.com/kai-tecweb/POSL
- **開発環境**: Next.js 16 + TypeScript + Tailwind CSS
- **バックエンド**: AWS Lambda + Serverless Framework
- **データベース**: MySQL (RDS)

---

**最終更新**: 2024年11月17日  
**ドキュメント整理**: Phase 8完了時点