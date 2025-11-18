import { APIGatewayProxyEvent, APIGatewayProxyResult, PostLog } from '../../types';
import { successResponse, internalServerErrorResponse } from '../../libs/response';
import { PromptEngine } from '../../libs/prompt-engine';
import { OpenAIHelper } from '../../libs/openai';
import { XHelper } from '../../libs/x-api';
import { MySQLHelper } from '../../libs/mysql';
import { ENV } from '../../libs/env';

/**
 * Simple UUID v4 generator
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 指数バックオフによるリトライ機能
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // 指数バックオフ: 1s, 2s, 4s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * 投稿生成・実行 Lambda 関数（エラーハンドリング強化版）
 * EventBridge から自動実行される、またはAPIから手動実行可能
 */
export const handler = async (
  event: APIGatewayProxyEvent | any
): Promise<APIGatewayProxyResult | any> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  let userId: string = '';
  let postId: string = '';
  
  try {
    // ユーザーIDの取得
    if (event.source === 'aws.events') {
      userId = event.detail?.userId || 'default-user';
    } else {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      userId = body?.userId || event.headers?.['X-User-Id'] || 'default-user';
    }
    
    // 投稿IDの生成
    postId = generateUUID().replace(/-/g, '');
    
    // 初期投稿ログをMySQLに作成 (post_logsテーブル構造に合わせる)
    const initialPostLog = {
      userId: userId,
      postId: postId,
      timestamp: new Date().toISOString(),
      content: '',
      xPostId: '',
      prompt: '',
      trendData: [],
      success: false,
      status: 'pending'
    };
    
    await MySQLHelper.putItem('post_logs', initialPostLog);

    // プロンプト生成エンジンを初期化（リトライ付き）
    const promptEngine = new PromptEngine(userId);
    
    const { system, user, context } = await retryWithBackoff(
      () => promptEngine.generatePrompt(),
      3,
      1000
    );

    // OpenAI GPT-4 で投稿文を生成（リトライ付き）
    const postContent = await retryWithBackoff(
      () => OpenAIHelper.generateText(user, {
        model: 'gpt-4',
        maxTokens: 200,
        temperature: 0.8,
        systemPrompt: system
      }),
      3,
      2000
    );

    // 投稿内容の検証
    if (!postContent || postContent.length > 280) {
      throw new Error(`Generated content is invalid (length: ${postContent?.length || 0})`);
    }

    let xPostId: string | undefined;
    let postResult: any = null;

    // 実際にX（旧Twitter）に投稿するかチェック（開発環境でもテスト可能）
    const shouldPost = ENV.NODE_ENV === 'production' || ENV.NODE_ENV === 'development';
    
    if (shouldPost) {
      try {
        // X API で実際に投稿（リトライ付き）
        postResult = await retryWithBackoff(
          () => XHelper.postTweet(postContent),
          2,
          3000
        );
        xPostId = postResult.tweetId;
      } catch (xError) {
        console.error('X posting failed after retries:', xError);
      }
    }

    // プロンプトを結合してログ用に保存
    const fullPrompt = `System: ${system}\n\nUser: ${user}`;

    // 投稿ログをMySQLに保存
    const postLog: PostLog = {
      userId,
      postId,
      content: postContent,
      timestamp: new Date().toISOString(),
      xPostId: xPostId || '',
      prompt: fullPrompt,
      trendData: context.trends,
      success: !!xPostId,
      ...(xPostId ? {} : { error: shouldPost ? 'X posting failed' : 'Posting disabled for non-production' })
    };

    await MySQLHelper.putItem('post_logs', postLog);

    // レスポンス
    const response = {
      message: 'Post generated successfully',
      postLog: {
        postId: postLog.postId,
        content: postLog.content,
        timestamp: postLog.timestamp,
        xPostId: postLog.xPostId,
        success: postLog.success
      },
      context,
      debug: {
        systemPrompt: system.substring(0, 200) + '...',
        userPrompt: user.substring(0, 200) + '...',
        shouldPost,
        postResult
      }
    };

    // EventBridge からの実行の場合は直接オブジェクトを返す
    if (event.source === 'aws.events') {
      return response;
    }

    // API Gateway からの実行の場合はAPIGatewayProxyResultを返す
    return successResponse(response);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Critical error in generateAndPost:', error);
    
    // EventBridge からの実行の場合
    if (event.source === 'aws.events') {
      throw error;
    }
    
    // API Gateway からの実行の場合
    return internalServerErrorResponse(errorMessage);
  }
};