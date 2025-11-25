/**
 * イベントサービス
 * POSL V1.1 Phase 1: イベント投稿機能
 * POSL V1.1 Phase 3-3: 独自イベント（personal）CRUD API
 * 
 * 機能:
 * - 今日のイベント取得
 * - タイプ別イベント取得
 * - イベントON/OFF切り替え
 * - 独自イベント（personal）CRUD操作
 */

const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * MySQL接続を取得
 */
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
}

/**
 * 今日のイベントを取得
 * @param {string} date - 日付（YYYY-MM-DD形式、省略時は今日）
 * @returns {Promise<Array>} イベント配列
 * 
 * 処理: dateを'MM-DD'に変換してDBから取得
 * 例: '2025-02-22' → '02-22' → 猫の日取得
 */
async function getTodayEvents(date = null) {
  let connection;
  try {
    connection = await getConnection();
    
    // 日付が指定されていない場合は今日の日付を使用
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // YYYY-MM-DD形式からMM-DD形式に変換
    const dateParts = targetDate.split('-');
    const monthDay = `${dateParts[1]}-${dateParts[2]}`;
    
    // 2025年を付与して検索（年は固定）
    const fullDate = `2025-${monthDay}`;
    
    const query = `
      SELECT * FROM events 
      WHERE date = ? AND is_enabled = TRUE AND user_id = 'system'
      ORDER BY event_type, id
    `;
    
    const [rows] = await connection.execute(query, [fullDate]);
    await connection.end();
    
    return rows;
  } catch (error) {
    if (connection) await connection.end();
    console.error("❌ 今日のイベント取得エラー:", error);
    throw error;
  }
}

/**
 * タイプ別イベントを取得
 * @param {string} eventType - イベントタイプ（'fixed', 'today', 'personal'）
 * @param {string} userId - ユーザーID（personalの場合は必須、デフォルト: 'system'）
 * @returns {Promise<Array>} イベント配列
 * 
 * 処理: event_type別にイベントを取得
 * - fixed/today: user_id='system'のみ
 * - personal: 指定されたuser_idのイベント
 */
async function getEventsByType(eventType, userId = 'system') {
  let connection;
  try {
    // バリデーション
    if (!['fixed', 'today', 'personal'].includes(eventType)) {
      throw new Error("eventTypeは 'fixed', 'today', または 'personal' である必要があります");
    }
    
    connection = await getConnection();
    
    let query;
    let params;
    
    if (eventType === 'personal') {
      // personalの場合はuser_idでフィルタ
      query = "SELECT * FROM events WHERE event_type = ? AND user_id = ? ORDER BY date ASC";
      params = [eventType, userId];
    } else {
      // fixed/todayの場合は既存のロジック
      query = "SELECT * FROM events WHERE event_type = ? AND user_id = 'system' ORDER BY date ASC";
      params = [eventType];
    }
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    return rows;
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ タイプ別イベント取得エラー (${eventType}):`, error);
    throw error;
  }
}

/**
 * イベントのON/OFFを切り替え
 * @param {number} eventId - イベントID
 * @returns {Promise<Object>} 更新されたイベント
 * 
 * 処理: is_enabledをトグル（TRUE↔FALSE）
 */
async function toggleEvent(eventId) {
  let connection;
  try {
    connection = await getConnection();
    
    // 現在の状態を取得
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ? AND user_id = 'system'",
      [eventId]
    );
    
    if (rows.length === 0) {
      throw new Error(`イベントが見つかりません: id=${eventId}`);
    }
    
    const currentEnabled = rows[0].is_enabled;
    const newEnabled = !currentEnabled;
    
    // 状態を切り替え
    await connection.execute(
      "UPDATE events SET is_enabled = ? WHERE id = ? AND user_id = 'system'",
      [newEnabled, eventId]
    );
    
    // 更新されたイベントを取得
    const [updated] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );
    
    await connection.end();
    
    return updated[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ イベントON/OFF切り替えエラー (id=${eventId}):`, error);
    throw error;
  }
}

/**
 * 独自イベント（personal）一覧を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} イベント配列
 */
async function getPersonalEvents(userId) {
  let connection;
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE user_id = ? AND event_type = 'personal' ORDER BY date ASC",
      [userId]
    );
    
    await connection.end();
    return rows;
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ 独自イベント取得エラー (userId=${userId}):`, error);
    throw error;
  }
}

/**
 * 特定のイベントを取得
 * @param {number} eventId - イベントID
 * @param {string} userId - ユーザーID（権限確認用）
 * @returns {Promise<Object>} イベントオブジェクト
 */
async function getEvent(eventId, userId) {
  let connection;
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ? AND user_id = ?",
      [eventId, userId]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      throw new Error('イベントが見つかりません');
    }
    
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ イベント取得エラー (id=${eventId}, userId=${userId}):`, error);
    throw error;
  }
}

/**
 * 独自イベント（personal）を作成
 * @param {Object} eventData - イベントデータ
 * @param {string} eventData.user_id - ユーザーID（必須）
 * @param {string} eventData.title - イベント名（必須）
 * @param {string} eventData.date - 日付（必須、YYYY-MM-DD形式）
 * @param {string} eventData.description - 説明（オプション）
 * @param {boolean} eventData.is_enabled - 有効/無効（オプション、デフォルト: true）
 * @returns {Promise<Object>} 作成されたイベント
 */
async function createPersonalEvent(eventData) {
  let connection;
  try {
    const { user_id, title, date, description, is_enabled } = eventData;
    
    // バリデーション
    if (!user_id || user_id.trim() === '') {
      throw new Error('ユーザーIDは必須です');
    }
    if (!title || title.trim() === '') {
      throw new Error('イベント名は必須です');
    }
    if (!date) {
      throw new Error('日付は必須です');
    }
    
    connection = await getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
       VALUES (?, 'personal', ?, ?, ?, ?)`,
      [user_id, title, date, description || null, is_enabled !== undefined ? is_enabled : true]
    );
    
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [result.insertId]
    );
    
    await connection.end();
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error("❌ 独自イベント作成エラー:", error);
    throw error;
  }
}

/**
 * 独自イベント（personal）を更新
 * @param {number} eventId - イベントID
 * @param {Object} eventData - 更新データ
 * @param {string} userId - ユーザーID（権限確認用）
 * @returns {Promise<Object>} 更新されたイベント
 */
async function updatePersonalEvent(eventId, eventData, userId) {
  let connection;
  try {
    connection = await getConnection();
    
    // 存在確認と権限確認
    const [existing] = await connection.execute(
      "SELECT * FROM events WHERE id = ? AND user_id = ? AND event_type = 'personal'",
      [eventId, userId]
    );
    
    if (existing.length === 0) {
      throw new Error('イベントが見つからないか、編集権限がありません');
    }
    
    // バリデーション
    if (eventData.title !== undefined && (!eventData.title || eventData.title.trim() === '')) {
      throw new Error('イベント名は必須です');
    }
    
    // 更新
    const updates = [];
    const values = [];
    
    if (eventData.title !== undefined) {
      updates.push('title = ?');
      values.push(eventData.title);
    }
    if (eventData.date !== undefined) {
      updates.push('date = ?');
      values.push(eventData.date);
    }
    if (eventData.description !== undefined) {
      updates.push('description = ?');
      values.push(eventData.description);
    }
    if (eventData.is_enabled !== undefined) {
      updates.push('is_enabled = ?');
      values.push(eventData.is_enabled);
    }
    
    if (updates.length === 0) {
      throw new Error('更新する項目がありません');
    }
    
    values.push(eventId);
    await connection.execute(
      `UPDATE events SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );
    
    await connection.end();
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ 独自イベント更新エラー (id=${eventId}):`, error);
    throw error;
  }
}

/**
 * 独自イベント（personal）を削除
 * @param {number} eventId - イベントID
 * @param {string} userId - ユーザーID（権限確認用）
 * @returns {Promise<Object>} 削除結果
 */
async function deletePersonalEvent(eventId, userId) {
  let connection;
  try {
    connection = await getConnection();
    
    // 存在確認と権限確認
    const [existing] = await connection.execute(
      "SELECT * FROM events WHERE id = ? AND user_id = ? AND event_type = 'personal'",
      [eventId, userId]
    );
    
    if (existing.length === 0) {
      throw new Error('イベントが見つからないか、削除権限がありません');
    }
    
    await connection.execute(
      "DELETE FROM events WHERE id = ?",
      [eventId]
    );
    
    await connection.end();
    return { success: true, message: 'イベントを削除しました' };
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ 独自イベント削除エラー (id=${eventId}):`, error);
    throw error;
  }
}

module.exports = {
  getTodayEvents,
  getEventsByType,
  toggleEvent,
  getPersonalEvents,
  getEvent,
  createPersonalEvent,
  updatePersonalEvent,
  deletePersonalEvent
};
