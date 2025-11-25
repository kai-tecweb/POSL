# POSLプロンプトエンジン カスタマイズガイド

**作成日**: 2025年11月19日  
**対象**: システム管理者・開発者・運用担当者  
**バージョン**: V1.2

## 🎯 概要

POSLシステムのプロンプトエンジンは高度にカスタマイズ可能で、投稿の内容・トーン・スタイルを細かく調整できます。このガイドでは具体的なカスタマイズ方法を説明します。

## 📊 現在のプロンプトエンジン設定

### 🔧 プロンプト設定
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

### 🎨 トーン設定（0-100スケール）
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

### 📝 テンプレート設定
```json
{
  "enabled_templates": [
    "daily_reflection",    // 日記反映型
    "learning_insight",    // 学び・洞察型
    "goal_progress",       // 目標進捗型
    "gratitude_moment",    // 感謝表現型
    "creative_thinking",   // 創造思考型
    "problem_solving",     // 問題解決型
    "inspiration_share",   // インスピレーション共有型
    "skill_development",   // スキル向上型
    "mindfulness",         // マインドフルネス型
    "future_planning"      // 未来計画型
  ],
  "priorities": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}
```

## 🛠️ カスタマイズ方法

### 方法1: データベース直接編集

#### 🔧 プロンプト設定の変更
```bash
# 投資・フィンテック特化版
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "UPDATE settings SET setting_data = JSON_OBJECT(
    'ng_words', JSON_ARRAY('絶対儲かる', '必ず勝てる', '100%確実'),
    'additional_rules', JSON_ARRAY(
      '投資・フィンテック業界の最新情報を分かりやすく解説',
      'リスクと機会の両面を公平に言及',
      'データに基づいた客観的な分析を心がける',
      '初心者にも理解しやすい表現を使用'
    ),
    'creativity_level', 80,
    'preferred_phrases', JSON_ARRAY(
      '最近の市場動向では',
      'データを見ると',
      '注目すべきは',
      '今後の展望として'
    )
  ) WHERE user_id = 'demo' AND setting_type = 'prompt';"
```

#### 🎨 トーン設定の調整
```bash
# よりプロフェッショナル・知的なトーン
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "UPDATE settings SET setting_data = JSON_OBJECT(
    'humorous', 30,      // ユーモア控えめ
    'emotional', 40,     // 感情表現控えめ
    'casualness', 30,    // フォーマル寄り
    'creativity', 75,    // 高い創造性
    'politeness', 85,    // 高い丁寧さ
    'positivity', 70,    // 適度なポジティブさ
    'intellectual', 90   // 高い知的レベル
  ) WHERE user_id = 'demo' AND setting_type = 'tone';"
```

### 方法2: 設定バリエーション

#### 📈 投資分析特化設定
```json
{
  "ng_words": ["絶対", "必ず", "確実に儲かる", "リスクなし"],
  "additional_rules": [
    "データと事実に基づいた分析を提供",
    "投資リスクを必ず言及",
    "専門用語には簡潔な説明を併記",
    "長期的な視点を重視"
  ],
  "creativity_level": 75,
  "preferred_phrases": [
    "データによると",
    "市場分析では",
    "リスク要因として",
    "長期的な観点から"
  ]
}
```

#### 🚀 テック・イノベーション特化設定
```json
{
  "ng_words": ["古い技術", "時代遅れ"],
  "additional_rules": [
    "最新技術トレンドを積極的に取り入れ",
    "イノベーションの可能性を探求",
    "技術の実用性と課題を両面から分析",
    "未来志向の表現を多用"
  ],
  "creativity_level": 90,
  "preferred_phrases": [
    "革新的な",
    "次世代の",
    "画期的な",
    "将来性のある"
  ]
}
```

#### 💼 ビジネス実務特化設定
```json
{
  "ng_words": ["楽して", "簡単に"],
  "additional_rules": [
    "実践的なビジネスアドバイスを提供",
    "具体的な事例や数字を活用",
    "ROIや効率性の観点を重視",
    "実行可能性を考慮した提案"
  ],
  "creativity_level": 65,
  "preferred_phrases": [
    "実際のところ",
    "効率的に",
    "実践的には",
    "結果として"
  ]
}
```

## 🎯 テンプレートカスタマイズ

### 新規テンプレート追加例

#### 市場分析テンプレート
```javascript
"market_analysis": {
  "structure": "市場状況→分析→見通し",
  "description": "市場データを基にした分析投稿",
  "tone_adjustment": {
    "intellectual": "+20",
    "creativity": "+10"
  }
}
```

#### イノベーション紹介テンプレート
```javascript
"innovation_spotlight": {
  "structure": "技術紹介→影響分析→将来性",
  "description": "新技術・イノベーションの紹介",
  "tone_adjustment": {
    "creativity": "+25",
    "positivity": "+15"
  }
}
```

## 🔄 プロンプトエンジンのテスト

### テスト用コマンド
```bash
# プロンプトエンジンを使用した投稿テスト
ssh -i ~/.ssh/posl-production-key.pem ubuntu@18.179.104.143
cd /home/ubuntu
./manual-post.sh ai
```

### 設定反映確認
```bash
# 現在の設定確認
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "SELECT setting_type, JSON_PRETTY(setting_data) FROM settings 
      WHERE setting_type IN ('prompt', 'tone', 'template');"
```

## ⚙️ 高度なカスタマイズ

### システムメッセージの直接編集
プロンプトエンジンのソースコード（`prompt-engine.ts`）を直接編集して、システムメッセージ生成ロジックを変更

### ユーザーメッセージの構造変更
コンテキスト情報の組み合わせ方法や優先順位を調整

### トレンド統合の調整
トレンド情報の取り込み方法や重要度を変更

## 📊 効果測定

### A/Bテスト実施
```bash
# 設定A
UPDATE settings SET setting_data = '設定A' WHERE setting_type = 'prompt';
# 投稿実行・結果記録

# 設定B  
UPDATE settings SET setting_data = '設定B' WHERE setting_type = 'prompt';
# 投稿実行・結果記録
```

### 投稿品質の分析
- 文字数分布
- ハッシュタグ使用状況
- 感情分析スコア
- エンゲージメント率（手動確認）

## 🚨 注意点・制限事項

### 設定変更時の注意
1. **バックアップ必須**: 変更前に現在設定を保存
2. **段階的変更**: 一度に大幅変更せず、段階的に調整
3. **テスト実行**: 本番投稿前に必ずテスト投稿で確認

### 技術的制限
1. **文字数制限**: X投稿の280文字制限
2. **API制限**: OpenAI APIのレート制限
3. **データベース制限**: JSON設定データのサイズ制限

### 品質管理
1. **NGワードチェック**: 不適切な表現の防止
2. **トーンバランス**: 極端な設定値の回避
3. **一貫性確保**: ブランドイメージとの整合性

## 🔧 トラブルシューティング

### 設定が反映されない場合
```bash
# APIサーバー再起動
pkill -f simple_final_api.js
cd /home/ubuntu/backend
nohup node simple_final_api.js > simple_final_api.log 2>&1 &
```

### プロンプト生成エラーの確認
```bash
# プロンプトエンジンのログ確認
tail -f /home/ubuntu/backend/simple_final_api.log | grep -i prompt
```

### 設定の復元
```bash
# デフォルト設定に戻す
mysql -h posl-production.cxiucq08iku4.ap-northeast-1.rds.amazonaws.com \
  -P 3306 -u admin -p"PoSL-Prod-2024!" -D posl_db \
  -e "UPDATE settings SET setting_data = 'デフォルト設定JSON' 
      WHERE setting_type = 'prompt';"
```

## 📚 関連ドキュメント

- `POSL_手動投稿スクリプト一覧.md` - 投稿実行方法
- `POSL_トラブルシューティングガイド.md` - 問題解決方法
- `backend/src/libs/prompt-engine.ts` - プロンプトエンジン実装

---

**作成**: GitHub Copilot  
**更新**: 2025年11月19日  
**次回更新**: プロンプトエンジン機能拡張時