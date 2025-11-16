/**
 * MySQLHelper統合テスト用スクリプト (CommonJS版)
 */

// 環境変数設定
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_PORT = '3307';
process.env.MYSQL_USER = 'root';
process.env.MYSQL_PASSWORD = 'posl_password';
process.env.MYSQL_DATABASE = 'posl_db';
process.env.NODE_ENV = 'local';
process.env.SETTINGS_TABLE = 'posl-settings-local';

async function runMySQLHelperTest() {
  try {
    console.log('🧪 MySQLHelper統合テストを開始...');
    
    // ビルドしたJSファイルをrequire
    const { MySQLHelper } = require('./dist/libs/mysql');
    
    // テストユーザーを作成
    const testUserId = 'test-user-helper';
    const testUserData = {
      userId: testUserId,
      name: 'Test User Helper',
      email: 'helper@example.com',
      createdAt: new Date().toISOString()
    };
    
    await MySQLHelper.putItem('users', testUserData);
    console.log('✅ ユーザー作成成功');
    
    // 設定データを挿入
    const weekThemeSettings = {
      userId: testUserId,
      settingType: 'week-theme',
      data: {
        monday: '月曜日は新しいスタート！',
        tuesday: '火曜日は学びの日',
        wednesday: '水曜日は振り返りの日',
        thursday: '木曜日はトレンドを追いかけよう',
        friday: '金曜日は週末に向けて',
        saturday: '土曜日は自由な発想で',
        sunday: '日曜日はリラックス'
      },
      updatedAt: new Date().toISOString()
    };
    
    await MySQLHelper.putItem(process.env.SETTINGS_TABLE, weekThemeSettings);
    console.log('✅ 週テーマ設定挿入成功');
    
    // 設定データを取得
    const retrievedSettings = await MySQLHelper.getItem(process.env.SETTINGS_TABLE, {
      userId: testUserId,
      settingType: 'week-theme'
    });
    
    console.log('✅ 設定データ取得成功:', retrievedSettings);
    
    // Toneの設定を挿入
    const toneSettings = {
      userId: testUserId,
      settingType: 'tone',
      data: {
        politeness: 70,
        casualness: 60,
        positivity: 80,
        expertise: 50,
        emotionLevel: 70,
        metaphorUsage: 30,
        emojiUsage: 50
      },
      updatedAt: new Date().toISOString()
    };
    
    await MySQLHelper.putItem(process.env.SETTINGS_TABLE, toneSettings);
    console.log('✅ トーン設定挿入成功');
    
    // 複数設定のクエリテスト
    const userSettings = await MySQLHelper.scan(
      process.env.SETTINGS_TABLE,
      'user_id = ?',
      [testUserId]
    );
    
    console.log(`✅ ユーザー設定一覧取得成功 (${userSettings.length}件):`, 
      userSettings.map(s => ({ settingType: s.settingType, keys: Object.keys(s.data || {}) })));
    
    // PromptEngineを使用したテスト
    console.log('\n🔧 PromptEngine統合テスト...');
    
    const { PromptEngine } = require('./dist/libs/prompt-engine');
    const promptEngine = new PromptEngine(testUserId);
    
    // プロンプト生成をテスト
    try {
      const result = await promptEngine.generatePrompt();
      console.log('✅ PromptEngine.generatePrompt() 実行成功');
      console.log('  - System prompt length:', result.system.length);
      console.log('  - User prompt length:', result.user.length);
      console.log('  - Context keys:', Object.keys(result.context));
      console.log('  - Week theme:', result.context.weekTheme);
      console.log('  - Tone description preview:', result.context.toneDescription.substring(0, 100) + '...');
    } catch (promptError) {
      console.error('❌ PromptEngine.generatePrompt() エラー:', promptError.message);
      console.error('Stack trace:', promptError.stack);
    }
    
    // クリーンアップ
    console.log('\n🧹 テストデータクリーンアップ...');
    
    await MySQLHelper.deleteItem(process.env.SETTINGS_TABLE, {
      userId: testUserId,
      settingType: 'week-theme'
    });
    
    await MySQLHelper.deleteItem(process.env.SETTINGS_TABLE, {
      userId: testUserId,
      settingType: 'tone'
    });
    
    await MySQLHelper.deleteItem('users', { userId: testUserId });
    
    console.log('✅ クリーンアップ完了');
    
    console.log('\n🎉 MySQLHelper統合テスト完了！');
    
  } catch (error) {
    console.error('❌ MySQLHelper統合テストエラー:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runMySQLHelperTest();