-- ============================================================
-- POSL V1.1 Phase 1: イベント投稿機能 - テストデータ挿入
-- ============================================================
-- 作成日: 2025-11-25
-- 目的: 鉄板イベント（固定イベント）のサンプルデータを挿入
-- 実行順序: 001 → 002 → 003
-- 前提: 001_create_v1.1_tables.sql が実行済みであること
-- ============================================================

USE posl_db;

-- ============================================================
-- 鉄板イベント（固定イベント）のサンプルデータ挿入
-- ============================================================
-- user_id='test_user' で作成
-- event_type='fixed' で固定イベントとして登録
-- is_enabled=TRUE で有効化

-- 元日（1月1日）
INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
VALUES (
  'test_user',
  'fixed',
  '元日',
  '2025-01-01',
  '新年の始まりを祝う日。新しい年の目標や抱負を語るのに最適な日です。',
  TRUE
);

-- バレンタインデー（2月14日）
INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
VALUES (
  'test_user',
  'fixed',
  'バレンタインデー',
  '2025-02-14',
  '大切な人に感謝の気持ちを伝える日。感謝や愛情を表現する投稿に適しています。',
  TRUE
);

-- ホワイトデー（3月14日）
INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
VALUES (
  'test_user',
  'fixed',
  'ホワイトデー',
  '2025-03-14',
  'バレンタインデーのお返しをする日。感謝の気持ちを伝える投稿に適しています。',
  TRUE
);

-- エイプリルフール（4月1日）
INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
VALUES (
  'test_user',
  'fixed',
  'エイプリルフール',
  '2025-04-01',
  '軽いジョークやユーモアを楽しむ日。明るく楽しい投稿に適しています。',
  TRUE
);

-- クリスマスイブ（12月24日）
INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
VALUES (
  'test_user',
  'fixed',
  'クリスマスイブ',
  '2025-12-24',
  'クリスマスの前夜。温かい気持ちや感謝を伝える投稿に適しています。',
  TRUE
);

-- クリスマス（12月25日）
INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
VALUES (
  'test_user',
  'fixed',
  'クリスマス',
  '2025-12-25',
  '一年で最も特別な日の一つ。祝福や感謝の気持ちを伝える投稿に適しています。',
  TRUE
);

-- ============================================================
-- 確認用クエリ（実行後、以下で確認可能）
-- ============================================================
-- SELECT * FROM events WHERE user_id='test_user' AND event_type='fixed' ORDER BY date;

