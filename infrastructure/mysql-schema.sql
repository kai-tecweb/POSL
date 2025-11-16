-- =====================================================
-- POSL MySQL Database Schema DDL
-- 作成日: 2025年11月17日
-- 目的: DynamoDB → MySQL アーキテクチャ移行
-- =====================================================

-- データベース作成
CREATE DATABASE IF NOT EXISTS posl_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE posl_db;

-- =====================================================
-- 1. users テーブル
-- =====================================================
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

-- =====================================================
-- 2. settings テーブル  
-- =====================================================
CREATE TABLE settings (
    user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
    setting_type VARCHAR(100) NOT NULL COMMENT '設定種類（week-theme, tone, template等）',
    setting_data JSON NOT NULL COMMENT '設定詳細データ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
    
    PRIMARY KEY (user_id, setting_type),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user_settings (user_id, updated_at),
    INDEX idx_setting_type (setting_type),
    INDEX idx_settings_lookup (user_id, setting_type, updated_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='ユーザー設定管理テーブル';

-- 設定種別の制約
ALTER TABLE settings ADD CONSTRAINT chk_setting_type 
CHECK (setting_type IN (
    'week-theme', 'event', 'trend', 'tone', 
    'template', 'prompt', 'post-time'
));

-- =====================================================
-- 3. post_logs テーブル
-- =====================================================
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
    INDEX idx_created_at (created_at),
    INDEX idx_posts_timeline (user_id, timestamp DESC)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='投稿ログ管理テーブル';

-- =====================================================
-- 4. diaries テーブル
-- =====================================================
CREATE TABLE diaries (
    user_id VARCHAR(255) NOT NULL COMMENT 'ユーザーID',
    diary_id VARCHAR(255) NOT NULL COMMENT '日記ID',
    created_at VARCHAR(50) NOT NULL COMMENT '作成日時（ISO 8601形式）',
    diary_data JSON NOT NULL COMMENT '日記詳細データ',
    content TEXT COMMENT '日記本文（検索用）',
    created_at_ts TIMESTAMP GENERATED ALWAYS AS (
        CASE 
            WHEN created_at REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' 
            THEN STR_TO_DATE(SUBSTRING(created_at, 1, 19), '%Y-%m-%dT%H:%i:%s')
            ELSE NULL
        END
    ) STORED COMMENT 'タイムスタンプ（検索用）',
    
    PRIMARY KEY (user_id, diary_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- DynamoDB GSI相当: created-at-index
    INDEX idx_user_created_at (user_id, created_at),
    INDEX idx_created_at_ts (user_id, created_at_ts),
    INDEX idx_recent_diaries (user_id, created_at_ts DESC),
    
    -- 全文検索用インデックス
    FULLTEXT INDEX ft_content (content)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='日記管理テーブル';

-- =====================================================
-- 5. persona_profiles テーブル
-- =====================================================
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

-- =====================================================
-- 初期データ挿入
-- =====================================================

-- システム共通ユーザー作成
INSERT INTO users (user_id, user_data) VALUES
('system', JSON_OBJECT('role', 'system', 'name', 'System User', 'created_at', NOW())),
('demo', JSON_OBJECT('role', 'demo', 'name', 'Demo User', 'created_at', NOW()));

-- デモユーザー用初期設定
INSERT INTO settings (user_id, setting_type, setting_data) VALUES
-- 曜日テーマ設定
('demo', 'week-theme', JSON_OBJECT(
    'monday', '新しい週の始まり、今週の目標について',
    'tuesday', '仕事や学習のペース、生産性向上について', 
    'wednesday', '週の中間点、進捗確認と調整について',
    'thursday', 'もうすぐ週末、今週の成果と課題について',
    'friday', '週末前、今週の振り返りと来週の準備について',
    'saturday', 'リラックス、趣味や休息について',
    'sunday', '週の終わり、内省と来週への準備について'
)),

-- 文体設定（デフォルト値）
('demo', 'tone', JSON_OBJECT(
    'politeness', 70,
    'casualness', 50, 
    'positivity', 75,
    'intellectual', 60,
    'emotional', 55,
    'humorous', 40,
    'creativity', 65
)),

-- 投稿テンプレート設定
('demo', 'template', JSON_OBJECT(
    'priorities', JSON_ARRAY(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    'enabled_templates', JSON_ARRAY(
        'daily_reflection', 'learning_insight', 'goal_progress',
        'gratitude_moment', 'creative_thinking', 'problem_solving',
        'inspiration_share', 'skill_development', 'mindfulness',
        'future_planning'
    )
)),

-- プロンプト微調整設定
('demo', 'prompt', JSON_OBJECT(
    'additional_rules', JSON_ARRAY(
        '自然で親しみやすい文体を心がける',
        'ハッシュタグは#POSL_V1のみ使用',
        '280文字以内で簡潔にまとめる'
    ),
    'ng_words', JSON_ARRAY(),
    'preferred_phrases', JSON_ARRAY(
        '今日は', 'ふと思った', 'やっぱり', 'なるほど'
    ),
    'creativity_level', 70
)),

-- 投稿時間設定
('demo', 'post-time', JSON_OBJECT(
    'hour', 9,
    'minute', 0,
    'timezone', 'Asia/Tokyo',
    'enabled', true
));

-- デモユーザー用サンプル日記
INSERT INTO diaries (user_id, diary_id, created_at, diary_data, content) VALUES
('demo', 'diary_001', '2025-11-17T08:30:00.000Z', 
 JSON_OBJECT(
     'title', '今日の振り返り',
     'content', '今日は朝から良い天気で、散歩をして気分がすっきりした。仕事でも新しいアイデアが浮かんで、充実した一日だった。',
     'mood', 'positive',
     'tags', JSON_ARRAY('散歩', '仕事', 'アイデア'),
     'audio_file_url', null,
     'transcription_status', 'completed'
 ),
 '今日は朝から良い天気で、散歩をして気分がすっきりした。仕事でも新しいアイデアが浮かんで、充実した一日だった。'),

('demo', 'diary_002', '2025-11-16T19:15:00.000Z',
 JSON_OBJECT(
     'title', '技術学習メモ',
     'content', 'MySQLの新機能について調べていて、JSON型の活用方法が面白いと思った。NoSQLの良さとRDBの堅牢性を両立できそう。',
     'mood', 'curious', 
     'tags', JSON_ARRAY('技術', 'MySQL', 'JSON', '学習'),
     'audio_file_url', null,
     'transcription_status', 'completed'
 ),
 'MySQLの新機能について調べていて、JSON型の活用方法が面白いと思った。NoSQLの良さとRDBの堅牢性を両立できそう。');

-- デモユーザー用人格プロファイル
INSERT INTO persona_profiles (user_id, persona_data, analysis_summary) VALUES
('demo', 
 JSON_OBJECT(
     'personality_traits', JSON_OBJECT(
         'openness', 75,
         'conscientiousness', 80,
         'extraversion', 60, 
         'agreeableness', 85,
         'neuroticism', 30
     ),
     'interests', JSON_ARRAY('技術', '学習', '散歩', '読書', '思考'),
     'communication_style', 'thoughtful and analytical',
     'values', JSON_ARRAY('成長', '学習', '効率', '創造性'),
     'recent_themes', JSON_ARRAY('技術への関心', '日常の充実', '新しい発見'),
     'analysis_date', '2025-11-17T00:00:00.000Z'
 ),
 '好奇心旺盛で学習意欲が高い。技術に対する関心が強く、論理的思考を好む。日常生活でも充実感を大切にしており、散歩などのシンプルな活動からも喜びを見出す傾向がある。');

-- =====================================================
-- パフォーマンス設定最適化
-- =====================================================

-- InnoDB設定（セッション固有）
SET SESSION innodb_lock_wait_timeout = 5;
SET SESSION transaction_isolation = 'READ-COMMITTED';

-- クエリキャッシュ設定（MySQL 5.7以前の場合）
-- SET GLOBAL query_cache_type = ON;
-- SET GLOBAL query_cache_size = 268435456; -- 256MB

-- =====================================================
-- 作成完了ログ
-- =====================================================
SELECT 'POSL MySQL Database Schema Created Successfully!' as status,
       NOW() as created_at,
       @@version as mysql_version,
       DATABASE() as current_database;