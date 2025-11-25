/**
 * 商品サービス
 * POSL V1.1 Phase 2: 商品投稿機能
 * 
 * 機能:
 * - 商品一覧取得
 * - 商品詳細取得
 * - 商品作成
 * - 商品更新
 * - 商品削除
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
 * 全商品一覧を取得
 * @param {string} userId - ユーザーID（省略時は全ユーザー）
 * @returns {Promise<Array>} 商品配列
 */
async function getAllProducts(userId = null) {
  let connection;
  try {
    connection = await getConnection();
    
    let query = `SELECT * FROM products WHERE 1=1`;
    const params = [];
    
    // userIdが指定されている場合はフィルタ
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    query += ` ORDER BY priority DESC, created_at DESC`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    return rows;
  } catch (error) {
    if (connection) await connection.end();
    console.error("❌ 商品一覧取得エラー:", error);
    throw error;
  }
}

/**
 * 特定商品を取得
 * @param {number} productId - 商品ID
 * @returns {Promise<Object>} 商品オブジェクト
 */
async function getProduct(productId) {
  let connection;
  try {
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      throw new Error(`商品が見つかりません: id=${productId}`);
    }
    
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ 商品取得エラー (id=${productId}):`, error);
    throw error;
  }
}

/**
 * 商品を作成
 * @param {Object} productData - 商品データ
 * @returns {Promise<Object>} 作成された商品
 */
async function createProduct(productData) {
  let connection;
  try {
    const { user_id, name, short_description, description, url, is_active = true, priority = 0 } = productData;
    
    // 必須項目チェック
    if (!user_id || !name) {
      throw new Error("必須項目が不足しています: user_id, name");
    }
    
    connection = await getConnection();
    
    const query = `
      INSERT INTO products (user_id, name, short_description, description, url, is_active, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      user_id,
      name,
      short_description || null,
      description || null,
      url || null,
      is_active,
      priority
    ]);
    
    // 作成された商品を取得
    const [rows] = await connection.execute(
      "SELECT * FROM products WHERE id = ?",
      [result.insertId]
    );
    
    await connection.end();
    
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error("❌ 商品作成エラー:", error);
    throw error;
  }
}

/**
 * 商品を更新
 * @param {number} productId - 商品ID
 * @param {Object} productData - 更新データ
 * @returns {Promise<Object>} 更新された商品
 */
async function updateProduct(productId, productData) {
  let connection;
  try {
    connection = await getConnection();
    
    // 既存商品の存在確認
    const [existing] = await connection.execute(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    
    if (existing.length === 0) {
      throw new Error(`商品が見つかりません: id=${productId}`);
    }
    
    // 更新可能なフィールド
    const updatableFields = ['name', 'short_description', 'description', 'url', 'is_active', 'priority'];
    const updates = [];
    const values = [];
    
    for (const field of updatableFields) {
      if (productData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(productData[field]);
      }
    }
    
    if (updates.length === 0) {
      throw new Error("更新する項目がありません");
    }
    
    values.push(productId);
    
    const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    await connection.execute(query, values);
    
    // 更新された商品を取得
    const [rows] = await connection.execute(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    
    await connection.end();
    
    return rows[0];
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ 商品更新エラー (id=${productId}):`, error);
    throw error;
  }
}

/**
 * 商品を削除
 * @param {number} productId - 商品ID
 * @returns {Promise<boolean>} 削除成功フラグ
 */
async function deleteProduct(productId) {
  let connection;
  try {
    connection = await getConnection();
    
    // 既存商品の存在確認
    const [existing] = await connection.execute(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );
    
    if (existing.length === 0) {
      throw new Error(`商品が見つかりません: id=${productId}`);
    }
    
    // 商品を削除
    await connection.execute("DELETE FROM products WHERE id = ?", [productId]);
    
    await connection.end();
    
    return true;
  } catch (error) {
    if (connection) await connection.end();
    console.error(`❌ 商品削除エラー (id=${productId}):`, error);
    throw error;
  }
}

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};

