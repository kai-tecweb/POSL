import { MySQLHelper } from './mysql';
import { ENV } from './env';
import { 
  WeekThemeSettings, 
  EventSettings, 
  TrendSettings, 
  ToneSettings, 
  TemplateSettings, 
  PromptSettings,
  TrendData,
  PersonaProfile,
  Diary
} from '../types';
import { GoogleTrendsHelper } from './trends/google-trends';
import { YahooTrendsHelper } from './trends/yahoo-trends';

/**
 * プロンプト生成エンジン
 */
export class PromptEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 投稿用プロンプトを生成
   */
  async generatePrompt(): Promise<{
    system: string;
    user: string;
    context: {
      weekTheme: string;
      events: string[];
      trends: TrendData[];
      toneDescription: string;
      personaContext: string;
      recentDiaryContext: string;
    };
  }> {
    try {
      // 各設定を取得
      const [
        weekThemeSettings,
        eventSettings,
        trendSettings,
        toneSettings,
        templateSettings,
        promptSettings,
        personaProfile
      ] = await Promise.all([
        this.getWeekThemeSettings(),
        this.getEventSettings(),
        this.getTrendSettings(),
        this.getToneSettings(),
        this.getTemplateSettings(),
        this.getPromptSettings(),
        this.getPersonaProfile()
      ]);

      // 現在の曜日テーマを取得
      const weekTheme = this.getCurrentWeekTheme(weekThemeSettings);

      // イベント情報を取得
      const events = this.getTodaysEvents(eventSettings);

      // トレンド情報を取得
      const trends = await this.fetchTrends(trendSettings);

      // トーン設定を文字列に変換
      const toneDescription = this.generateToneDescription(toneSettings);

      // 人格プロファイルの要約
      const personaContext = this.generatePersonaContext(personaProfile);

      // 最近の日記から文脈を取得
      const recentDiaryContext = await this.getRecentDiaryContext();

      // テンプレート選択（基本実装）
      const templateId = this.selectTemplate(templateSettings);
      const templateDescription = this.generateTemplateDescription(templateId);

      // システムメッセージ（固定ルール）を生成
      const systemMessage = this.generateSystemMessage(toneSettings, promptSettings);

      // ユーザーメッセージ（今日の条件）を生成
      const userMessage = this.generateUserMessage({
        weekTheme,
        events,
        trends,
        toneDescription,
        personaContext,
        recentDiaryContext,
        templateId,
        templateDescription,
        additionalRules: promptSettings.additionalRules || '',
        ngWords: promptSettings.ngWords || [],
        preferredExpressions: promptSettings.preferredPhrases || [],
        trendSettings,
        creativityLevel: promptSettings.creativityLevel
      });

      return {
        system: systemMessage,
        user: userMessage,
        context: {
          weekTheme,
          events,
          trends,
          toneDescription,
          personaContext,
          recentDiaryContext
        }
      };

    } catch (error) {
      throw new Error('Failed to generate prompt');
    }
  }

  /**
   * 週テーマ設定を取得
   */
  private async getWeekThemeSettings(): Promise<WeekThemeSettings> {
    try {
      const setting = await MySQLHelper.getItem(ENV.SETTINGS_TABLE, {
        userId: this.userId,
        settingType: 'week-theme'
      }) as any;
      
      return setting?.data || {
        monday: '月曜日は新しいスタート！',
        tuesday: '火曜日は学びの日',
        wednesday: '水曜日は振り返りの日',
        thursday: '木曜日はトレンドを追いかけよう',
        friday: '金曜日は週末に向けて',
        saturday: '土曜日は自由な発想で',
        sunday: '日曜日はリラックス'
      };
    } catch (error) {
      console.error('Error getting week theme settings:', error);
      return {
        monday: '月曜日は新しいスタート！',
        tuesday: '火曜日は学びの日',
        wednesday: '水曜日は振り返りの日',
        thursday: '木曜日はトレンドを追いかけよう',
        friday: '金曜日は週末に向けて',
        saturday: '土曜日は自由な発想で',
        sunday: '日曜日はリラックス'
      };
    }
  }

  /**
   * イベント設定を取得
   */
  private async getEventSettings(): Promise<EventSettings> {
    try {
      const setting = await MySQLHelper.getItem(ENV.SETTINGS_TABLE, {
        userId: this.userId,
        settingType: 'event'
      }) as any;
      
      return setting?.data || {
        enabled: true,
        customEvents: [],
        behavior: 'add'
      };
    } catch (error) {
      console.error('Error getting event settings:', error);
      return {
        enabled: true,
        customEvents: [],
        behavior: 'add' as const
      };
    }
  }

  /**
   * トレンド設定を取得
   */
  private async getTrendSettings(): Promise<TrendSettings> {
    try {
      const setting = await MySQLHelper.getItem(ENV.SETTINGS_TABLE, {
        userId: this.userId,
        settingType: 'trend'
      });
      
      return (setting as any)?.data || {
        enabled: true,
        sources: ['google'],
        mixRatio: 50,
        mixStyle: 'casual',
        excludeCategories: []
      };
    } catch (error) {
      console.error('Error getting trend settings:', error);
      return {
        enabled: true,
        sources: ['google'] as const,
        mixRatio: 50,
        mixStyle: 'casual' as const,
        excludeCategories: []
      };
    }
  }

  /**
   * トーン設定を取得
   */
  private async getToneSettings(): Promise<ToneSettings> {
    try {
      const setting = await MySQLHelper.getItem(ENV.SETTINGS_TABLE, {
        userId: this.userId,
        settingType: 'tone'
      });
      
      return (setting as any)?.data || {
        politeness: 70,
        casualness: 60,
        positivity: 80,
        expertise: 50,
        emotionLevel: 70,
        metaphorUsage: 30,
        emojiUsage: 50
      };
    } catch (error) {
      console.error('Error getting tone settings:', error);
      return {
        politeness: 70,
        casualness: 60,
        positivity: 80,
        expertise: 50,
        emotionLevel: 70,
        metaphorUsage: 30,
        emojiUsage: 50
      };
    }
  }

  /**
   * テンプレート設定を取得
   */
  private async getTemplateSettings(): Promise<TemplateSettings> {
    try {
      const setting = await MySQLHelper.getItem(ENV.SETTINGS_TABLE, {
        userId: this.userId,
        settingType: 'template'
      });
      
      return (setting as any)?.data || {
        enabled: ['template1', 'template2'],
        priorities: {
          'template1': 1,
          'template2': 2
        }
      };
    } catch (error) {
      console.error('Error getting template settings:', error);
      return {
        enabled: ['template1', 'template2'],
        priorities: {
          'template1': 1,
          'template2': 2
        }
      };
    }
  }

  /**
   * プロンプト設定を取得
   */
  private async getPromptSettings(): Promise<PromptSettings> {
    try {
      const setting = await MySQLHelper.getItem(ENV.SETTINGS_TABLE, {
        userId: this.userId,
        settingType: 'prompt'
      });
      
      return (setting as any)?.data || {
        additionalRules: '',
        ngWords: [],
        preferredPhrases: [],
        creativityLevel: 0.7
      };
    } catch (error) {
      console.error('Error getting prompt settings:', error);
      return {
        additionalRules: '',
        ngWords: [],
        preferredPhrases: [],
        creativityLevel: 0.7
      };
    }
  }

  /**
   * 人格プロファイルを取得
   */
  private async getPersonaProfile(): Promise<PersonaProfile | null> {
    try {
      const profile = await MySQLHelper.getItem(ENV.PERSONA_PROFILES_TABLE, {
        userId: this.userId
      });
      
      return (profile as PersonaProfile) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * テンプレート選択ロジック（基本実装）
   */
  private selectTemplate(templateSettings: TemplateSettings): string {
    if (!templateSettings.enabled || templateSettings.enabled.length === 0) {
      return 'default'; // デフォルトテンプレート
    }

    // 優先度順でソートして最初のものを選択
    const sortedTemplates = templateSettings.enabled.sort((a, b) => {
      const priorityA = templateSettings.priorities[a] || 999;
      const priorityB = templateSettings.priorities[b] || 999;
      return priorityA - priorityB;
    });

    return sortedTemplates[0];
  }

  /**
   * テンプレート構造説明文を生成
   */
  private generateTemplateDescription(templateId: string): string {
    const templateDescriptions: { [key: string]: string } = {
      'default': '基本的な3文構成（挨拶・本題・締め）',
      'template1': '感想共有型：体験→感想→一言',
      'template2': '質問投げかけ型：状況説明→質問→交流促進',
      'template3': 'ヒント・学び型：発見→解説→活用提案',
      'casual': 'カジュアル型：つぶやき→補足→感情表現',
      'professional': 'フォーマル型：状況→分析→結論',
      'story': 'ストーリー型：起→承→転・結',
      'news': 'ニュース型：事実→背景→意見',
      'diary': '日記型：今日の出来事→気持ち→明日への思い',
      'wisdom': '格言型：教訓→具体例→応用アドバイス'
    };

    return templateDescriptions[templateId] || templateDescriptions['default'];
  }

  /**
   * システムメッセージを生成（固定ルール）
   */
  private generateSystemMessage(toneSettings: ToneSettings, promptSettings: PromptSettings): string {
    let systemMessage = `あなたは日本のSNS投稿を作成するAIアシスタントです。

【役割】
- X（旧Twitter）用の自然で魅力的な投稿文を生成
- 指定された人格特性とトーン設定に忠実に従う
- 日本語での投稿作成に特化

【投稿の基本要件】
- 文字数：280文字以内（推奨：120-250文字）
- 言語：日本語
- 形式：投稿文のみを出力（説明や補足は不要）
- ハッシュタグ・URL：V1では基本的に使用しない（自然な文章のみ）
- メンション：使用しない

【文体・トーンの特徴】
${this.generateToneDescription(toneSettings)}`;

    // NGワードがある場合は明記
    if (promptSettings.ngWords && promptSettings.ngWords.length > 0) {
      systemMessage += `\n\n【使用禁止ワード】
以下の言葉は絶対に使用しないでください：
${promptSettings.ngWords.join('、')}`;
    }

    // 好みの表現がある場合は推奨
    if (promptSettings.preferredPhrases && promptSettings.preferredPhrases.length > 0) {
      systemMessage += `\n\n【推奨表現】
以下の表現を自然に取り入れてください：
${promptSettings.preferredPhrases.join('、')}`;
    }

    // クリエイティブレベル設定
    const creativityPercentage = Math.round(promptSettings.creativityLevel * 100);
    systemMessage += `\n\n【創造性レベル】
今回の創造性レベルは ${creativityPercentage}% です。
- 低レベル（〜30%）：テンプレートに忠実、安定した表現
- 中レベル（31-70%）：テンプレート維持しつつ表現に遊び
- 高レベル（71%〜）：比喩や構成により自由度、個性的な表現`;

    // 追加ルール
    if (promptSettings.additionalRules && promptSettings.additionalRules.trim().length > 0) {
      systemMessage += `\n\n【特別なルール】
${promptSettings.additionalRules}`;
    }

    return systemMessage;
  }

  /**
   * ユーザーメッセージを生成（今日の条件）
   */
  private generateUserMessage(context: {
    weekTheme: string;
    events: string[];
    trends: TrendData[];
    toneDescription: string;
    personaContext: string;
    recentDiaryContext: string;
    templateId: string;
    templateDescription: string;
    additionalRules: string;
    ngWords: string[];
    preferredExpressions: string[];
    trendSettings: TrendSettings;
    creativityLevel: number;
  }): string {
    let userMessage = `# 今日の投稿条件

## 今日のテーマ（曜日テーマ）
${context.weekTheme}

## 人格プロファイル
${context.personaContext}`;

    // 最近の日記情報
    if (context.recentDiaryContext && context.recentDiaryContext !== '最近の日記はありません。') {
      userMessage += `\n\n## 最近の活動・日記
${context.recentDiaryContext}`;
    }

    // 使用するテンプレート
    userMessage += `\n\n## 使用するテンプレート
テンプレートID: ${context.templateId}
構成: ${context.templateDescription}`;

    // 今日のイベント
    if (context.events.length > 0) {
      userMessage += `\n\n## 今日のイベント
${context.events.join('\n')}`;
    }

    // トレンド情報の扱い方
    if (context.trends.length > 0) {
      const mixStyleDescription = this.getTrendMixStyleDescription(context.trendSettings.mixStyle);
      const mixRatioDescription = this.getTrendMixRatioDescription(context.trendSettings.mixRatio);
      
      userMessage += `\n\n## 参考トレンド
${context.trends.map(trend => 
        `- ${trend.keyword}${trend.category ? ` (${trend.category})` : ''}`
      ).join('\n')}

【トレンドの扱い方】
${mixStyleDescription}
${mixRatioDescription}`;
    }

    userMessage += `\n\n## 出力指示
上記の条件を踏まえて、今日のX投稿を1つ生成してください。
投稿文のみを出力し、説明や補足は不要です。`;

    return userMessage;
  }

  /**
   * トレンドのミックススタイル説明文を生成
   */
  private getTrendMixStyleDescription(mixStyle: string): string {
    const styleDescriptions: { [key: string]: string } = {
      'brief': 'トレンドは一言だけ軽く触れる程度にしてください。',
      'casual': 'トレンドを自然な感じで軽く織り込んでください。',
      'detailed': 'トレンドについてある程度詳しく言及してください。',
      'humor': 'トレンドをユーモアを交えて面白く扱ってください。'
    };

    return styleDescriptions[mixStyle] || styleDescriptions['casual'];
  }

  /**
   * トレンドのミックス割合説明文を生成
   */
  private getTrendMixRatioDescription(mixRatio: number): string {
    if (mixRatio <= 20) {
      return 'トレンドの存在感は控えめに（20%以下）、メインはあなた自身の体験や考えを中心にしてください。';
    } else if (mixRatio <= 50) {
      return `トレンドの存在感は適度に（${mixRatio}%程度）、個人的な体験とバランスよく組み合わせてください。`;
    } else if (mixRatio <= 80) {
      return `トレンドを積極的に取り入れて（${mixRatio}%程度）、トレンドを中心とした投稿にしてください。`;
    } else {
      return 'トレンドを主役にして（80%以上）、トレンドについて深く掘り下げた投稿にしてください。';
    }
  }
  private async getRecentDiaryContext(): Promise<string> {
    try {
      // 最近3日間の完了した日記を取得
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentDiaries = await MySQLHelper.scan<Diary>(
        ENV.DIARIES_TABLE,
        'user_id = ? AND JSON_EXTRACT(diary_data, "$.transcriptionStatus") = ? AND created_at >= ?',
        [this.userId, 'completed', threeDaysAgo.toISOString()],
        undefined,
        5 // 最大5件
      );

      if (recentDiaries.length === 0) {
        return '最近の日記はありません。';
      }

      // 日記内容を要約して文脈を生成
      const diaryTexts = recentDiaries
        .sort((a: Diary, b: Diary) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((diary: Diary) => diary.originalText)
        .filter((text: string | undefined) => text && text.trim().length > 0);

      if (diaryTexts.length === 0) {
        return '最近の日記はありません。';
      }

      // 最近の日記内容を要約
      const recentContext = diaryTexts.slice(0, 3).map((text: string, index: number) => {
        const shortText = text.length > 100 ? text.substring(0, 100) + '...' : text;
        return `${index + 1}. ${shortText}`;
      }).join('\n');

      return `最近の日記から:\n${recentContext}`;

    } catch (error) {
      return '最近の日記を取得できませんでした。';
    }
  }

  /**
   * 現在の曜日テーマを取得
   */
  private getCurrentWeekTheme(settings: WeekThemeSettings): string {
    const dayOfWeek = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return settings[dayNames[dayOfWeek] as keyof WeekThemeSettings] || 'Today is a great day!';
  }

  /**
   * 今日のイベントを取得
   */
  private getTodaysEvents(settings: EventSettings): string[] {
    const today = new Date().toISOString().split('T')[0];
    const todaysEvents = settings.customEvents?.filter(event => 
      event.date === today
    ) || [];
    
    return todaysEvents.map(event => event.description);
  }

  /**
   * トレンド情報を取得
   */
  private async fetchTrends(settings: TrendSettings): Promise<TrendData[]> {
    try {
      let allTrends: TrendData[] = [];

      // Google Trends
      if (settings.sources.includes('google')) {
        const googleTrends = await GoogleTrendsHelper.fetchDailyTrends('JP', 5);
        allTrends = allTrends.concat(googleTrends);
      }

      // Yahoo Trends
      if (settings.sources.includes('yahoo')) {
        const yahooTrends = await YahooTrendsHelper.fetchRealtimeTrends(5);
        allTrends = allTrends.concat(yahooTrends);
      }

      // 除外カテゴリをフィルタリング
      if (settings.excludeCategories && settings.excludeCategories.length > 0) {
        allTrends = allTrends.filter(trend => 
          !settings.excludeCategories.includes(trend.category || '')
        );
      }

      // ミックスレベルに応じて取得数を調整
      const trendCount = Math.floor((settings.mixRatio / 100) * 10);
      
      return allTrends.slice(0, trendCount);

    } catch (error) {
      console.error('Error fetching trends:', error);
      return [];
    }
  }

  /**
   * トーン設定を文字列に変換（仕様書対応版）
   */
  private generateToneDescription(tone: ToneSettings): string {
    const descriptions: string[] = [];

    // 丁寧さとカジュアル度のバランス
    if (tone.politeness >= 80) {
      descriptions.push('非常に丁寧で礼儀正しい敬語を基調とした');
    } else if (tone.politeness >= 60) {
      descriptions.push('適度に丁寧で、敬語を交えた');
    } else if (tone.politeness >= 40) {
      if (tone.casualness >= 60) {
        descriptions.push('親しみやすく、フランクな');
      } else {
        descriptions.push('自然体で程よくフォーマルな');
      }
    } else {
      if (tone.casualness >= 70) {
        descriptions.push('とてもカジュアルでフレンドリーな');
      } else {
        descriptions.push('くだけた感じの');
      }
    }

    // ポジティブ度
    if (tone.positivity >= 90) {
      descriptions.push('非常に前向きで明るく楽観的な');
    } else if (tone.positivity >= 70) {
      descriptions.push('ポジティブで明るい');
    } else if (tone.positivity >= 50) {
      descriptions.push('穏やかで落ち着いた');
    } else if (tone.positivity >= 30) {
      descriptions.push('現実的で冷静な');
    } else {
      descriptions.push('慎重で控えめな');
    }

    // 専門性レベル
    if (tone.expertise >= 80) {
      descriptions.push('専門的で詳しく解説する');
    } else if (tone.expertise >= 60) {
      descriptions.push('ある程度知識を交えた');
    } else if (tone.expertise >= 40) {
      descriptions.push('わかりやすく説明する');
    } else {
      descriptions.push('素朴で親近感のある');
    }

    // 感情レベル
    if (tone.emotionLevel >= 80) {
      descriptions.push('感情豊かで表現力に富んだ');
    } else if (tone.emotionLevel >= 60) {
      descriptions.push('適度に感情を込めた');
    } else if (tone.emotionLevel >= 40) {
      descriptions.push('落ち着いて冷静な');
    } else {
      descriptions.push('淡々とした');
    }

    // 比喩使用度
    if (tone.metaphorUsage >= 70) {
      descriptions.push('比喩や例え話を多用する');
    } else if (tone.metaphorUsage >= 40) {
      descriptions.push('時々比喩を交える');
    }
    // 低い場合は何も追加しない（ストレート表現）

    // 絵文字使用度
    if (tone.emojiUsage >= 70) {
      descriptions.push('絵文字を効果的に多用する');
    } else if (tone.emojiUsage >= 40) {
      descriptions.push('絵文字を適度に使った');
    } else if (tone.emojiUsage >= 20) {
      descriptions.push('控えめに絵文字を使う');
    } else {
      descriptions.push('絵文字を使わない');
    }

    const result = descriptions.join('、') + '文体';
    return result;
  }

  /**
   * 人格コンテキストを生成
   */
  private generatePersonaContext(profile: PersonaProfile | null): string {
    if (!profile || !profile.traits || profile.traits.length === 0) {
      return '特別な人格特性は設定されていません。一般的で親しみやすい人格で投稿してください。';
    }

    const traitDescriptions = profile.traits
      .slice(0, 5) // 上位5つの特性
      .map(trait => `${trait.trait}（信頼度: ${trait.confidence}）`)
      .join('、');

    let context = `【主な人格特性】
${traitDescriptions}

【人格要約】
${profile.summary || 'この人の特徴をもとに自然な投稿を心がけてください。'}`;

    // 話し方スタイルがあれば追加
    if (profile.speakingStyle) {
      const style = profile.speakingStyle;
      context += `\n\n【話し方の特徴】
- フォーマル度: ${style.formality}/100
- ポジティブ度: ${style.positivity}/100
- 専門性: ${style.expertise}/100
- 感情表現: ${style.emotionLevel}/100`;
    }

    // よく話すトピックがあれば追加
    if (profile.commonTopics && profile.commonTopics.length > 0) {
      context += `\n\n【よく話すトピック】
${profile.commonTopics.slice(0, 3).join('、')}`;
    }

    context += '\n\nこれらの特性を投稿に自然に反映してください。';

    return context;
  }
}