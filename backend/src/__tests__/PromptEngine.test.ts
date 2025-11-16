/**
 * PromptEngine テストスイート
 * Jest + TypeScript での単体テスト
 */

import { PromptEngine } from '../libs/prompt-engine';
import { DynamoDBHelper } from '../libs/dynamodb';
import { GoogleTrendsHelper } from '../libs/trends/google-trends';
import { YahooTrendsHelper } from '../libs/trends/yahoo-trends';
import { 
  WeekThemeSettings, 
  EventSettings, 
  TrendSettings, 
  ToneSettings, 
  TemplateSettings, 
  PromptSettings,
  PersonaProfile,
  TrendData
} from '../types';

// 外部依存をモック化
jest.mock('../libs/dynamodb');
jest.mock('../libs/trends/google-trends');
jest.mock('../libs/trends/yahoo-trends');

const mockedDynamo = DynamoDBHelper as jest.Mocked<typeof DynamoDBHelper>;
const mockedGoogle = GoogleTrendsHelper as jest.Mocked<typeof GoogleTrendsHelper>;
const mockedYahoo = YahooTrendsHelper as jest.Mocked<typeof YahooTrendsHelper>;

describe('PromptEngine', () => {
  const userId = 'test-user';
  let engine: PromptEngine;

  // テストデータのファクトリー
  const createMockWeekThemeSettings = (): WeekThemeSettings => ({
    monday: '月曜日は新しいスタート！',
    tuesday: '火曜日は学びの日',
    wednesday: '水曜日は振り返りの日', 
    thursday: '木曜日はトレンドを追いかけよう',
    friday: '金曜日は週末に向けて',
    saturday: '土曜日は自由な発想で',
    sunday: '日曜日はリラックス'
  });

  const createMockEventSettings = (hasToday: boolean = true): EventSettings => ({
    enabled: true,
    customEvents: hasToday ? [
      {
        id: 'event1',
        name: '記念日',
        date: new Date().toISOString().split('T')[0], // 今日
        description: '今日は記念日です',
        enabled: true
      }
    ] : [],
    behavior: 'add'
  });

  const createMockTrendSettings = (enabled: boolean = true): TrendSettings => ({
    enabled,
    sources: ['google', 'yahoo'] as ('google' | 'yahoo')[],
    mixRatio: 50,
    mixStyle: 'casual' as 'casual',
    excludeCategories: []
  });

  const createMockToneSettings = (): ToneSettings => ({
    politeness: 70,
    casualness: 60,
    positivity: 80,
    expertise: 50,
    emotionLevel: 70,
    metaphorUsage: 30,
    emojiUsage: 50
  });

  const createMockTemplateSettings = (): TemplateSettings => ({
    enabled: ['template1'],
    priorities: { 'template1': 1 }
  });

  const createMockPromptSettings = (): PromptSettings => ({
    additionalRules: '専門用語は一文で補足してください。',
    ngWords: ['炎上'],
    preferredPhrases: ['じんわり'],
    creativityLevel: 0.7
  });

  const createMockPersonaProfile = (): PersonaProfile => ({
    userId,
    summary: 'テスト用の人格プロファイル',
    traits: [
      { category: '性格', trait: '優しい', confidence: 0.9, examples: [] },
      { category: '性格', trait: '前向き', confidence: 0.8, examples: [] }
    ],
    commonTopics: ['技術', '読書'],
    speakingStyle: {
      formality: 60,
      positivity: 80,
      expertise: 70,
      emotionLevel: 60
    },
    lastUpdated: new Date().toISOString(),
    diaryCount: 5
  });

  const createMockTrendData = (): TrendData[] => ([
    { keyword: '睡眠不足', rank: 1, category: 'health' },
    { keyword: '働き方改革', rank: 2, category: 'work' }
  ]);

  beforeEach(() => {
    jest.resetAllMocks();
    engine = new PromptEngine(userId);
    
    // 日付モックをリセット（必要に応じて）
    jest.spyOn(Date.prototype, 'getDay').mockRestore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generatePrompt()', () => {
    beforeEach(() => {
      // デフォルトのモック設定
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() }) // week-theme
        .mockResolvedValueOnce({ data: createMockEventSettings() })     // event
        .mockResolvedValueOnce({ data: createMockTrendSettings() })     // trend
        .mockResolvedValueOnce({ data: createMockToneSettings() })      // tone
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })  // template
        .mockResolvedValueOnce({ data: createMockPromptSettings() })    // prompt
        .mockResolvedValueOnce(createMockPersonaProfile());             // persona

      // デフォルトのトレンドモック
      mockedGoogle.fetchDailyTrends.mockResolvedValue(createMockTrendData().slice(0, 1));
      mockedYahoo.fetchRealtimeTrends.mockResolvedValue(createMockTrendData().slice(1, 2));
    });

    test('A-1. 正常系: すべての設定が存在する場合（全部入り詳細版）', async () => {
      // 日付を月曜日に固定
      jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
      const today = '2023-11-16';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(today + 'T00:00:00.000Z');

      // 詳細なモックデータを設定
      mockedDynamo.getItem
        .mockResolvedValueOnce({
          data: {
            monday: '月曜テーマ：新しい挑戦！',
            tuesday: '火曜テーマ：学び',
            wednesday: '水曜テーマ：振り返り',
            thursday: '木曜テーマ：トレンド',
            friday: '金曜テーマ：週末準備',
            saturday: '土曜テーマ：自由発想',
            sunday: '日曜テーマ：リラックス',
          },
        })
        .mockResolvedValueOnce({
          data: {
            enabled: true,
            customEvents: [
              {
                date: today,
                description: '今日は記念日です',
              },
            ],
            behavior: 'add',
          },
        })
        .mockResolvedValueOnce({
          data: {
            enabled: true,
            sources: ['google', 'yahoo'],
            mixRatio: 50,
            mixStyle: 'casual',
            excludeCategories: [],
          },
        })
        .mockResolvedValueOnce({
          data: {
            politeness: 80,
            casualness: 40,
            positivity: 90,
            expertise: 50,
            emotionLevel: 70,
            metaphorUsage: 40,
            emojiUsage: 30,
          },
        })
        .mockResolvedValueOnce({
          data: {
            enabled: ['template2', 'template1'],
            priorities: { template1: 1, template2: 2 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            additionalRules: '専門用語は一文で補足してください。',
            ngWords: ['炎上', 'ギリギリ'],
            preferredPhrases: ['じんわり', '一歩ずつ'],
            creativityLevel: 0.6,
          },
        })
        .mockResolvedValueOnce({
          traits: [
            { trait: '優しい', confidence: 0.9 },
            { trait: '前向き', confidence: 0.8 },
          ],
          summary: '人の話をよく聞き、前向きな声かけをするタイプです。',
          speakingStyle: {
            formality: 70,
            positivity: 80,
            expertise: 50,
            emotionLevel: 60,
          },
          commonTopics: ['仕事の工夫', '日々の小さな幸せ'],
        } as PersonaProfile);

      // 最近の日記データ
      mockedDynamo.scan.mockResolvedValue([
        {
          userId,
          createdAt: '2023-11-15T12:00:00.000Z',
          transcriptionStatus: 'completed',
          originalText: '今日はこんなことがあって、ちょっと嬉しかったです。新しいプロジェクトが始まって、チームメンバーも素敵な人たちばかり。今度の企画会議が楽しみです。',
        },
      ]);

      // トレンドデータ
      mockedGoogle.fetchDailyTrends.mockResolvedValue([
        { keyword: '睡眠不足', category: 'health' },
      ] as any);
      mockedYahoo.fetchRealtimeTrends.mockResolvedValue([
        { keyword: '残業時間', category: 'work' },
      ] as any);

      const result = await engine.generatePrompt();

      // === システムメッセージの詳細検証 ===
      expect(result.system).toContain('あなたは日本のSNS投稿を作成するAIアシスタントです。');
      expect(result.system).toContain('【役割】');
      expect(result.system).toContain('X（旧Twitter）用');
      expect(result.system).toContain('【投稿の基本要件】');
      expect(result.system).toContain('280文字以内');
      expect(result.system).toContain('ハッシュタグ・URL：V1では基本的に使用しない');
      expect(result.system).toContain('【文体・トーンの特徴】');
      expect(result.system).toContain('非常に丁寧で礼儀正しい敬語'); // politeness: 80
      expect(result.system).toContain('非常に前向きで明るく楽観的'); // positivity: 90
      expect(result.system).toContain('控えめに絵文字を使う'); // emojiUsage: 30
      expect(result.system).toContain('【使用禁止ワード】');
      expect(result.system).toContain('炎上');
      expect(result.system).toContain('ギリギリ');
      expect(result.system).toContain('【推奨表現】');
      expect(result.system).toContain('じんわり');
      expect(result.system).toContain('一歩ずつ');
      expect(result.system).toContain('【創造性レベル】');
      expect(result.system).toContain('60%');
      expect(result.system).toContain('【特別なルール】');
      expect(result.system).toContain('専門用語は一文で補足してください。');

      // === ユーザーメッセージの詳細検証 ===
      expect(result.user).toContain('# 今日の投稿条件');
      expect(result.user).toContain('## 今日のテーマ（曜日テーマ）');
      expect(result.user).toContain('月曜テーマ：新しい挑戦！');
      expect(result.user).toContain('## 人格プロファイル');
      expect(result.user).toContain('【主な人格特性】');
      expect(result.user).toContain('優しい（信頼度: 0.9）');
      expect(result.user).toContain('前向き（信頼度: 0.8）');
      expect(result.user).toContain('【人格要約】');
      expect(result.user).toContain('人の話をよく聞き、前向きな声かけをするタイプです。');
      expect(result.user).toContain('【話し方の特徴】');
      expect(result.user).toContain('フォーマル度: 70/100');
      expect(result.user).toContain('【よく話すトピック】');
      expect(result.user).toContain('仕事の工夫、日々の小さな幸せ');
      expect(result.user).toContain('## 最近の活動・日記');
      expect(result.user).toContain('最近の日記から:');
      expect(result.user).toContain('新しいプロジェクトが始まって、チームメンバーも素敵な人たちばかり。今度の企画会議が楽しみです。');
      expect(result.user).toContain('## 使用するテンプレート');
      expect(result.user).toContain('テンプレートID: template1'); // 優先度1が選ばれる
      expect(result.user).toContain('構成: 感想共有型：体験→感想→一言');
      expect(result.user).toContain('## 今日のイベント');
      expect(result.user).toContain('今日は記念日です');
      expect(result.user).toContain('## 参考トレンド');
      expect(result.user).toContain('睡眠不足');
      expect(result.user).toContain('残業時間');
      expect(result.user).toContain('【トレンドの扱い方】');
      expect(result.user).toContain('トレンドを自然な感じで軽く織り込んでください。'); // casual style
      expect(result.user).toContain('50%程度'); // mixRatio: 50
      expect(result.user).toContain('## 出力指示');
      expect(result.user).toContain('投稿文のみを出力し、説明や補足は不要です。');

      // === コンテキストの詳細検証 ===
      expect(result.context.weekTheme).toBe('月曜テーマ：新しい挑戦！');
      expect(result.context.events).toEqual(['今日は記念日です']);
      expect(result.context.trends.length).toBe(2);
      expect(result.context.trends[0].keyword).toBe('睡眠不足');
      expect(result.context.trends[1].keyword).toBe('残業時間');
      expect(result.context.personaContext).toContain('【主な人格特性】');
      expect(result.context.personaContext).toContain('優しい（信頼度: 0.9）');
      expect(result.context.recentDiaryContext).toContain('最近の日記から:');
    test('A-2. Personaなし + 日記なしの場合', async () => {
      // Personaプロファイルをnullに
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(null); // Persona profile なし

      // 日記も空にする
      mockedDynamo.scan.mockResolvedValue([]);

      const result = await engine.generatePrompt();

      // Persona関連の検証
      expect(result.context.personaContext).toContain('特別な人格特性は設定されていません。一般的で親しみやすい人格で投稿してください。');
      expect(result.user).toContain('特別な人格特性は設定されていません。');

      // 日記関連の検証
      expect(result.context.recentDiaryContext).toBe('最近の日記はありません。');
      expect(result.user).not.toContain('## 最近の活動・日記'); // セクション自体が出ない
    });

    test('A-3. トレンド無効の場合', async () => {
      // トレンド設定を無効に
      const trendSettings = createMockTrendSettings();
      trendSettings.enabled = false;
      
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: trendSettings }) // enabled: false
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      // または mixRatio を 0 にしてトレンド取得数を0にする
      mockedGoogle.fetchDailyTrends.mockResolvedValue([]);
      mockedYahoo.fetchRealtimeTrends.mockResolvedValue([]);

      const result = await engine.generatePrompt();

      expect(result.context.trends.length).toBe(0);
      expect(result.user).not.toContain('## 参考トレンド');
      expect(result.user).not.toContain('【トレンドの扱い方】');
    });

    test('A-4. イベント設定はあるが今日のイベントなしの場合', async () => {
      // 今日以外の日付のイベントを設定
      const eventSettings = createMockEventSettings();
      eventSettings.customEvents = [
        {
          id: 'past-event',
          name: '過去のイベント',
          date: '2023-11-10', // 今日ではない
          description: '過去のイベントです',
          isRecurring: false
        }
      ];

      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: eventSettings }) // 今日のイベントなし
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      const result = await engine.generatePrompt();

      expect(result.context.events.length).toBe(0);
      expect(result.user).not.toContain('## 今日のイベント');
    });

    test('A-5. DynamoDBエラー時のフォールバック', async () => {
      // 全ての getItem を失敗させる
      mockedDynamo.getItem.mockRejectedValue(new Error('DynamoDB Error'));
      mockedDynamo.scan.mockRejectedValue(new Error('Scan Error'));

      // トレンドAPIも失敗させる
      mockedGoogle.fetchDailyTrends.mockRejectedValue(new Error('Google API Error'));
      mockedYahoo.fetchRealtimeTrends.mockRejectedValue(new Error('Yahoo API Error'));

      const result = await engine.generatePrompt();

      // エラーは投げずに成功すること
      expect(result).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.context).toBeDefined();

      // デフォルト値が使われること
      expect(result.context.weekTheme).toContain('Today is a great day!'); // デフォルト値
      expect(result.context.trends.length).toBe(0); // API失敗で空
      expect(result.context.events.length).toBe(0); // 設定取得失敗で空
      expect(result.context.personaContext).toContain('特別な人格特性は設定されていません。');
      expect(result.context.recentDiaryContext).toContain('取得できませんでした。');
    });

    test('A-6. 外部API エラー時の安全処理', async () => {
      // 設定は正常に取得
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      // 日記取得は成功
      mockedDynamo.scan.mockResolvedValue([
        {
          userId,
          createdAt: new Date().toISOString(),
          transcriptionStatus: 'completed',
          originalText: '今日の日記です。',
        },
      ]);

      // トレンドAPIのみ失敗
      mockedGoogle.fetchDailyTrends.mockRejectedValue(new Error('Google API Error'));
      mockedYahoo.fetchRealtimeTrends.mockRejectedValue(new Error('Yahoo API Error'));

      const result = await engine.generatePrompt();

      // 他の部分は正常に動作
      expect(result.context.weekTheme).toBeDefined();
      expect(result.context.personaContext).toContain('【主な人格特性】');
      expect(result.context.recentDiaryContext).toContain('今日の日記です。');

      // トレンド部分のみ空
      expect(result.context.trends.length).toBe(0);
  });

  describe('B. 個別メソッドテスト', () => {
    
    describe('B-1. generateSystemMessage()', () => {
      test('ngWords / preferredPhrases / additionalRules すべてセット', async () => {
        const toneSettings = createMockToneSettings();
        const promptSettings: PromptSettings = {
          additionalRules: 'カジュアルすぎない言葉遣いで。',
          ngWords: ['やばい', 'まじで'],
          preferredPhrases: ['素敵', 'ちょっと'],
          creativityLevel: 0.8
        };

        // privateメソッドテスト用にas anyを使用
        const systemMessage = (engine as any).generateSystemMessage(toneSettings, promptSettings);

        expect(systemMessage).toContain('【使用禁止ワード】');
        expect(systemMessage).toContain('やばい');
        expect(systemMessage).toContain('まじで');
        expect(systemMessage).toContain('【推奨表現】');
        expect(systemMessage).toContain('素敵');
        expect(systemMessage).toContain('ちょっと');
        expect(systemMessage).toContain('【特別なルール】');
        expect(systemMessage).toContain('カジュアルすぎない言葉遣いで。');
        expect(systemMessage).toContain('80%');
      });

      test('creativityLevel = 0.2 で低レベル表示', async () => {
        const toneSettings = createMockToneSettings();
        const promptSettings: PromptSettings = {
          additionalRules: '',
          ngWords: [],
          preferredPhrases: [],
          creativityLevel: 0.2
        };

        const systemMessage = (engine as any).generateSystemMessage(toneSettings, promptSettings);
        expect(systemMessage).toContain('20%');
        expect(systemMessage).toContain('低レベル（〜30%）');
      });
    });

    describe('B-2. generateToneDescription()', () => {
      test('politeness=85 で非常に丁寧', async () => {
        const toneSettings: ToneSettings = {
          politeness: 85,
          casualness: 30,
          positivity: 70,
          expertise: 50,
          emotionLevel: 60,
          metaphorUsage: 30,
          emojiUsage: 50
        };

        const result = (engine as any).generateToneDescription(toneSettings);
        expect(result).toContain('非常に丁寧で礼儀正しい敬語');
      });

      test('politeness=30, casualness=80 でとてもカジュアル', async () => {
        const toneSettings: ToneSettings = {
          politeness: 30,
          casualness: 80,
          positivity: 70,
          expertise: 50,
          emotionLevel: 60,
          metaphorUsage: 30,
          emojiUsage: 50
        };

        const result = (engine as any).generateToneDescription(toneSettings);
        expect(result).toContain('とてもカジュアルでフレンドリーな');
      });

      test('positivity=95 で非常に前向き', async () => {
        const toneSettings: ToneSettings = {
          politeness: 70,
          casualness: 50,
          positivity: 95,
          expertise: 50,
          emotionLevel: 60,
          metaphorUsage: 30,
          emojiUsage: 50
        };

        const result = (engine as any).generateToneDescription(toneSettings);
        expect(result).toContain('非常に前向きで明るく楽観的');
      });

      test('emojiUsage=0 で絵文字を使わない', async () => {
        const toneSettings: ToneSettings = {
          politeness: 70,
          casualness: 50,
          positivity: 70,
          expertise: 50,
          emotionLevel: 60,
          metaphorUsage: 30,
          emojiUsage: 0
        };

        const result = (engine as any).generateToneDescription(toneSettings);
        expect(result).toContain('絵文字を使わない');
      });

      test('metaphorUsage=75 で比喩を多用', async () => {
        const toneSettings: ToneSettings = {
          politeness: 70,
          casualness: 50,
          positivity: 70,
          expertise: 50,
          emotionLevel: 60,
          metaphorUsage: 75,
          emojiUsage: 50
        };

        const result = (engine as any).generateToneDescription(toneSettings);
        expect(result).toContain('比喩や例え話を多用する');
      });
    });

    describe('B-3. generatePersonaContext()', () => {
      test('profile なしの場合', async () => {
        const result = (engine as any).generatePersonaContext(null);
        expect(result).toBe('特別な人格特性は設定されていません。一般的で親しみやすい人格で投稿してください。');
      });

      test('traits + summary + speakingStyle + commonTopics 全部あり', async () => {
        const profile: PersonaProfile = {
          traits: [
            { trait: '創造的', confidence: 0.9 },
            { trait: '分析的', confidence: 0.8 },
            { trait: '協調的', confidence: 0.7 }
          ],
          summary: 'クリエイティブで論理的思考も併せ持つタイプ',
          speakingStyle: {
            formality: 60,
            positivity: 85,
            expertise: 70,
            emotionLevel: 75
          },
          commonTopics: ['デザイン', 'データ分析', 'チームワーク']
        };

        const result = (engine as any).generatePersonaContext(profile);
        expect(result).toContain('【主な人格特性】');
        expect(result).toContain('創造的（信頼度: 0.9）');
        expect(result).toContain('【人格要約】');
        expect(result).toContain('クリエイティブで論理的思考も併せ持つタイプ');
        expect(result).toContain('【話し方の特徴】');
        expect(result).toContain('フォーマル度: 60/100');
        expect(result).toContain('【よく話すトピック】');
        expect(result).toContain('デザイン、データ分析、チームワーク');
      });
    });

    describe('B-4. getRecentDiaryContext()', () => {
      test('日記ゼロの場合', async () => {
        mockedDynamo.scan.mockResolvedValue([]);

        const result = await (engine as any).getRecentDiaryContext();
        expect(result).toBe('最近の日記はありません。');
      });

      test('originalTextが空・空白のみの場合', async () => {
        mockedDynamo.scan.mockResolvedValue([
          {
            userId,
            createdAt: new Date().toISOString(),
            transcriptionStatus: 'completed',
            originalText: ''
          },
          {
            userId,
            createdAt: new Date().toISOString(),
            transcriptionStatus: 'completed',
            originalText: '   '
          }
        ]);

        const result = await (engine as any).getRecentDiaryContext();
        expect(result).toBe('最近の日記はありません。');
      });

      test('5件以上・長文あり（100文字超切り詰め）', async () => {
        const longText = 'これは非常に長い日記のテキストです。'.repeat(10); // 約300文字

        mockedDynamo.scan.mockResolvedValue([
          {
            userId,
            createdAt: '2023-11-15T12:00:00.000Z',
            transcriptionStatus: 'completed',
            originalText: longText
          },
          {
            userId,
            createdAt: '2023-11-14T12:00:00.000Z',
            transcriptionStatus: 'completed',
            originalText: '短いテキスト'
          },
          {
            userId,
            createdAt: '2023-11-13T12:00:00.000Z',
            transcriptionStatus: 'completed',
            originalText: '普通の長さのテキスト'
          },
          {
            userId,
            createdAt: '2023-11-12T12:00:00.000Z',
            transcriptionStatus: 'completed',
            originalText: '4番目のテキスト'
          },
          {
            userId,
            createdAt: '2023-11-11T12:00:00.000Z',
            transcriptionStatus: 'completed',
            originalText: '5番目のテキスト'
          }
        ]);

        const result = await (engine as any).getRecentDiaryContext();
        
        expect(result).toContain('最近の日記から:');
        expect(result).toContain('1. '); // 最新のもの
        expect(result).toContain('2. '); // 2番目
        expect(result).toContain('3. '); // 3番目
        expect(result).not.toContain('4. '); // 4番目以降は含まれない
        expect(result).toContain('...'); // 長文は切り詰められる
      });

      test('scanが例外の場合', async () => {
        mockedDynamo.scan.mockRejectedValue(new Error('Database error'));

        const result = await (engine as any).getRecentDiaryContext();
        expect(result).toBe('最近の日記を取得できませんでした。');
      });
    });

    describe('B-5. getCurrentWeekTheme()', () => {
      test('月曜日（getDay=1）の場合', async () => {
        jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
        const settings = createMockWeekThemeSettings();

        const result = (engine as any).getCurrentWeekTheme(settings);
        expect(result).toBe(settings.monday);
      });

      test('日曜日（getDay=0）の場合', async () => {
        jest.spyOn(Date.prototype, 'getDay').mockReturnValue(0);
        const settings = createMockWeekThemeSettings();

        const result = (engine as any).getCurrentWeekTheme(settings);
        expect(result).toBe(settings.sunday);
      });

      test('設定がundefinedの場合デフォルト値', async () => {
        jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
        const settings = { monday: undefined } as any;

        const result = (engine as any).getCurrentWeekTheme(settings);
        expect(result).toBe('Today is a great day!');
      });
    });

    describe('B-6. getTodaysEvents()', () => {
      test('今日のイベント1件取得', async () => {
        const today = new Date().toISOString().split('T')[0];
        const settings: EventSettings = {
          enabled: true,
          customEvents: [
            { date: today, description: '今日のイベント' },
            { date: '2023-12-25', description: '将来のイベント' },
            { date: '2023-10-01', description: '過去のイベント' }
          ],
          behavior: 'add'
        };

        const result = (engine as any).getTodaysEvents(settings);
        expect(result).toEqual(['今日のイベント']);
      });

      test('今日のイベントなし', async () => {
        const settings: EventSettings = {
          enabled: true,
          customEvents: [
            { date: '2023-12-25', description: '将来のイベント' },
            { date: '2023-10-01', description: '過去のイベント' }
          ],
          behavior: 'add'
        };

        const result = (engine as any).getTodaysEvents(settings);
    });

    describe('B-7. selectTemplate()', () => {
      test('優先度順で選択', async () => {
        const templateSettings: TemplateSettings = {
          enabled: ['template3', 'template1', 'template2'],
          priorities: { 
            template1: 1, 
            template2: 3, 
            template3: 2 
          }
        };

        const result = (engine as any).selectTemplate(templateSettings);
        expect(result).toBe('template1'); // 優先度1が最高
      });

      test('有効テンプレートなしの場合デフォルト', async () => {
        const templateSettings: TemplateSettings = {
          enabled: [],
          priorities: {}
        };

        const result = (engine as any).selectTemplate(templateSettings);
        expect(result).toBe('default');
      });
    });
  });

  describe('C. 文字列フォーマット品質テスト', () => {
    
    test('C-1. システムメッセージ必須キーワード確認', async () => {
      const result = await engine.generatePrompt();

      expect(result.system).toContain('あなたは日本のSNS投稿を作成するAIアシスタントです。');
      expect(result.system).toContain('X（旧Twitter）用');
      expect(result.system).toContain('280文字以内');
      expect(result.system).toContain('ハッシュタグ・URL：V1では基本的に使用しない');
      expect(result.system).toContain('創造性レベル');
    });

    test('C-2. ユーザーメッセージ必須セクション確認', async () => {
      // 今日のイベントありの設定
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings(true) })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      const result = await engine.generatePrompt();

      expect(result.user).toContain('# 今日の投稿条件');
      expect(result.user).toContain('## 今日のテーマ（曜日テーマ）');
      expect(result.user).toContain('## 人格プロファイル');
      expect(result.user).toContain('## 使用するテンプレート');
      expect(result.user).toContain('## 出力指示');
    });

    test('C-3. エラー文字列混入チェック', async () => {
      const result = await engine.generatePrompt();

      // 禁止パターンの確認
      expect(result.system).not.toContain('[object Object]');
      expect(result.system).not.toContain('undefined');
      expect(result.user).not.toContain('[object Object]');
      expect(result.user).not.toContain('undefined');
      expect(result.context.weekTheme).not.toContain('[object Object]');
      expect(result.context.personaContext).not.toContain('undefined');

      // 適切な日本語文字エンコーディングの確認
      expect(result.system).toMatch(/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303FA-Za-z0-9\s\[\]【】（）。、！？\n\r\-・：％]+$/);
    });

    test('C-4. 条件分岐による出力変化確認', async () => {
      // イベントなし設定でテスト
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings(false) })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      // トレンドなし設定
      mockedGoogle.fetchDailyTrends.mockResolvedValue([]);
      mockedYahoo.fetchRealtimeTrends.mockResolvedValue([]);

      const result = await engine.generatePrompt();

      // イベントセクション非表示
      expect(result.user).not.toContain('## 今日のイベント');
      
      // トレンドセクション非表示
      expect(result.user).not.toContain('## 参考トレンド');
      expect(result.user).not.toContain('【トレンドの扱い方】');
    });

    test('C-5. トーン変換精密性確認', async () => {
      // 特定のトーン設定でテスト
      const specificToneSettings: ToneSettings = {
        politeness: 85,
        casualness: 20,
        positivity: 95,
        expertise: 30,
        emotionLevel: 40,
        metaphorUsage: 10,
        emojiUsage: 0
      };

      const toneDescription = (engine as any).generateToneDescription(specificToneSettings);

      expect(toneDescription).toContain('非常に丁寧で礼儀正しい敬語');
      expect(toneDescription).toContain('非常に前向きで明るく楽観的');
      expect(toneDescription).toContain('絵文字を使わない');
    });

    test('C-6. システム/ユーザー分離確認', async () => {
      const result = await engine.generatePrompt();

      // システムメッセージ：基本要件・ルール
      expect(result.system).toContain('基本要件');
      expect(result.system).toContain('役割');

      // ユーザーメッセージ：今日の具体的条件
      expect(result.user).toContain('今日の投稿条件');
      expect(result.user).toContain('今日のテーマ');

      // 重複がないことを確認
      expect(result.system).not.toContain('今日の投稿条件');
      expect(result.user).not.toContain('あなたは日本のSNS投稿を作成するAIアシスタントです。');
    });
  });

});
      expect(result.system).toContain('X（旧Twitter）用の自然で魅力的な投稿文を生成');
      expect(result.system).toContain('280文字以内');
      expect(result.system).toContain('ハッシュタグ・URL：V1では基本的に使用しない');

      // ユーザーメッセージの各セクション確認
      expect(result.user).toContain('# 今日の投稿条件');
      expect(result.user).toContain('## 今日のテーマ（曜日テーマ）');
      expect(result.user).toContain('## 人格プロファイル');
      expect(result.user).toContain('## 使用するテンプレート');
      expect(result.user).toContain('## 今日のイベント');
      expect(result.user).toContain('今日は記念日です');
      expect(result.user).toContain('## 参考トレンド');
      expect(result.user).toContain('睡眠不足');
      expect(result.user).toContain('働き方改革');

      // コンテキストの確認
      expect(result.context.weekTheme).toBeDefined();
      expect(result.context.events.length).toBe(1);
      expect(result.context.events[0]).toBe('今日は記念日です');
      expect(result.context.trends.length).toBe(2);
      expect(result.context.toneDescription).toMatch(/ポジティブで明るい/);
      expect(result.context.personaContext).toContain('主な人格特性');
      expect(result.context.recentDiaryContext).toBeDefined();
    });

    test('A-2. イベントなしの日', async () => {
      // イベント設定を「イベントなし」に変更
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings(false) }) // イベントなし
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      const result = await engine.generatePrompt();

      // イベントセクションが出現しないことを確認
      expect(result.user).not.toContain('## 今日のイベント');
      expect(result.context.events).toEqual([]);
    });

    test('A-3. トレンド無効', async () => {
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: createMockTrendSettings(false) }) // トレンド無効
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      const result = await engine.generatePrompt();

      // トレンドセクションが出現しないことを確認
      expect(result.user).not.toContain('## 参考トレンド');
      expect(result.context.trends.length).toBe(0);
    });

    test('A-4. Personaなし', async () => {
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(null); // ペルソナなし

      const result = await engine.generatePrompt();

      expect(result.context.personaContext).toContain('特別な人格特性は設定されていません');
      expect(result.user).toContain('特別な人格特性は設定されていません');
    });

    test('A-5. DynamoDBでエラー → デフォルト値にフォールバック', async () => {
      // 週テーマ取得でエラー
      mockedDynamo.getItem
        .mockRejectedValueOnce(new Error('DynamoDB Error'))  // week-theme エラー
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockRejectedValueOnce(new Error('DynamoDB Error'))  // tone エラー
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      const result = await engine.generatePrompt();

      // generatePrompt() 自体は成功する
      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
      
      // デフォルト値が使われていることを確認
      expect(result.context.weekTheme).toMatch(/月曜日は新しいスタート|Today is a great day/);
      expect(result.context.toneDescription).toContain('ポジティブで明るい'); // デフォルトトーン
    });

    test('A-6. トレンドAPIでエラー → 空配列', async () => {
      mockedGoogle.fetchDailyTrends.mockRejectedValue(new Error('Google API Error'));
      mockedYahoo.fetchRealtimeTrends.mockRejectedValue(new Error('Yahoo API Error'));

      const result = await engine.generatePrompt();

      // generatePrompt() は正常終了
      expect(result.system).toBeDefined();
      expect(result.user).toBeDefined();
      
      // トレンドセクションが出現しない
      expect(result.user).not.toContain('## 参考トレンド');
      expect(result.context.trends.length).toBe(0);
    });
  });

  describe('個別メソッドのテスト', () => {
    describe('getCurrentWeekTheme()', () => {
      test('B-1. 曜日ごとに正しいテーマが返る', () => {
        const weekThemeSettings = createMockWeekThemeSettings();
        
        // 月曜日（getDay() = 1）をテスト
        jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1);
        const mondayTheme = (engine as any).getCurrentWeekTheme(weekThemeSettings);
        expect(mondayTheme).toBe('月曜日は新しいスタート！');

        // 土曜日（getDay() = 6）をテスト
        Date.prototype.getDay = jest.fn().mockReturnValue(6);
        const saturdayTheme = (engine as any).getCurrentWeekTheme(weekThemeSettings);
        expect(saturdayTheme).toBe('土曜日は自由な発想で');
      });

      test('未設定のキーならデフォルト値', () => {
        const emptySettings = {} as WeekThemeSettings;
        const defaultTheme = (engine as any).getCurrentWeekTheme(emptySettings);
        expect(defaultTheme).toBe('Today is a great day!');
      });
    });

    describe('getTodaysEvents()', () => {
      test('B-2. 今日の日付のイベントのみが返される', () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const eventSettings: EventSettings = {
          enabled: true,
          behavior: 'add',
          customEvents: [
            { id: 'e1', name: '今日のイベント', date: today, description: '今日は記念日', enabled: true },
            { id: 'e2', name: '昨日のイベント', date: yesterday, description: '昨日は過去', enabled: true },
            { id: 'e3', name: '明日のイベント', date: tomorrow, description: '明日は未来', enabled: true }
          ]
        };

        const todaysEvents = (engine as any).getTodaysEvents(eventSettings);
        expect(todaysEvents).toEqual(['今日は記念日']);
      });
    });

    describe('fetchTrends()', () => {
      test('B-3-1. 両方のソース有効でmixRatioに応じて件数調整', async () => {
        const trendSettings = createMockTrendSettings();
        trendSettings.mixRatio = 50;

        mockedGoogle.fetchDailyTrends.mockResolvedValue([
          { keyword: 'Google1', rank: 1, category: 'tech' },
          { keyword: 'Google2', rank: 2, category: 'health' }
        ]);
        mockedYahoo.fetchRealtimeTrends.mockResolvedValue([
          { keyword: 'Yahoo1', rank: 1, category: 'sports' },
          { keyword: 'Yahoo2', rank: 2, category: 'news' }
        ]);

        const trends = await (engine as any).fetchTrends(trendSettings);
        
        // mixRatio 50% → trendCount = floor(0.5 * 10) = 5
        expect(trends.length).toBeLessThanOrEqual(5);
        expect(trends.some((t: any) => t.keyword.startsWith('Google'))).toBeTruthy();
        expect(trends.some((t: any) => t.keyword.startsWith('Yahoo'))).toBeTruthy();
      });

      test('B-3-2. カテゴリ除外フィルタ', async () => {
        const trendSettings = createMockTrendSettings();
        trendSettings.excludeCategories = ['news'];

        mockedGoogle.fetchDailyTrends.mockResolvedValue([
          { keyword: 'News1', rank: 1, category: 'news' },
          { keyword: 'Tech1', rank: 2, category: 'tech' }
        ]);
        mockedYahoo.fetchRealtimeTrends.mockResolvedValue([]);

        const trends = await (engine as any).fetchTrends(trendSettings);
        
        expect(trends.every((t: any) => t.category !== 'news')).toBeTruthy();
        expect(trends.some((t: any) => t.keyword === 'Tech1')).toBeTruthy();
      });

      test('B-3-3. mixRatio = 0', async () => {
        const trendSettings = createMockTrendSettings();
        trendSettings.mixRatio = 0;

        mockedGoogle.fetchDailyTrends.mockResolvedValue([
          { keyword: 'Test1', rank: 1, category: 'tech' }
        ]);
        mockedYahoo.fetchRealtimeTrends.mockResolvedValue([]);

        const trends = await (engine as any).fetchTrends(trendSettings);
        expect(trends.length).toBe(0); // mixRatio 0% → 0件
      });
    });

    describe('generateToneDescription()', () => {
      test('B-4-1. politeness >= 80 → 非常に丁寧', () => {
        const toneSettings: ToneSettings = {
          politeness: 85, casualness: 20, positivity: 50, 
          expertise: 50, emotionLevel: 50, metaphorUsage: 20, emojiUsage: 30
        };

        const description = (engine as any).generateToneDescription(toneSettings);
        expect(description).toContain('非常に丁寧で礼儀正しい敬語を基調とした');
      });

      test('B-4-2. politeness < 40 & casualness >= 70 → とてもカジュアル', () => {
        const toneSettings: ToneSettings = {
          politeness: 30, casualness: 80, positivity: 60,
          expertise: 40, emotionLevel: 70, metaphorUsage: 30, emojiUsage: 60
        };

        const description = (engine as any).generateToneDescription(toneSettings);
        expect(description).toContain('とてもカジュアルでフレンドリーな');
      });

      test('B-4-3. positivity >= 90 → 非常に前向き', () => {
        const toneSettings: ToneSettings = {
          politeness: 50, casualness: 50, positivity: 95,
          expertise: 50, emotionLevel: 50, metaphorUsage: 20, emojiUsage: 40
        };

        const description = (engine as any).generateToneDescription(toneSettings);
        expect(description).toContain('非常に前向きで明るく楽観的な');
      });

      test('B-4-4. emojiUsage < 20 → 絵文字を使わない', () => {
        const toneSettings: ToneSettings = {
          politeness: 60, casualness: 50, positivity: 70,
          expertise: 50, emotionLevel: 50, metaphorUsage: 30, emojiUsage: 10
        };

        const description = (engine as any).generateToneDescription(toneSettings);
        expect(description).toContain('絵文字を使わない');
      });

      test('B-4-5. metaphorUsage >= 70 → 比喩を多用', () => {
        const toneSettings: ToneSettings = {
          politeness: 50, casualness: 50, positivity: 70,
          expertise: 50, emotionLevel: 60, metaphorUsage: 75, emojiUsage: 50
        };

        const description = (engine as any).generateToneDescription(toneSettings);
        expect(description).toContain('比喩や例え話を多用する');
      });
    });

    describe('generatePersonaContext()', () => {
      test('B-5-1. traits ありの場合', () => {
        const personaProfile = createMockPersonaProfile();

        const context = (engine as any).generatePersonaContext(personaProfile);
        
        expect(context).toContain('【主な人格特性】');
        expect(context).toContain('優しい（信頼度: 0.9）');
        expect(context).toContain('前向き（信頼度: 0.8）');
        expect(context).toContain('【人格要約】');
        expect(context).toContain('テスト用の人格プロファイル');
        expect(context).toContain('【話し方の特徴】');
        expect(context).toContain('【よく話すトピック】');
        expect(context).toContain('技術、読書');
      });

      test('B-5-2. traits 空の場合', () => {
        const emptyProfile = null;

        const context = (engine as any).generatePersonaContext(emptyProfile);
        expect(context).toContain('特別な人格特性は設定されていません');
        expect(context).toContain('一般的で親しみやすい人格で投稿してください');
      });

      test('B-5-3. traits配列は空だがプロファイルは存在', () => {
        const profileWithoutTraits: PersonaProfile = {
          ...createMockPersonaProfile(),
          traits: []
        };

        const context = (engine as any).generatePersonaContext(profileWithoutTraits);
        expect(context).toContain('特別な人格特性は設定されていません');
      });
    });
  });

  describe('文字列フォーマットのテスト', () => {
    beforeEach(() => {
      // 基本的なモック設定
      mockedDynamo.getItem
        .mockResolvedValueOnce({ data: createMockWeekThemeSettings() })
        .mockResolvedValueOnce({ data: createMockEventSettings() })
        .mockResolvedValueOnce({ data: createMockTrendSettings() })
        .mockResolvedValueOnce({ data: createMockToneSettings() })
        .mockResolvedValueOnce({ data: createMockTemplateSettings() })
        .mockResolvedValueOnce({ data: createMockPromptSettings() })
        .mockResolvedValueOnce(createMockPersonaProfile());

      mockedGoogle.fetchDailyTrends.mockResolvedValue([]);
      mockedYahoo.fetchRealtimeTrends.mockResolvedValue([]);
    });

    test('C-1. システムメッセージに必要なキーワードが含まれる', async () => {
      const result = await engine.generatePrompt();

      const requiredSystemKeywords = [
        'あなたは日本のSNS投稿を作成するAIアシスタント',
        'X（旧Twitter）用',
        '280文字以内',
        '日本語',
        'ハッシュタグ・URL：V1では基本的に使用しない',
        '創造性レベル'
      ];

      requiredSystemKeywords.forEach(keyword => {
        expect(result.system).toContain(keyword);
      });
    });

    test('C-2. ユーザーメッセージに必要なセクションが含まれる', async () => {
      const result = await engine.generatePrompt();

      const requiredUserSections = [
        '# 今日の投稿条件',
        '## 今日のテーマ（曜日テーマ）',
        '## 人格プロファイル',
        '## 使用するテンプレート',
        '## 出力指示'
      ];

      requiredUserSections.forEach(section => {
        expect(result.user).toContain(section);
      });
    });

    test('C-3. オブジェクト文字列化エラーが含まれていない', async () => {
      const result = await engine.generatePrompt();

      // [object Object] などのエラー文字列が含まれていないことを確認
      expect(result.system).not.toContain('[object Object]');
      expect(result.user).not.toContain('[object Object]');
      expect(result.system).not.toContain('undefined');
      expect(result.user).not.toContain('undefined');
    });

    test('C-4. NGワードと好みの表現が正しく反映される', async () => {
      const result = await engine.generatePrompt();

      expect(result.system).toContain('炎上'); // NGワード
      expect(result.system).toContain('じんわり'); // 好みの表現
      expect(result.system).toContain('専門用語は一文で補足してください'); // 追加ルール
    });
  });
});