/**
 * イベントサービス
 * POSL V1.1 Phase 1: イベント投稿機能
 * 
 * 機能:
 * - 今日のイベント取得
 * - タイプ別イベント取得
 * - イベントCRUD操作
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
 * @param {string} userId - ユーザーID（省略時は全ユーザー）
 * @returns {Promise<Array>} イベント配列
 */
async function getTodayEvents(date = null, userId = null) {
  let connection;
  try {
    connection = await getConnection();
    
    // 日付が指定されていない場合は今日の日付を使用
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT * FROM events 
      WHERE date = ? AND is_enabled = TRUE
    `;
    const params = [targetDate];
    
    // userIdが指定されている場合はフィルタ
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY event_type, id`;
    
    const [rows] = await connection.execute(query, params);
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
 * @param {string} date - 日付（YYYY-MM-DD形式、省略時は全期間）
 * @param {string} userId - ユーザーID（省略時は全ユーザー）
 * @returns {Promise<Array>} イベント配列
 */
async function getEventsByType(eventType, date = null, userId = null) {
  let connection;
  try {
    connection = await getConnection();
    
    let query = `SELECT * FROM events WHERE event_type = ? AND is_enabled = TRUE`;
    const params = [eventType];
    
    // 日付が指定されている場合はフィルタ
    if (date) {
      query += ` AND date = ?`;
      params.push(date);
    }
    
    // userIdが指定されている場合はフィルタ
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY date, id`;
    
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
 * 全イベント一覧を取得
 * @param {string} userId - ユーザーID（省略時は全ユーザー）
 * @returns {Promise<Array>} イベント配列
 */
async function getAllEvents(userId = null) {
  let connection;
  try {
    connection = await getConnection();
    
    let query = `SELECT * FROM events WHERE 1=1`;
    const params = [];
    
    // userIdが指定されている場合はフィルタ
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY date, event_type, id`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    return rows;
  } catch (error) {
    if (connection) await connection.end();
    console.error("❌ イベント一覧取得エラー:", error);
    throw error;
  }
}

/**
 * イベントを作成
 * @param {Object} eventData - イベントデータ
 * @returns {Promise<Object>} 作成されたイベント
 */
async function createEvent(eventData) {
  let connection;
  try {
    const { user_id, event_type, title, date, description, is_enabled = true } = eventData;
    
    // 必須項目チェック
    if (!user_id || !event_type || !title || !date) {
      throw new Error("必須項目が不足しています: user_id, event_type, title, date");
    }
    
    // event_typeのバリデーション
    if (!['fixed', 'today', 'personal'].includes(event_type)) {
      throw new Error("event_typeは 'fixed', 'today', 'personal' のいずれかである必要があります");
    }
    
    connection = await getConnection();
    
    const query = `
      INSERT INTO events (user_id, event_type, title, date, description, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      user_id,
      event_type,
      title,
      date,
      description || null,
      is_enabled
    ]);
    
    // 作成されたイベントを取得
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [result.insertId]
    );
    
    await connection.end();
    
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error("❌ イベント作成エラー:", error);
    throw error;
  }
}

/**
 * イベントを更新
 * @param {number} id - イベントID
 * @param {Object} eventData - 更新データ
 * @returns {Promise<Object>} 更新されたイベント
 */
async function updateEvent(id, eventData) {
  let connection;
  try {
    connection = await getConnection();
    
    // 既存イベントの存在確認
    const [existing] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );
    
    if (existing.length === 0) {
      throw new Error(`イベントが見つかりません: id=${id}`);
    }
    
    // 更新可能なフィールド
    const updatableFields = ['title', 'date', 'description', 'is_enabled'];
    const updates = [];
    const values = [];
    
    for (const field of updatableFields) {
      if (eventData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(eventData[field]);
      }
    }
    
    if (updates.length === 0) {
      throw new Error("更新する項目がありません");
    }
    
    values.push(id);
    
    const query = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
    await connection.execute(query, values);
    
    // 更新されたイベントを取得
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );
    
    await connection.end();
    
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ イベント更新エラー (id=${id}):`, error);
    throw error;
  }
}

/**
 * イベントのON/OFFを切り替え
 * @param {number} id - イベントID
 * @returns {Promise<Object>} 更新されたイベント
 */
async function toggleEvent(id) {
  let connection;
  try {
    connection = await getConnection();
    
    // 現在の状態を取得
    const [rows] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );
    
    if (rows.length === 0) {
      throw new Error(`イベントが見つかりません: id=${id}`);
    }
    
    const currentEnabled = rows[0].is_enabled;
    const newEnabled = !currentEnabled;
    
    // 状態を切り替え
    await connection.execute(
      "UPDATE events SET is_enabled = ? WHERE id = ?",
      [newEnabled, id]
    );
    
    // 更新されたイベントを取得
    const [updated] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );
    
    await connection.end();
    
    return updated[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ イベントON/OFF切り替えエラー (id=${id}):`, error);
    throw error;
  }
}

/**
 * イベントを削除
 * @param {number} id - イベントID
 * @returns {Promise<boolean>} 削除成功フラグ
 */
async function deleteEvent(id) {
  let connection;
  try {
    connection = await getConnection();
    
    // 既存イベントの存在確認
    const [existing] = await connection.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );
    
    if (existing.length === 0) {
      throw new Error(`イベントが見つかりません: id=${id}`);
    }
    
    // システムイベント（user_id='system'）は削除不可
    if (existing[0].user_id === 'system') {
      throw new Error("システムイベントは削除できません");
    }
    
    // イベントを削除
    await connection.execute("DELETE FROM events WHERE id = ?", [id]);
    
    await connection.end();
    
    return true;
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ イベント削除エラー (id=${id}):`, error);
    throw error;
  }
}

module.exports = {
  getTodayEvents,
  getEventsByType,
  getAllEvents,
  createEvent,
  updateEvent,
  toggleEvent,
  deleteEvent
};

