import { APIGatewayProxyEvent, APIGatewayProxyResult, PostLog } from '../../types';
import { successResponse, internalServerErrorResponse } from '../../libs/response';
import { PromptEngine } from '../../libs/prompt-engine';
import { OpenAIHelper } from '../../libs/openai';
import { XHelper } from '../../libs/x-api';
import { DynamoDBHelper } from '../../libs/dynamodb';
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
 * 投稿ステータスを更新する関数
 */
async function updatePostStatus(
  userId: string,
  postId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
  result?: any
): Promise<void> {
  try {
    let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
    const expressionAttributeNames: any = {
      '#status': 'status'
    };
    const expressionAttributeValues: any = {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    };
    
    if (error) {
      updateExpression += ', #error = :error';
      expressionAttributeNames['#error'] = 'error';
      expressionAttributeValues[':error'] = error;
    }
    
    if (result) {
      updateExpression += ', #result = :result';
      expressionAttributeNames['#result'] = 'result';
      expressionAttributeValues[':result'] = result;
    }
    
    await DynamoDBHelper.updateItem(
      ENV.POST_LOGS_TABLE,
      { userId, postId },
      updateExpression,
      expressionAttributeValues,
      expressionAttributeNames
    );
  } catch (updateError) {
    console.error('Failed to update post status:', updateError);
  }
}

/**
 * エラーログを記録する関数
 */
async function logError(
  userId: string,
  postId: string,
  error: Error,
  context: any = {}
): Promise<void> {
  try {
    const errorLog = {
      userId,
      postId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    console.error('Error logged:', JSON.stringify(errorLog, null, 2));
    
    // エラーログを専用テーブルに保存（テーブルが存在する場合）
    // await DynamoDBHelper.putItem('error-logs', errorLog);
    
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
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
      userId = event.headers?.['X-User-Id'] || 'default-user';
    }
    
    // 投稿IDの生成
    postId = generateUUID().replace(/-/g, '');
    
    // 初期ステータスをpendingで作成
    await updatePostStatus(userId, postId, 'pending');

    // processingステータスに更新
    await updatePostStatus(userId, postId, 'processing');

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

    // 実際にX（旧Twitter）に投稿するかチェック
    const shouldPost = ENV.NODE_ENV === 'production';
    
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
        await logError(userId, postId, xError as Error, { postContent, context });
        
        // X投稿が失敗しても処理は継続
        await updatePostStatus(
          userId, 
          postId, 
          'failed', 
          `X posting failed: ${(xError as Error).message}`,
          { postContent, attemptedPost: true }
        );
      }
    }

    // プロンプトを結合してログ用に保存
    const fullPrompt = `System: ${system}\n\nUser: ${user}`;

    // 投稿ログをDynamoDBに保存
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

    await DynamoDBHelper.putItem(ENV.POST_LOGS_TABLE, postLog);

    // 成功ステータスに更新
    await updatePostStatus(
      userId, 
      postId, 
      xPostId ? 'completed' : 'failed', 
      xPostId ? undefined : (shouldPost ? 'X posting failed' : 'Posting disabled'),
      { xPostId, postContent, context: context.trends }
    );

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
    
    // エラーログを記録
    if (userId && postId) {
      await logError(userId, postId, error, { eventSource: event.source });
      
      // 失敗ステータスに更新
      await updatePostStatus(userId, postId, 'failed', errorMessage);
    }
    
    // EventBridge からの実行の場合
    if (event.source === 'aws.events') {
      throw error;
    }
    
    // API Gateway からの実行の場合
    return internalServerErrorResponse(errorMessage);
  }
};