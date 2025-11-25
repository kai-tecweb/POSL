-- ============================================================
-- POSL V1.1 Phase 1: イベント投稿機能 - データベース設計修正
-- ============================================================
-- 作成日: 2025-11-25
-- 目的: eventsテーブルとtoday_eventsテーブルを統合、event_typeに'today'を追加、鉄板イベントを25件に拡充
-- 実行順序: 001 → 002 → 003 → 004
-- 前提: 001, 002, 003が実行済みであること
-- ============================================================

USE posl_db;

-- ============================================================
-- Step 1: event_typeに'today'を追加
-- ============================================================
-- 役割: event_typeをENUM('fixed','today','personal')に拡張
-- 'today': 今日は何の日（today_eventsテーブルから統合）
ALTER TABLE events 
MODIFY event_type ENUM('fixed','today','personal') NOT NULL 
COMMENT 'fixed: 固定イベント, today: 今日は何の日, personal: パーソナルイベント';

-- ============================================================
-- Step 2: today_eventsテーブルを削除
-- ============================================================
-- 役割: today_eventsテーブルを削除（eventsテーブルに統合）
DROP TABLE IF EXISTS today_events;

-- ============================================================
-- Step 3: 既存のtest_userデータを削除
-- ============================================================
-- 役割: テストデータを削除し、新しいsystemデータに置き換え
DELETE FROM events WHERE user_id = 'test_user';

-- ============================================================
-- Step 4: 鉄板イベント25件を挿入（user_id='system'）
-- ============================================================
-- 役割: 日本の主要な祝日・イベントを25件登録
-- 注意: 祝日の日付は2025年の固定日付（移動祝日は概算）

-- 1月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '元日', '2025-01-01', 'お正月', TRUE),
('system', 'fixed', '成人の日', '2025-01-13', '成人の日（第2月曜）', TRUE);

-- 2月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '節分', '2025-02-03', '節分', TRUE),
('system', 'fixed', 'バレンタインデー', '2025-02-14', 'バレンタインデー', TRUE);

-- 3月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', 'ひな祭り', '2025-03-03', 'ひな祭り', TRUE),
('system', 'fixed', 'ホワイトデー', '2025-03-14', 'ホワイトデー', TRUE),
('system', 'fixed', '春分の日', '2025-03-20', '春分の日', TRUE);

-- 4月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', 'エイプリルフール', '2025-04-01', 'エイプリルフール', TRUE),
('system', 'fixed', '入学シーズン', '2025-04-01', '新学期・新年度', TRUE);

-- 5月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', 'ゴールデンウィーク', '2025-05-03', 'ゴールデンウィーク', TRUE),
('system', 'fixed', '母の日', '2025-05-11', '母の日（第2日曜）', TRUE);

-- 6月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '父の日', '2025-06-15', '父の日（第3日曜）', TRUE),
('system', 'fixed', '夏のボーナス', '2025-06-30', '夏のボーナス時期', TRUE);

-- 7月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '七夕', '2025-07-07', '七夕', TRUE),
('system', 'fixed', '海の日', '2025-07-21', '海の日（第3月曜）', TRUE);

-- 8月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', 'お盆', '2025-08-13', 'お盆', TRUE);

-- 9月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '敬老の日', '2025-09-15', '敬老の日（第3月曜）', TRUE),
('system', 'fixed', '秋分の日', '2025-09-23', '秋分の日', TRUE);

-- 10月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', 'スポーツの日', '2025-10-13', 'スポーツの日（第2月曜）', TRUE),
('system', 'fixed', 'ハロウィン', '2025-10-31', 'ハロウィン', TRUE);

-- 11月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '勤労感謝の日', '2025-11-23', '勤労感謝の日', TRUE);

-- 12月
INSERT INTO events (user_id, event_type, title, date, description, is_enabled) VALUES
('system', 'fixed', '冬のボーナス', '2025-12-10', '冬のボーナス時期', TRUE),
('system', 'fixed', 'クリスマスイブ', '2025-12-24', 'クリスマスイブ', TRUE),
('system', 'fixed', 'クリスマス', '2025-12-25', 'クリスマス', TRUE),
('system', 'fixed', '大晦日', '2025-12-31', '大晦日', TRUE);

-- ============================================================
-- 確認用クエリ（実行後、以下で確認可能）
-- ============================================================
-- SELECT COUNT(*) FROM events WHERE event_type='fixed' AND user_id='system';
-- SELECT * FROM events WHERE user_id='system' ORDER BY date;

