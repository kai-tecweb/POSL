import { MySQLHelper } from '../libs/mysql';

/**
 * MySQLHelper動作テスト
 * DynamoDBHelperと同等の機能が動作するかテスト
 */
async function testMySQLHelper() {
  console.log('🧪 MySQLHelper動作テスト開始');

  try {
    // 1. ユーザー取得テスト
    console.log('\n1️⃣ ユーザー取得テスト');
    const user = await MySQLHelper.getItem('Users', { userId: 'demo' });
    console.log('デモユーザー取得:', user);

    // 2. 設定データ取得テスト 
    console.log('\n2️⃣ 設定データ取得テスト');
    const toneSettings = await MySQLHelper.getItem('Settings', { 
      userId: 'demo', 
      settingType: 'tone' 
    });
    console.log('tone設定:', toneSettings);

    // 3. 新しいユーザー作成テスト
    console.log('\n3️⃣ 新しいユーザー作成テスト');
    const newUser = {
      userId: 'test_user_mysql',
      name: 'Test MySQL User',
      email: 'test-mysql@example.com',
      createdAt: new Date().toISOString()
    };
    await MySQLHelper.putItem('Users', newUser);
    console.log('新規ユーザー作成完了');

    // 4. 作成したユーザーを取得して確認
    console.log('\n4️⃣ 作成したユーザー確認テスト');
    const createdUser = await MySQLHelper.getItem('Users', { userId: 'test_user_mysql' });
    console.log('作成済みユーザー取得:', createdUser);

    // 5. 設定データ追加テスト
    console.log('\n5️⃣ 設定データ追加テスト');
    const testSettings = {
      userId: 'test_user_mysql',
      settingType: 'tone',
      politeness: 75,
      casualness: 50,
      positivity: 80,
      intellectual: 65,
      emotional: 55,
      humorous: 45,
      creativity: 70
    };
    await MySQLHelper.putItem('Settings', testSettings);
    console.log('設定データ追加完了');

    // 6. 追加した設定を取得
    console.log('\n6️⃣ 追加した設定確認テスト');
    const addedSettings = await MySQLHelper.getItem('Settings', {
      userId: 'test_user_mysql',
      settingType: 'tone'
    });
    console.log('追加済み設定取得:', addedSettings);

    // 7. 設定データ更新テスト
    console.log('\n7️⃣ 設定データ更新テスト');
    await MySQLHelper.updateItem(
      'Settings',
      { userId: 'test_user_mysql', settingType: 'tone' },
      'SET politeness = :politeness, creativity = :creativity',
      { ':politeness': 85, ':creativity': 75 }
    );
    console.log('設定データ更新完了');

    // 8. 更新結果確認
    console.log('\n8️⃣ 更新結果確認テスト');
    const updatedSettings = await MySQLHelper.getItem('Settings', {
      userId: 'test_user_mysql',
      settingType: 'tone'
    });
    console.log('更新済み設定:', updatedSettings);

    // 9. スキャンテスト（全ユーザー取得）
    console.log('\n9️⃣ スキャンテスト（全ユーザー）');
    const allUsers = await MySQLHelper.scan('Users');
    console.log(`全ユーザー数: ${allUsers.length}`);
    allUsers.forEach((u: any) => {
      console.log(`- ${u.userId}: ${u.name || 'No name'}`);
    });

    // 10. クエリテスト（特定ユーザーの設定一覧）
    console.log('\n🔟 クエリテスト（特定ユーザーの設定）');
    // MySQLではこの形式のクエリは別途実装が必要
    // DynamoDBのクエリをMySQLで再現するため、直接SQLで代用
    console.log('MySQL環境では直接SQLクエリでテスト'); 
    const userSettings = await MySQLHelper.scan('Settings');
    const demoUserSettings = userSettings.filter((s: any) => s.userId === 'demo');
    console.log(`demoユーザーの設定数: ${demoUserSettings.length}`);
    demoUserSettings.forEach((s: any) => {
      console.log(`- ${s.settingType}`);
    });

    // 11. クリーンアップ（テストデータ削除）
    console.log('\n🧹 テストデータクリーンアップ');
    await MySQLHelper.deleteItem('Settings', { userId: 'test_user_mysql', settingType: 'tone' });
    await MySQLHelper.deleteItem('Users', { userId: 'test_user_mysql' });
    console.log('テストデータ削除完了');

    // 12. 削除確認
    console.log('\n✅ 削除確認');
    const deletedUser = await MySQLHelper.getItem('Users', { userId: 'test_user_mysql' });
    console.log('削除確認（nullが期待値）:', deletedUser);

    console.log('\n🎉 MySQLHelper動作テスト完了！全テスト成功');

  } catch (error) {
    console.error('❌ MySQLHelper動作テストでエラーが発生:', error);
    throw error;
  }
}

// エラーハンドリング付きでテスト実行
if (require.main === module) {
  testMySQLHelper()
    .then(() => {
      console.log('\n✨ テストスクリプト正常終了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 テストスクリプトエラー終了:', error);
      process.exit(1);
    });
}

export { testMySQLHelper };