/**
 * イベントサービス
 * POSL V1.1 Phase 1: イベント投稿機能
 * 
 * 機能:
 * - 今日のイベント取得
 * - タイプ別イベント取得
 * - イベントON/OFF切り替え
 * 
 * 注意: Phase 1ではCreate/Update/Deleteは実装しません
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
 * @param {string} eventType - イベントタイプ（'fixed' または 'today'）
 * @returns {Promise<Array>} イベント配列
 * 
 * 処理: event_type別にsystemイベントを取得
 */
async function getEventsByType(eventType) {
  let connection;
  try {
    // バリデーション
    if (!['fixed', 'today'].includes(eventType)) {
      throw new Error("eventTypeは 'fixed' または 'today' である必要があります");
    }
    
    connection = await getConnection();
    
    const query = `
      SELECT * FROM events 
      WHERE event_type = ? AND user_id = 'system' AND is_enabled = TRUE
      ORDER BY date, id
    `;
    
    const [rows] = await connection.execute(query, [eventType]);
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

module.exports = {
  getTodayEvents,
  getEventsByType,
  toggleEvent
};
