import { OpenAI } from 'openai';
import { SecretsHelper } from './secrets';

/**
 * OpenAI クライアント
 */
let openaiClient: OpenAI | null = null;

const getOpenAIClient = async (): Promise<OpenAI> => {
  if (!openaiClient) {
    const apiKey = await SecretsHelper.getOpenAIApiKey();
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
};

/**
 * OpenAI API 操作のヘルパー関数
 */
export class OpenAIHelper {
  /**
   * GPT-4を使用してテキスト生成
   */
  static async generateText(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    try {
      const client = await getOpenAIClient();
      
      const {
        model = 'gpt-4',
        maxTokens = 150,
        temperature = 0.7,
        systemPrompt = 'You are a helpful assistant that creates social media posts.',
      } = options;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ];

      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const generatedText = response.choices[0]?.message?.content;
      if (!generatedText) {
        throw new Error('No text generated from OpenAI');
      }

      return generatedText.trim();
    } catch (error) {
      console.error('OpenAI Generate Text Error:', error);
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 投稿文を生成（POSL専用）
   */
  static async generatePost(
    promptData: {
      weekdayTheme: string;
      trendData?: any[];
      personaProfile?: string;
      recentDiary?: string;
      toneSettings?: any;
      templateId?: string;
      additionalRules?: string;
    }
  ): Promise<string> {
    const {
      weekdayTheme,
      trendData = [],
      personaProfile = '',
      recentDiary = '',
      toneSettings = {},
      templateId = 'default',
      additionalRules = '',
    } = promptData;

    // プロンプト構築
    let systemPrompt = `あなたはSNS投稿を生成するAIです。以下の条件に従って、140文字以内の自然で魅力的な投稿文を作成してください。

【基本方針】
- 日本語で投稿する
- 140文字以内（できるだけ120-140文字程度）
- 自然で親しみやすい文体
- 投稿者の人柄が伝わる内容

【今日のテーマ】
${weekdayTheme}`;

    if (personaProfile) {
      systemPrompt += `\n\n【投稿者の人格プロファイル】\n${personaProfile}`;
    }

    if (recentDiary) {
      systemPrompt += `\n\n【最近の日記内容】\n${recentDiary}`;
    }

    if (trendData.length > 0) {
      const trends = trendData.map(t => t.keyword).join(', ');
      systemPrompt += `\n\n【今日のトレンド】\n${trends}\n（これらのキーワードを自然に組み込むか、関連する話題を含めてください）`;
    }

    if (Object.keys(toneSettings).length > 0) {
      systemPrompt += `\n\n【文体設定】\n丁寧さ: ${toneSettings.politeness || 70}/100\nカジュアルさ: ${toneSettings.casualness || 60}/100\nポジティブ度: ${toneSettings.positivity || 80}/100`;
    }

    if (additionalRules) {
      systemPrompt += `\n\n【追加ルール】\n${additionalRules}`;
    }

    systemPrompt += `\n\n投稿文のみを出力してください。説明や補足は不要です。`;

    const userPrompt = `今日の投稿文を生成してください。`;

    return this.generateText(userPrompt, {
      model: 'gpt-4',
      maxTokens: 200,
      temperature: 0.8,
      systemPrompt,
    });
  }

  /**
   * 音声をテキストに変換（Whisper）
   */
  static async transcribeAudio(
    audioBuffer: any, // Buffer type
    options: {
      language?: string;
      model?: string;
    } = {}
  ): Promise<string> {
    try {
      const client = await getOpenAIClient();
      
      const {
        language = 'ja',
        model = 'whisper-1',
      } = options;

      // Bufferをファイル形式に変換
      const audioFile = new File([audioBuffer], 'audio.wav', { 
        type: 'audio/wav' 
      });

      const response = await client.audio.transcriptions.create({
        file: audioFile,
        model,
        language,
        response_format: 'text',
      });

      if (typeof response !== 'string') {
        throw new Error('Unexpected response format from Whisper');
      }

      return response.trim();
    } catch (error) {
      console.error('OpenAI Transcribe Audio Error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * テキストから人格特性を抽出
   */
  static async extractPersonaTraits(
    text: string,
    existingProfile?: string
  ): Promise<{
    summary: string;
    traits: Array<{
      category: string;
      trait: string;
      confidence: number;
    }>;
    emotionTags: string[];
  }> {
    const systemPrompt = `あなたは心理学とパーソナリティ分析の専門家です。
以下のテキストを分析して、書き手の人格特性を抽出してください。

【分析観点】
1. 性格特徴（外向性、協調性、誠実性、神経質傾向、開放性）
2. 価値観や興味関心
3. 話し方や表現の特徴
4. 感情の傾向

${existingProfile ? `【既存プロファイル】\n${existingProfile}\n（既存の情報と統合して分析してください）` : ''}

JSON形式で以下の構造で回答してください：
{
  "summary": "人格の要約（100文字程度）",
  "traits": [
    {
      "category": "性格特徴",
      "trait": "具体的な特徴",
      "confidence": 0.8
    }
  ],
  "emotionTags": ["感情タグ1", "感情タグ2"]
}`;

    const userPrompt = `以下のテキストを分析してください：\n\n${text}`;

    try {
      const response = await this.generateText(userPrompt, {
        model: 'gpt-4',
        maxTokens: 500,
        temperature: 0.3,
        systemPrompt,
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Persona Extraction Error:', error);
      // フォールバック
      return {
        summary: 'テキストから人格特性を抽出中...',
        traits: [],
        emotionTags: ['日記'],
      };
    }
  }

  /**
   * プロンプトテスト用関数
   */
  static async testPrompt(prompt: string): Promise<string> {
    return this.generateText(prompt, {
      model: 'gpt-3.5-turbo',
      maxTokens: 150,
      temperature: 0.7,
    });
  }
}