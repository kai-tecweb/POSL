# 🗃️ POSL MySQL スキーマ設計・DDL作成

**作成日**: 2025年11月17日  
**目的**: DynamoDB → MySQL 移行対応のデータベーススキーマ設計

## 📊 テーブル設計概要

### 設計原則
1. **DynamoDB互換性**: 既存APIとの完全互換性保持
2. **JSON対応**: MySQL 8.0のJSON型を活用してDynamoDBの柔軟性を再現
3. **正規化**: 適度な正規化でパフォーマンスと整合性を両立
4. **インデックス最適化**: 検索性能を重視したインデックス設計

### DynamoDB → MySQL マッピング

| DynamoDB | MySQL | 変更点 |
|----------|--------|--------|
| `userId` (Hash Key) | `user_id` (VARCHAR PRIMARY KEY) | 命名規則統一 |
| JSON形式の属性 | JSON型 + 必要に応じて列分離 | 性能とクエリ性を両立 |
| GSI (Global Secondary Index) | インデックス | 検索性能保持 |
| Range Key | 複合主キー | DynamoDBの並び順を再現 |

---

## 🗃️ テーブル構造定義

### 1. users テーブル
**用途**: ユーザー基本情報管理
```sql
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY COMMENT 'ユーザーID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
    user_data JSON COMMENT 'ユーザー詳細データ（DynamoDB互換）',
    
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='ユーザー管理テーブル';
```

### 2. settings テーブル
**用途**: ユーザー設定情報管理（曜日テーマ、文体設定等）
```sql
CREATE TABLE settings (
    user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
    setting_type VARCHAR(100) NOT NULL COMMENT '設定種類（week-theme, tone, template等）',
    setting_data JSON NOT NULL COMMENT '設定詳細データ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
    
    PRIMARY KEY (user_id, setting_type),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user_settings (user_id, updated_at),
    INDEX idx_setting_type (setting_type)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='ユーザー設定管理テーブル';
```

### 3. post_logs テーブル
**用途**: 投稿ログ・履歴管理
```sql
CREATE TABLE post_logs (
    user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
    post_id VARCHAR(255) NOT NULL COMMENT '投稿ID',
    timestamp VARCHAR(50) NOT NULL COMMENT 'タイムスタンプ（ISO 8601形式）',
    post_data JSON NOT NULL COMMENT '投稿詳細データ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- DynamoDB GSI相当: timestamp-index
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_timestamp (timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='投稿ログ管理テーブル';
```

### 4. diaries テーブル
**用途**: 日記・音声データ管理
```sql
CREATE TABLE diaries (
    user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
    diary_id VARCHAR(255) NOT NULL COMMENT '日記ID',
    created_at VARCHAR(50) NOT NULL COMMENT '作成日時（ISO 8601形式）',
    diary_data JSON NOT NULL COMMENT '日記詳細データ',
    content TEXT COMMENT '日記本文（検索用）',
    created_at_ts TIMESTAMP GENERATED ALWAYS AS (STR_TO_DATE(created_at, '%Y-%m-%dT%H:%i:%s.%fZ')) STORED COMMENT 'タイムスタンプ（検索用）',
    
    PRIMARY KEY (user_id, diary_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- DynamoDB GSI相当: created-at-index
    INDEX idx_user_created_at (user_id, created_at),
    INDEX idx_created_at_ts (user_id, created_at_ts),
    
    -- 全文検索用インデックス
    FULLTEXT INDEX ft_content (content)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='日記管理テーブル';
```

### 5. persona_profiles テーブル
**用途**: AI人格プロファイル管理
```sql
CREATE TABLE persona_profiles (
    user_id VARCHAR(255) PRIMARY KEY COMMENT 'ユーザーID',
    persona_data JSON NOT NULL COMMENT '人格プロファイルデータ',
    analysis_summary TEXT COMMENT '人格分析要約（検索用）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_updated_at (updated_at),
    
    -- 人格分析結果の全文検索
    FULLTEXT INDEX ft_analysis (analysis_summary)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='人格プロファイル管理テーブル';
```

---

## 🔧 初期データ・制約設定

### デフォルトユーザー作成
```sql
-- システム共通ユーザー（テスト・デフォルト用）
INSERT INTO users (user_id, user_data) VALUES
('system', JSON_OBJECT('role', 'system', 'name', 'System User')),
('demo', JSON_OBJECT('role', 'demo', 'name', 'Demo User'));
```

### 設定データの制約
```sql
-- 設定種別の制約（CHECK制約）
ALTER TABLE settings ADD CONSTRAINT chk_setting_type 
CHECK (setting_type IN (
    'week-theme', 'event', 'trend', 'tone', 
    'template', 'prompt', 'post-time'
));
```

---

## 📈 性能最適化設定

### インデックス最適化
```sql
-- よく使用されるクエリパターンに対応
-- 1. PromptEngineでの設定取得
CREATE INDEX idx_settings_lookup ON settings(user_id, setting_type, updated_at);

-- 2. 最近の日記取得（getRecentDiaryContext）
CREATE INDEX idx_recent_diaries ON diaries(user_id, created_at_ts DESC);

-- 3. 投稿履歴の時系列取得
CREATE INDEX idx_posts_timeline ON post_logs(user_id, timestamp DESC);
```

### テーブル設定最適化
```sql
-- InnoDB設定最適化
SET GLOBAL innodb_buffer_pool_size = 2GB;
SET GLOBAL innodb_log_file_size = 512MB;
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
```

---

## 🔄 データ移行用マッピング

### DynamoDB → MySQL データ変換ルール

| 操作 | DynamoDB | MySQL |
|------|----------|--------|
| **Users** | `userId` → Item | `user_id` → `user_data` JSON |
| **Settings** | `(userId, settingType)` → Item | `(user_id, setting_type)` → `setting_data` JSON |
| **PostLogs** | `(userId, postId)` → Item | `(user_id, post_id)` → `post_data` JSON |
| **Diaries** | `(userId, diaryId)` → Item | `(user_id, diary_id)` → `diary_data` JSON |
| **PersonaProfiles** | `userId` → Item | `user_id` → `persona_data` JSON |

### JSON構造保持例
```javascript
// DynamoDB形式
{
  userId: "demo",
  settingType: "tone",
  politeness: 85,
  casualness: 30,
  // ...その他属性
}

// MySQL形式
{
  user_id: "demo",
  setting_type: "tone", 
  setting_data: {
    politeness: 85,
    casualness: 30,
    // ...その他属性をJSONで保持
  }
}
```

---

## 💾 バックアップ・復旧設定

### 自動バックアップ設定
```sql
-- 毎日午前2時に自動バックアップ
-- （本番環境では外部ツール使用推奨）
CREATE EVENT evt_daily_backup
ON SCHEDULE EVERY 1 DAY STARTS '2025-11-18 02:00:00'
DO
  CALL sp_backup_posl_database();
```

### 復旧手順準備
- Point-in-timeリカバリ対応
- 増分バックアップによる高速復旧
- 移行期間中はDynamoDB並行バックアップ保持

---

*📋 作成日: 2025年11月17日*  
*🚀 MySQL移行Phase 6開始*  
*🎯 目標: DynamoDB完全互換のMySQL環境構築*