import mysql from 'mysql2/promise';
import { ENV } from './env';

/**
 * MySQL 接続設定
 */
const createMySQLPool = () => {
  return mysql.createPool({
    host: ENV.MYSQL_HOST || 'localhost',
    port: parseInt(ENV.MYSQL_PORT || '3306'),
    user: ENV.MYSQL_USER || 'root',
    password: ENV.MYSQL_PASSWORD || 'password',
    database: ENV.MYSQL_DATABASE || 'posl_db',
    charset: 'utf8mb4',
    connectionLimit: 10,
    // SSL設定（本番環境用）
    ...(ENV.NODE_ENV === 'production' ? {
      ssl: {
        rejectUnauthorized: true
      }
    } : {})
  });
};

// MySQL接続プール
const mysqlPool = createMySQLPool();

/**
 * DynamoDBHelper互換のMySQL操作ヘルパー
 * 既存のDynamoDBHelperのAPIと完全互換性を保つ
 */
export class MySQLHelper {
  
  /**
   * テーブル名をMySQLの命名規則に変換
   */
  private static normalizeTableName(tableName: string): string {
    // DynamoDBのテーブル名をMySQLのテーブル名に変換
    const tableMap: Record<string, string> = {
      'posl-dev-users': 'users',
      'posl-dev-settings': 'settings', 
      'posl-dev-postLogs': 'post_logs',
      'posl-dev-diaries': 'diaries',
      'posl-dev-personaProfiles': 'persona_profiles',
      // ローカル環境用
      'posl-users-local': 'users',
      'posl-settings-local': 'settings',
      'posl-post-logs-local': 'post_logs',
      'posl-diaries-local': 'diaries',
      'posl-persona-profiles-local': 'persona_profiles',
      // 短縮形
      'Users': 'users',
      'Settings': 'settings',
      'PostLogs': 'post_logs', 
      'Diaries': 'diaries',
      'PersonaProfiles': 'persona_profiles'
    };
    
    return tableMap[tableName] || tableName;
  }

  /**
   * DynamoDB形式のキーをMySQL形式のWHERE句に変換
   */
  private static buildWhereClause(tableName: string, key: Record<string, any>): { where: string; values: any[] } {
    const values: any[] = [];
    
    switch (tableName) {
      case 'users':
      case 'persona_profiles':
        values.push(key['userId']);
        return { where: 'WHERE user_id = ?', values };
        
      case 'settings':
        values.push(key['userId'], key['settingType']);
        return { where: 'WHERE user_id = ? AND setting_type = ?', values };
        
      case 'post_logs':
        values.push(key['userId'], key['postId']);
        return { where: 'WHERE user_id = ? AND post_id = ?', values };
        
      case 'diaries':
        values.push(key['userId'], key['diaryId']);
        return { where: 'WHERE user_id = ? AND diary_id = ?', values };
        
      default:
        throw new Error(`Unsupported table for key conversion: ${tableName}`);
    }
  }

  /**
   * アイテムを取得 (DynamoDB getItem互換)
   */
  static async getItem<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    try {
      const table = this.normalizeTableName(tableName);
      const { where, values } = this.buildWhereClause(table, key);
      
      const query = `SELECT * FROM ${table} ${where}`;
      const [rows] = await mysqlPool.execute(query, values);
      const result = rows as any[];
      
      if (result.length === 0) {
        return null;
      }
      
      // MySQL結果をDynamoDB形式に変換
      return this.convertMySQLToDynamoDB(table, result[0]) as T;
    } catch (error) {
      console.error('MySQL GetItem Error:', error);
      throw new Error(`Failed to get item from ${tableName}`);
    }
  }

  /**
   * アイテムを作成/更新 (DynamoDB putItem互換)
   */
  static async putItem<T>(tableName: string, item: T): Promise<void> {
    try {
      const table = this.normalizeTableName(tableName);
      const mysqlItem = this.convertDynamoDBToMySQL(table, item);
      
      const columns = Object.keys(mysqlItem);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(mysqlItem);
      
      // ON DUPLICATE KEY UPDATE による upsert
      const updateClause = columns
        .filter(col => !['created_at'].includes(col))
        .map(col => `${col} = VALUES(${col})`)
        .join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')}) 
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClause}
      `;
      
      await mysqlPool.execute(query, values);
    } catch (error) {
      console.error('MySQL PutItem Error:', error);
      throw new Error(`Failed to put item to ${tableName}`);
    }
  }

  /**
   * アイテムを更新 (DynamoDB updateItem互換)
   * 簡単な実装: 既存データを取得→更新→putItem
   */
  static async updateItem(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<any> {
    try {
      // 既存アイテムを取得
      const existingItem = await this.getItem(tableName, key);
      if (!existingItem) {
        throw new Error(`Item not found for update in ${tableName}`);
      }
      
      // 更新値を適用（簡単な実装）
      const updatedItem = { ...existingItem } as any;
      
      // DynamoDB UpdateExpressionから更新値を抽出
      Object.entries(expressionAttributeValues).forEach(([placeholder, value]) => {
        const fieldName = placeholder.replace(':', '');
        updatedItem[fieldName] = value;
      });
      
      // 更新されたアイテムを保存
      await this.putItem(tableName, updatedItem);
      
      // 更新されたアイテムを返す
      return updatedItem;
    } catch (error) {
      console.error('MySQL UpdateItem Error:', error);
      throw new Error(`Failed to update item in ${tableName}`);
    }
  }

  /**
   * アイテムを削除 (DynamoDB deleteItem互換)
   */
  static async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      const table = this.normalizeTableName(tableName);
      const { where, values } = this.buildWhereClause(table, key);
      
      const query = `DELETE FROM ${table} ${where}`;
      await mysqlPool.execute(query, values);
    } catch (error) {
      console.error('MySQL DeleteItem Error:', error);
      throw new Error(`Failed to delete item from ${tableName}`);
    }
  }

  /**
   * クエリ実行 (DynamoDB query互換)
   */
  static async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    indexName?: string,
    expressionAttributeNames?: Record<string, string>,
    limit?: number,
    scanIndexForward?: boolean
  ): Promise<T[]> {
    try {
      const table = this.normalizeTableName(tableName);
      
      // DynamoDB KeyConditionExpressionをMySQLのWHEREに変換
      const { whereClause, whereValues } = this.parseKeyCondition(
        table, keyConditionExpression, expressionAttributeValues, expressionAttributeNames
      );
      
      // ORDER BY句の決定
      let orderBy = '';
      if (indexName === 'timestamp-index') {
        orderBy = `ORDER BY timestamp ${scanIndexForward === false ? 'DESC' : 'ASC'}`;
      } else if (indexName === 'created-at-index') {
        orderBy = `ORDER BY created_at ${scanIndexForward === false ? 'DESC' : 'ASC'}`;
      }
      
      // LIMIT句
      const limitClause = limit ? `LIMIT ${limit}` : '';
      
      const query = `SELECT * FROM ${table} WHERE ${whereClause} ${orderBy} ${limitClause}`;
      const [rows] = await mysqlPool.execute(query, whereValues);
      const results = rows as any[];
      
      // MySQL結果をDynamoDB形式に変換
      return results.map(row => this.convertMySQLToDynamoDB(table, row)) as T[];
    } catch (error) {
      console.error('MySQL Query Error:', error);
      throw new Error(`Failed to query ${tableName}`);
    }
  }

  /**
   * スキャン実行 (DynamoDB scan互換)
   */
  static async scan<T>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    limit?: number
  ): Promise<T[]> {
    try {
      const table = this.normalizeTableName(tableName);
      
      let whereClause = '';
      let whereValues: any[] = [];
      
      // より簡単なフィルタ処理：直接MySQLクエリを使用
      if (filterExpression) {
        if (expressionAttributeValues && Object.keys(expressionAttributeValues).length > 0) {
          // DynamoDB形式の場合の変換
          if (filterExpression.includes(':')) {
            const { whereClause: filter, whereValues: values } = this.parseFilterExpression(
              table, filterExpression, expressionAttributeValues, expressionAttributeNames
            );
            whereClause = `WHERE ${filter}`;
            whereValues = values;
          } else {
            // MySQL形式の場合
            whereClause = `WHERE ${filterExpression}`;
            whereValues = Object.values(expressionAttributeValues);
          }
        } else {
          // フィルタのみの場合
          whereClause = `WHERE ${filterExpression}`;
        }
      }
      
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const query = `SELECT * FROM ${table} ${whereClause} ${limitClause}`;
      
      const [rows] = await mysqlPool.execute(query, whereValues);
      const results = rows as any[];
      
      return results.map(row => this.convertMySQLToDynamoDB(table, row)) as T[];
    } catch (error) {
      console.error('MySQL Scan Error:', error);
      throw new Error(`Failed to scan ${tableName}`);
    }
  }

  /**
   * バッチでアイテムを取得 (DynamoDB batchGetItems互換)
   */
  static async batchGetItems<T>(
    tableName: string,
    keys: Record<string, any>[]
  ): Promise<T[]> {
    try {
      const results: T[] = [];
      
      // バッチサイズ制限（MySQL用に調整）
      const batchSize = 25;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(key => this.getItem<T>(tableName, key))
        );
        
        batchResults.forEach(result => {
          if (result !== null) results.push(result);
        });
      }
      
      return results;
    } catch (error) {
      console.error('MySQL BatchGet Error:', error);
      throw new Error(`Failed to batch get items from ${tableName}`);
    }
  }

  /**
   * バッチでアイテムを書き込み (DynamoDB batchWriteItems互換)
   */
  static async batchWriteItems<T>(
    tableName: string,
    items: T[],
    operation: 'put' | 'delete' = 'put'
  ): Promise<void> {
    try {
      const batchSize = 25;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        if (operation === 'put') {
          await Promise.all(batch.map(item => this.putItem(tableName, item)));
        } else {
          await Promise.all(batch.map(item => this.deleteItem(tableName, item as any)));
        }
      }
    } catch (error) {
      console.error('MySQL BatchWrite Error:', error);
      throw new Error(`Failed to batch write items to ${tableName}`);
    }
  }

  // ====================================================================
  // 内部ヘルパーメソッド（データ変換・クエリ変換）
  // ====================================================================

  /**
   * DynamoDB形式のアイテムをMySQL形式に変換
   */
  private static convertDynamoDBToMySQL(tableName: string, item: any): any {
    switch (tableName) {
      case 'users':
        return {
          user_id: item.userId,
          user_data: JSON.stringify(item)
        };
        
      case 'settings':
        const { userId, settingType, ...settingData } = item;
        return {
          user_id: userId,
          setting_type: settingType,
          setting_data: JSON.stringify(settingData)
        };
        
      case 'post_logs':
        const { userId: postUserId, postId, ...postData } = item;
        return {
          user_id: postUserId,
          post_id: postId,
          timestamp: item.timestamp,
          post_data: JSON.stringify(postData)
        };
        
        case 'diaries':
        const { userId: diaryUserId, diaryId, createdAt, content } = item;
        return {
          user_id: diaryUserId,
          diary_id: diaryId,
          created_at: createdAt,
          diary_data: JSON.stringify(item),
          content: content || item.content || ''
        };      case 'persona_profiles':
        const { userId: personaUserId, ...personaData } = item;
        return {
          user_id: personaUserId,
          persona_data: JSON.stringify(personaData),
          analysis_summary: item.analysisSummary || ''
        };
        
      default:
        throw new Error(`Unsupported table for conversion: ${tableName}`);
    }
  }

  /**
   * MySQL形式の結果をDynamoDB形式に変換
   */
  private static convertMySQLToDynamoDB(tableName: string, row: any): any {
    try {
      switch (tableName) {
        case 'users':
          // user_dataが既にオブジェクトの場合とJSON文字列の場合に対応
          const userData = typeof row.user_data === 'string' 
            ? JSON.parse(row.user_data) 
            : row.user_data;
          return {
            userId: row.user_id,
            ...userData
          };
          
        case 'settings':
          const settingData = typeof row.setting_data === 'string'
            ? JSON.parse(row.setting_data)
            : row.setting_data;
          return {
            userId: row.user_id,
            settingType: row.setting_type,
            ...settingData
          };
          
        case 'post_logs':
          const postData = typeof row.post_data === 'string'
            ? JSON.parse(row.post_data)
            : row.post_data;
          return {
            userId: row.user_id,
            postId: row.post_id,
            timestamp: row.timestamp,
            ...postData
          };
          
        case 'diaries':
          const diaryData = typeof row.diary_data === 'string'
            ? JSON.parse(row.diary_data)
            : row.diary_data;
          return diaryData;
          
        case 'persona_profiles':
          const personaData = typeof row.persona_data === 'string'
            ? JSON.parse(row.persona_data)
            : row.persona_data;
          return {
            userId: row.user_id,
            ...personaData
          };
          
        default:
          throw new Error(`Unsupported table for conversion: ${tableName}`);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw data:', row);
      throw new Error(`Failed to parse JSON data from ${tableName}`);
    }
  }

  /**
   * DynamoDB KeyConditionExpressionをMySQL WHERE句に変換
   */
  private static parseKeyCondition(
    tableName: string,
    keyCondition: string,
    values: Record<string, any>,
    names?: Record<string, string>
  ): { whereClause: string; whereValues: any[] } {
    // 基本的なキー条件をMySQLに変換
    // 例: "userId = :userId" -> "user_id = ?"
    // 例: "userId = :userId AND createdAt BETWEEN :start AND :end"
    
    let whereClause = keyCondition;
    const whereValues: any[] = [];
    
    // 属性名を変換
    if (names) {
      Object.entries(names).forEach(([placeholder, actualName]) => {
        whereClause = whereClause.replace(new RegExp(placeholder, 'g'), actualName);
      });
    }
    
    // DynamoDB属性名をMySQL列名に変換
    whereClause = whereClause
      .replace(/\buserId\b/g, 'user_id')
      .replace(/\bsettingType\b/g, 'setting_type')
      .replace(/\bpostId\b/g, 'post_id')
      .replace(/\bdiaryId\b/g, 'diary_id')
      .replace(/\bcreatedAt\b/g, 'created_at')
      .replace(/\btimestamp\b/g, 'timestamp');
    
    // 値のプレースホルダーを変換
    Object.entries(values).forEach(([placeholder, value]) => {
      whereClause = whereClause.replace(new RegExp(placeholder, 'g'), '?');
      whereValues.push(value);
    });
    
    return { whereClause, whereValues };
  }

  /**
   * DynamoDB FilterExpressionをMySQL WHERE句に変換
   */
  private static parseFilterExpression(
    _tableName: string, // 使用されないがシグネチャ統一のため保持
    filterExpression: string,
    values: Record<string, any>,
    names?: Record<string, string>
  ): { whereClause: string; whereValues: any[] } {
    // parseKeyConditionと同様の処理
    return this.parseKeyCondition(_tableName, filterExpression, values, names);
  }

  /**
   * DynamoDB UpdateExpressionをMySQL SET句に変換
   */
  private static parseUpdateExpression(
    tableName: string,
    updateExpression: string,
    values: Record<string, any>,
    names?: Record<string, string>
  ): { setClause: string; setValues: any[] } {
    // 例: "SET #name = :name, #age = :age" -> "SET name = ?, age = ?"
    
    let setClause = updateExpression.replace(/^SET\s+/i, '');
    const setValues: any[] = [];
    
    // 属性名を変換
    if (names) {
      Object.entries(names).forEach(([placeholder, actualName]) => {
        setClause = setClause.replace(new RegExp(placeholder, 'g'), actualName);
      });
    }
    
    // JSON列の場合はJSON_SET関数を使用
    if (tableName === 'settings') {
      // setting_dataのJSON内フィールドを更新
      const updates: string[] = [];
      Object.entries(values).forEach(([placeholder, value]) => {
        const fieldName = placeholder.replace(':', '');
        updates.push(`JSON_SET(setting_data, '$.${fieldName}', ?)`);
        setValues.push(value);
      });
      
      if (updates.length > 0) {
        return {
          setClause: `setting_data = ${updates.join(', setting_data = ')}`,
          setValues
        };
      }
    }
    
    // その他のテーブルの場合は通常のSET
    Object.entries(values).forEach(([placeholder, value]) => {
      setClause = setClause.replace(new RegExp(placeholder, 'g'), '?');
      setValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
    });
    
    return { setClause, setValues };
  }

  /**
   * 接続プールを閉じる（アプリケーション終了時）
   */
  static async closePool(): Promise<void> {
    await mysqlPool.end();
  }
}

// 環境変数の型定義を拡張（env.tsで管理）
declare module './env' {
  interface ENV {
    MYSQL_HOST?: string;
    MYSQL_PORT?: string; 
    MYSQL_USER?: string;
    MYSQL_PASSWORD?: string;
    MYSQL_DATABASE?: string;
  }
}