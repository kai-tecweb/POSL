-- ============================================================
-- POSL V1.1 Phase 1: イベント投稿機能 - テーブル作成
-- ============================================================
-- 作成日: 2025-11-25
-- 目的: イベント投稿機能と商品管理機能のための新規テーブル作成
-- 実行順序: 001 → 002 → 003
-- ============================================================

USE posl_db;

-- ============================================================
-- 1. events テーブル（イベント管理）
-- ============================================================
-- 役割: 固定イベント（元日、バレンタイン等）とパーソナルイベント（誕生日、記念日等）を管理
-- イベント投稿の判定に使用
CREATE TABLE IF NOT EXISTS events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  event_type ENUM('fixed','personal') NOT NULL COMMENT 'fixed: 固定イベント, personal: パーソナルイベント',
  title VARCHAR(255) NOT NULL COMMENT 'イベント名',
  date DATE NOT NULL COMMENT 'イベント日付（YYYY-MM-DD）',
  description TEXT COMMENT 'イベント説明',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '有効/無効フラグ',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_date (user_id, date),
  INDEX idx_date_enabled (date, is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='イベント管理テーブル（固定イベント・パーソナルイベント）';

-- ============================================================
-- 2. today_events テーブル（今日は何の日）
-- ============================================================
-- 役割: 一般的な「今日は何の日」情報を管理
-- イベント投稿の参考情報として使用
CREATE TABLE IF NOT EXISTS today_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL COMMENT '日付（YYYY-MM-DD）',
  title VARCHAR(255) NOT NULL COMMENT 'イベント名',
  description TEXT COMMENT 'イベント説明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='今日は何の日テーブル（一般的な記念日・イベント）';

-- ============================================================
-- 3. products テーブル（商品管理 - Phase 2用）
-- ============================================================
-- 役割: 商品情報を管理（Phase 2の商品投稿機能で使用）
-- 月曜日の「宣伝デー」で使用予定
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL COMMENT '商品名',
  short_description VARCHAR(500) COMMENT '短い説明',
  description TEXT COMMENT '詳細説明',
  url VARCHAR(500) COMMENT '商品URL（LPや購入ページ）',
  is_active BOOLEAN DEFAULT TRUE COMMENT '有効/無効フラグ',
  priority INT DEFAULT 0 COMMENT '優先度（数値が大きいほど優先）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='商品管理テーブル（Phase 2: 商品投稿機能用）';

