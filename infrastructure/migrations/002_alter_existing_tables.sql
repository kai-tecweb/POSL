-- ============================================================
-- POSL V1.1 Phase 1: イベント投稿機能 - 既存テーブル拡張
-- ============================================================
-- 作成日: 2025-11-25
-- 目的: 既存テーブル（posts, post_logs）にイベント投稿機能用のカラムを追加
-- 実行順序: 001 → 002 → 003
-- 前提: 001_create_v1.1_tables.sql が実行済みであること
-- ============================================================

USE posl_db;

-- ============================================================
-- 1. posts テーブルへのカラム追加
-- ============================================================
-- 役割: 投稿タイプ（通常/イベント）と関連情報を追加
-- 注意: 既存データには post_type='normal' が自動設定される

-- post_type カラム追加（投稿タイプ: normal=通常投稿, event=イベント投稿）
ALTER TABLE posts 
ADD COLUMN post_type ENUM('normal','event') DEFAULT 'normal' COMMENT '投稿タイプ: normal=通常投稿, event=イベント投稿'
AFTER status;

-- event_id カラム追加（イベント投稿の場合のイベントID）
ALTER TABLE posts 
ADD COLUMN event_id INT NULL COMMENT 'イベント投稿の場合のイベントID（events.idへの参照）'
AFTER post_type;

-- product_id カラム追加（商品投稿の場合の商品ID - Phase 2用）
ALTER TABLE posts 
ADD COLUMN product_id INT NULL COMMENT '商品投稿の場合の商品ID（products.idへの参照、Phase 2用）'
AFTER event_id;

-- template_id カラム追加（使用したテンプレートID）
ALTER TABLE posts 
ADD COLUMN template_id VARCHAR(100) NULL COMMENT '使用したテンプレートID'
AFTER product_id;

-- scheduled_at カラム追加（予約投稿時刻）
ALTER TABLE posts 
ADD COLUMN scheduled_at TIMESTAMP NULL COMMENT '予約投稿時刻'
AFTER template_id;

-- インデックス追加
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_event ON posts(event_id);
CREATE INDEX idx_posts_product ON posts(product_id);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at);

-- ============================================================
-- 2. post_logs テーブルへのカラム追加
-- ============================================================
-- 役割: 投稿ログにイベント投稿情報を追加
-- 注意: 既存データには NULL が設定される

-- post_type カラム追加（投稿タイプ: normal=通常投稿, event=イベント投稿）
ALTER TABLE post_logs 
ADD COLUMN post_type ENUM('normal','event') NULL COMMENT '投稿タイプ: normal=通常投稿, event=イベント投稿'
AFTER post_id;

-- event_id カラム追加（イベント投稿の場合のイベントID）
ALTER TABLE post_logs 
ADD COLUMN event_id INT NULL COMMENT 'イベント投稿の場合のイベントID（events.idへの参照）'
AFTER post_type;

-- インデックス追加
CREATE INDEX idx_post_logs_type ON post_logs(post_type);
CREATE INDEX idx_post_logs_event ON post_logs(event_id);

