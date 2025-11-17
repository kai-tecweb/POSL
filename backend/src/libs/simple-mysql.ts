import mysql from 'mysql2/promise';
import { ENV } from './env';

/**
 * シンプルなMySQL接続ヘルパー
 * DynamoDB抽象化を完全排除した、MySQL-First設計
 */
export class SimpleMySQLHelper {
  
  /**
   * MySQL接続を作成
   */
  private static async createConnection() {
    return await mysql.createConnection({
      host: ENV.MYSQL_HOST || 'localhost',
      port: parseInt(ENV.MYSQL_PORT || '3306'),
      user: ENV.MYSQL_USER || 'posl_user',
      password: ENV.MYSQL_PASSWORD || 'posl_password',
      database: ENV.MYSQL_DATABASE || 'posl_db',
      charset: 'utf8mb4'
    });
  }

  /**
   * 投稿ログを取得
   */
  static async getPostLogs(userId?: string, limit: number = 50) {
    const connection = await this.createConnection();
    
    try {
      let query = `
        SELECT 
          user_id, 
          post_id, 
          timestamp, 
          post_data, 
          created_at 
        FROM post_logs
      `;
      let params: any[] = [];
      
      if (userId && userId !== 'default-user') {
        query += ' WHERE user_id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      
      const [rows] = await connection.query(query, params);
      return this.convertPostLogRows(rows as any[]);
      
    } finally {
      await connection.end();
    }
  }

  /**
   * 設定データを取得
   */
  static async getSettings(userId: string, settingType: string) {
    const connection = await this.createConnection();
    
    try {
      const [rows] = await connection.query(
        'SELECT setting_data FROM settings WHERE user_id = ? AND setting_type = ?',
        [userId, settingType]
      );
      
      const results = rows as any[];
      if (results.length === 0) return null;
      
      const settingData = results[0].setting_data;
      return typeof settingData === 'string' ? JSON.parse(settingData) : settingData;
      
    } finally {
      await connection.end();
    }
  }

  /**
   * 設定データを保存
   */
  static async saveSettings(userId: string, settingType: string, data: any) {
    const connection = await this.createConnection();
    
    try {
      await connection.query(
        `INSERT INTO settings (user_id, setting_type, setting_data, created_at, updated_at) 
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
         setting_data = VALUES(setting_data), 
         updated_at = NOW()`,
        [userId, settingType, JSON.stringify(data)]
      );
      
      return true;
      
    } finally {
      await connection.end();
    }
  }

  /**
   * 投稿ログをシンプルに保存
   */
  static async savePostLog(userId: string, postData: any) {
    const connection = await this.createConnection();
    
    try {
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const timestamp = new Date().toISOString();
      
      await connection.query(
        'INSERT INTO post_logs (user_id, post_id, timestamp, post_data, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, postId, timestamp, JSON.stringify(postData)]
      );
      
      return postId;
      
    } finally {
      await connection.end();
    }
  }

  /**
   * post_logsの行データを変換
   */
  private static convertPostLogRows(rows: any[]) {
    return rows.map(row => {
      let postData: any = {};
      try {
        postData = typeof row.post_data === 'string' ? JSON.parse(row.post_data) : (row.post_data || {});
      } catch {
        postData = {};
      }

      return {
        userId: row.user_id,
        postId: row.post_id,
        timestamp: row.timestamp,
        content: postData.content || '内容なし',
        prompt: postData.prompt || '',
        success: postData.success !== false,
        xPostId: postData.xPostId,
        trendData: postData.trendData,
        error: postData.error,
        createdAt: row.created_at
      };
    });
  }

  /**
   * 基本的なクエリ実行
   */
  static async query(sql: string, params: any[] = []) {
    const connection = await this.createConnection();
    
    try {
      const [rows] = await connection.query(sql, params);
      return rows;
      
    } finally {
      await connection.end();
    }
  }
}