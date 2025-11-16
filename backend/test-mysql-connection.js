/**
 * MySQLHelper接続テスト用スクリプト
 */

const mysql = require('mysql2/promise');

// 環境変数設定（テスト用）
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_PORT = '3307';
process.env.MYSQL_USER = 'root';
process.env.MYSQL_PASSWORD = 'posl_password';
process.env.MYSQL_DATABASE = 'posl_db';
process.env.NODE_ENV = 'local';

async function testMySQLConnection() {
  try {
    console.log('🔌 MySQL接続テストを開始...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    
    console.log('✅ MySQL接続成功');
    
    // テーブル一覧を取得
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 データベーステーブル:', tables);
    
    // 設定テーブルの構造を確認
    const [settingsStructure] = await connection.execute('DESCRIBE settings');
    console.log('🏗️  settings テーブル構造:', settingsStructure);
    
    // テストデータを挿入・取得
    console.log('\n📝 テストデータの挿入と取得...');
    
    // まず、テストユーザーを作成
    await connection.execute(
      'INSERT INTO users (user_id, user_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_data = VALUES(user_data)',
      ['test-user', JSON.stringify({ name: 'Test User', email: 'test@example.com' })]
    );
    
    console.log('✅ テストユーザー作成成功');
    
    // テストデータ挿入
    const testSetting = {
      user_id: 'test-user',
      setting_type: 'tone',
      setting_data: JSON.stringify({
        enabled: true,
        test: 'mysql-connection-test'
      })
    };
    
    await connection.execute(
      'INSERT INTO settings (user_id, setting_type, setting_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_data = VALUES(setting_data)',
      [testSetting.user_id, testSetting.setting_type, testSetting.setting_data]
    );
    
    console.log('✅ テストデータ挿入成功');
    
    // データを取得
    const [rows] = await connection.execute(
      'SELECT * FROM settings WHERE user_id = ? AND setting_type = ?',
      [testSetting.user_id, testSetting.setting_type]
    );
    
    console.log('✅ テストデータ取得成功:', rows[0]);
    
    // テストデータを削除
    await connection.execute(
      'DELETE FROM settings WHERE user_id = ? AND setting_type = ?',
      [testSetting.user_id, testSetting.setting_type]
    );
    
    console.log('✅ テストデータ削除成功');
    
    // テストユーザーも削除
    await connection.execute(
      'DELETE FROM users WHERE user_id = ?',
      ['test-user']
    );
    
    console.log('✅ テストユーザー削除成功');
    
    await connection.end();
    console.log('\n🎉 MySQL接続テスト完了！');
    
  } catch (error) {
    console.error('❌ MySQL接続テストエラー:', error);
    process.exit(1);
  }
}

testMySQLConnection();