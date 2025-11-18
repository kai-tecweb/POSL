/**/**

 * 📊 API統合テスト・E2Eテストスイート * 📊 API統合テスト・E2Eテストスイート

 * Phase 11 Week 2: CI/CD本格運用のための包括的テスト * Phase 11 Week 2: CI/CD本格運用のための包括的テスト

 */ */



import request from 'supertest';import request from 'supertest';

import { MySQLHelper } from '../libs/mysql';

// テスト環境設定

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';// テスト環境設定

const TEST_TIMEOUT = 30000; // 30秒タイムアウトconst API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

const TEST_TIMEOUT = 30000; // 30秒タイムアウト

describe('🚀 POSL API統合テスト', () => {

  beforeAll(async () => {/**

    console.log('🔧 統合テスト環境セットアップ開始'); * 📊 API統合テスト・E2Eテストスイート

  }, TEST_TIMEOUT); * Phase 11 Week 2: CI/CD本格運用のための包括的テスト

 */

  afterAll(async () => {

    console.log('🧹 統合テスト環境クリーンアップ');import request from 'supertest';

  });

// テスト環境設定

  describe('🔧 システムヘルスチェック', () => {const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

    test('GET /test/health - システムヘルスチェック', async () => {const TEST_TIMEOUT = 30000; // 30秒タイムアウト

      const response = await request(API_BASE_URL)

        .get('/test/health')describe('🚀 POSL API統合テスト', () => {

        .expect(200);  beforeAll(async () => {

    // テスト前のセットアップ

      expect(response.body).toHaveProperty('status');    console.log('🔧 統合テスト環境セットアップ開始');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);  }, TEST_TIMEOUT);

    });

  afterAll(async () => {

    test('GET /test/mysql - MySQL接続確認', async () => {    // テスト後のクリーンアップ

      const response = await request(API_BASE_URL)    console.log('🧹 統合テスト環境クリーンアップ');

        .get('/test/mysql')  });

        .expect(200);

  describe('🔧 システムヘルスチェック', () => {

      expect(response.body).toHaveProperty('success');    test('GET /test/health - システムヘルスチェック', async () => {

      expect(response.body.success).toBe(true);      const response = await request(API_BASE_URL)

    }, TEST_TIMEOUT);        .get('/test/health')

  });        .expect(200);



  describe('📝 POST生成・管理API', () => {      expect(response.body).toHaveProperty('status');

    test('POST /post/generate - プロンプト生成', async () => {      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);

      const response = await request(API_BASE_URL)      expect(response.body).toHaveProperty('checks');

        .post('/post/generate')    });

        .send({

          tone: 'casual',    test('GET /test/mysql - MySQL接続確認', async () => {

          includeImage: false      const response = await request(API_BASE_URL)

        })        .get('/test/mysql')

        .expect(200);        .expect(200);



      expect(response.body).toHaveProperty('success', true);      expect(response.body).toHaveProperty('success');

      expect(response.body).toHaveProperty('prompt');      expect(response.body.success).toBe(true);

      expect(response.body.prompt).toHaveProperty('content');    }, TEST_TIMEOUT);

      expect(response.body.prompt.content).toMatch(/\S+/);  });

    }, TEST_TIMEOUT);

  describe('📝 POST生成・管理API', () => {

    test('POST /post/tweet - X投稿実行（ドラフト）', async () => {    test('POST /post/generate - プロンプト生成', async () => {

      const testContent = '統合テスト投稿 - ' + new Date().toISOString();      const response = await request(API_BASE_URL)

              .post('/post/generate')

      const response = await request(API_BASE_URL)        .send({

        .post('/post/tweet')          tone: 'casual',

        .send({          includeImage: false

          content: testContent,        })

          isDraft: true        .expect(200);

        })

        .expect(200);      expect(response.body).toHaveProperty('success', true);

      expect(response.body).toHaveProperty('prompt');

      expect(response.body).toHaveProperty('success', true);      expect(response.body.prompt).toHaveProperty('content');

      expect(response.body).toHaveProperty('post_id');      expect(response.body.prompt.content).toMatch(/\S+/); // 空でない文字列

    }, TEST_TIMEOUT);    }, TEST_TIMEOUT);



    test('GET /post/history - 投稿履歴取得', async () => {    test('POST /post/tweet - X投稿実行（ドラフト）', async () => {

      const response = await request(API_BASE_URL)      const testContent = '統合テスト投稿 - ' + new Date().toISOString();

        .get('/post/history')      

        .query({ limit: 5 })      const response = await request(API_BASE_URL)

        .expect(200);        .post('/post/tweet')

        .send({

      expect(response.body).toHaveProperty('success', true);          content: testContent,

      expect(response.body).toHaveProperty('posts');          isDraft: true // ドラフトモードで実際の投稿を避ける

      expect(Array.isArray(response.body.posts)).toBe(true);        })

    });        .expect(200);

  });

      expect(response.body).toHaveProperty('success', true);

  describe('📊 Trends API', () => {      expect(response.body).toHaveProperty('post_id');

    test('GET /trends/google - Google Trends取得', async () => {    }, TEST_TIMEOUT);

      const response = await request(API_BASE_URL)

        .get('/trends/google')    test('GET /post/history - 投稿履歴取得', async () => {

        .query({ geo: 'JP', limit: 5 })      const response = await request(API_BASE_URL)

        .expect(200);        .get('/post/history')

        .query({ limit: 5 })

      expect(response.body).toHaveProperty('success', true);        .expect(200);

      expect(response.body).toHaveProperty('trends');

      expect(Array.isArray(response.body.trends)).toBe(true);      expect(response.body).toHaveProperty('success', true);

    }, TEST_TIMEOUT);      expect(response.body).toHaveProperty('posts');

      expect(Array.isArray(response.body.posts)).toBe(true);

    test('GET /trends/yahoo - Yahoo Trends取得', async () => {    });

      const response = await request(API_BASE_URL)  });

        .get('/trends/yahoo')

        .query({ category: 'all', limit: 5 })  describe('📊 Trends API', () => {

        .expect(200);    test('GET /trends/google - Google Trends取得', async () => {

      const response = await request(API_BASE_URL)

      expect(response.body).toHaveProperty('success', true);        .get('/trends/google')

      expect(response.body).toHaveProperty('trends');        .query({ geo: 'JP', limit: 5 })

      expect(Array.isArray(response.body.trends)).toBe(true);        .expect(200);

    });

  });      expect(response.body).toHaveProperty('success', true);

      expect(response.body).toHaveProperty('trends');

  describe('🔧 システム統合確認', () => {      expect(Array.isArray(response.body.trends)).toBe(true);

    test('E2E: プロンプト生成→投稿→履歴確認', async () => {    }, TEST_TIMEOUT);

      console.log('🎯 E2Eテスト: 完全フロー確認開始');

    test('GET /trends/yahoo - Yahoo Trends取得', async () => {

      // 1. プロンプト生成      const response = await request(API_BASE_URL)

      const generateResponse = await request(API_BASE_URL)        .get('/trends/yahoo')

        .post('/post/generate')        .query({ category: 'all', limit: 5 })

        .send({        .expect(200);

          tone: 'professional',

          includeImage: false      expect(response.body).toHaveProperty('success', true);

        });      expect(response.body).toHaveProperty('trends');

      expect(Array.isArray(response.body.trends)).toBe(true);

      expect(generateResponse.status).toBe(200);    });

      const generatedContent = generateResponse.body.prompt.content;  });



      // 2. 投稿実行（ドラフト）  describe('🎙️ 日記API', () => {

      const postResponse = await request(API_BASE_URL)    test('POST /diary/transcribe - 音声文字起こし（モック）', async () => {

        .post('/post/tweet')      // モックファイルまたはテストデータで実行

        .send({      const response = await request(API_BASE_URL)

          content: `[E2Eテスト] ${generatedContent}`,        .post('/diary/transcribe')

          isDraft: true        .send({

        });          audioData: 'mock_audio_base64_data',

          language: 'ja'

      expect(postResponse.status).toBe(200);        })

        .expect(200);

      // 3. 履歴確認

      const historyResponse = await request(API_BASE_URL)      expect(response.body).toHaveProperty('success', true);

        .get('/post/history')      expect(response.body).toHaveProperty('transcription');

        .query({ limit: 1 });    }, TEST_TIMEOUT);



      expect(historyResponse.status).toBe(200);    test('GET /diary/entries - 日記エントリー取得', async () => {

      expect(historyResponse.body.success).toBe(true);      const response = await request(API_BASE_URL)

        .get('/diary/entries')

      console.log('✅ E2Eテスト完了: プロンプト生成→投稿→履歴確認');        .query({ 

    }, TEST_TIMEOUT * 2);          startDate: '2024-11-01',

          endDate: '2024-11-30'

    test('パフォーマンス: API応答時間測定', async () => {        })

      const startTime = Date.now();        .expect(200);

      

      await request(API_BASE_URL)      expect(response.body).toHaveProperty('success', true);

        .post('/post/generate')      expect(response.body).toHaveProperty('entries');

        .send({ tone: 'casual', includeImage: false });      expect(Array.isArray(response.body.entries)).toBe(true);

    });

      const endTime = Date.now();  });

      const responseTime = endTime - startTime;

  describe('⚙️ 設定・システムAPI', () => {

      expect(responseTime).toBeLessThan(15000);    test('GET /settings/persona - Persona設定取得', async () => {

      console.log(`📊 API応答時間: ${responseTime}ms`);      const response = await request(API_BASE_URL)

    }, TEST_TIMEOUT);        .get('/settings/persona')

  });        .expect(200);

});
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('persona');
    });

    test('PUT /settings/persona - Persona設定更新', async () => {
      const testPersona = {
        name: '統合テストペルソナ',
        personality: 'テスト用の性格設定',
        tone: 'casual'
      };

      const response = await request(API_BASE_URL)
        .put('/settings/persona')
        .send({ persona: testPersona })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('🔧 システム統合確認', () => {
    test('E2E: プロンプト生成→投稿→履歴確認', async () => {
      console.log('🎯 E2Eテスト: 完全フロー確認開始');

      // 1. プロンプト生成
      const generateResponse = await request(API_BASE_URL)
        .post('/post/generate')
        .send({
          tone: 'professional',
          includeImage: false
        });

      expect(generateResponse.status).toBe(200);
      const generatedContent = generateResponse.body.prompt.content;

      // 2. 投稿実行（ドラフト）
      const postResponse = await request(API_BASE_URL)
        .post('/post/tweet')
        .send({
          content: `[E2Eテスト] ${generatedContent}`,
          isDraft: true
        });

      expect(postResponse.status).toBe(200);

      // 3. 履歴確認
      const historyResponse = await request(API_BASE_URL)
        .get('/post/history')
        .query({ limit: 1 });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.success).toBe(true);

      console.log('✅ E2Eテスト完了: プロンプト生成→投稿→履歴確認');
    }, TEST_TIMEOUT * 2); // より長いタイムアウト

    test('パフォーマンス: API応答時間測定', async () => {
      const startTime = Date.now();
      
      await request(API_BASE_URL)
        .post('/post/generate')
        .send({ tone: 'casual', includeImage: false });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // 応答時間が15秒以内であることを確認
      expect(responseTime).toBeLessThan(15000);
      console.log(`📊 API応答時間: ${responseTime}ms`);
    }, TEST_TIMEOUT);

    test('負荷テスト: 同時リクエスト処理', async () => {
      const requests = Array(3).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/test/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      // すべてのリクエストが成功することを確認
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status');
      });

      console.log('✅ 負荷テスト完了: 3並列リクエスト成功');
    });
  });
});