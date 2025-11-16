import { APIGatewayProxyEvent, APIGatewayProxyResult, PostLog } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse } from '../../libs/response';
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
 * 投稿生成・実行 Lambda 関数
 * EventBridge から自動実行される、またはAPIから手動実行可能
 */
export const handler = async (
  event: APIGatewayProxyEvent | any
): Promise<APIGatewayProxyResult | any> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // ユーザーIDの取得（APIコール時はヘッダーから、EventBridge実行時は環境変数から）
    let userId: string;
    
    if (event.source === 'aws.events') {
      // EventBridge からの実行
      userId = event.detail?.userId || 'default-user';
    } else {
      // API Gateway からの実行
      userId = event.headers?.['X-User-Id'] || 'default-user';
    }

    // プロンプト生成エンジンを初期化
    const promptEngine = new PromptEngine(userId);

    // 投稿プロンプトを生成
    const { system, user, context } = await promptEngine.generatePrompt();

    // OpenAI GPT-4 で投稿文を生成
    const postContent = await OpenAIHelper.generateText(user, {
      model: 'gpt-4',
      maxTokens: 200,
      temperature: 0.8,
      systemPrompt: system
    });

    // 投稿内容の検証
    if (!postContent || postContent.length > 280) {
      throw new Error('Generated content is invalid or too long');
    }

    let xPostId: string | undefined;

    // 実際にX（旧Twitter）に投稿するかチェック
    const shouldPost = ENV.NODE_ENV === 'production';
    
    if (shouldPost) {
      try {
        // X API で実際に投稿
        const result = await XHelper.postTweet(postContent);
        xPostId = result.tweetId;
      } catch (xError) {
        // X投稿が失敗してもログは保存する
      }
    }

    // プロンプトを結合してログ用に保存
    const fullPrompt = `System: ${system}\n\nUser: ${user}`;

    // 投稿ログをDynamoDBに保存
    const postLog: PostLog = {
      userId,
      postId: generateUUID().replace(/-/g, ''),
      content: postContent,
      timestamp: new Date().toISOString(),
      xPostId: xPostId || '',
      prompt: fullPrompt,
      trendData: context.trends,
      success: !!xPostId,
      ...(xPostId ? {} : { error: 'Posting disabled or failed' })
    };

    await DynamoDBHelper.putItem(ENV.POST_LOGS_TABLE, postLog);

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
        userPrompt: user.substring(0, 200) + '...'
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
    
    // EventBridge からの実行の場合
    if (event.source === 'aws.events') {
      throw error;
    }
    
    // API Gateway からの実行の場合
    return internalServerErrorResponse(errorMessage);
  }
};