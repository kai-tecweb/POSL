import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { errorResponse, successResponse } from '../../libs/response';
import { XHelper } from '../../libs/x-api';
import { errorLogger } from '../../libs/error-logger';
import { MySQLHelper } from '../../libs/mysql';

// CORS ヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

interface PostTweetRequest {
  text: string;
  userId?: string;
  preview?: boolean;
}

interface PostTweetResponse {
  success: boolean;
  tweetId?: string;
  previewData?: {
    text: string;
    characterCount: number;
    estimatedEngagement?: string;
  };
  error?: string;
}

/**
 * ツイート投稿エンドポイント
 * POST /post/tweet
 */
export const postTweet = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // リクエストボディのパース
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Request body is required',
        }),
      };
    }

    const request: PostTweetRequest = JSON.parse(event.body);

    // 必須パラメータの検証
    if (!request.text) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Tweet text is required',
        }),
      };
    }

    // 文字数チェック
    if (request.text.length > 280) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: `Tweet text exceeds 280 characters (current: ${request.text.length})`,
        }),
      };
    }

    // プレビューモードの場合
    if (request.preview) {
      const previewData = {
        text: request.text,
        characterCount: request.text.length,
        estimatedEngagement: calculateEstimatedEngagement(request.text),
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          previewData,
        }),
      };
    }

    // 実際の投稿実行
    console.log('📤 投稿実行開始:', request.text.substring(0, 50) + '...');
    
    const postResult = await XHelper.postTweet(request.text);

    if (!postResult.success) {
      await errorLogger.error(
        'X投稿失敗',
        'postTweet',
        { 
          error: postResult.error,
          textLength: request.text.length,
          userId: request.userId || 'unknown',
        }
      );

      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: postResult.error || 'Failed to post tweet',
        }),
      };
    }

    // 投稿ログの保存
    if (postResult.tweetId) {
      await savePostLog({
        userId: request.userId || 'default_user',
        tweetId: postResult.tweetId,
        text: request.text,
        success: true,
        postedAt: new Date().toISOString(),
      });
    }

    console.log('✅ 投稿成功:', postResult.tweetId);

    const response: PostTweetResponse = {
      success: true,
      tweetId: postResult.tweetId,
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Post Tweet Error:', error);
    
    await errorLogger.error(
      'ツイート投稿エンドポイントエラー',
      'postTweet',
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};

/**
 * エンゲージメント予測計算（簡易版）
 */
function calculateEstimatedEngagement(text: string): string {
  let score = 0;
  
  // 文字数による評価
  if (text.length >= 100 && text.length <= 200) score += 2;
  else if (text.length >= 50 && text.length <= 250) score += 1;
  
  // 絵文字の有無
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiRegex.test(text)) score += 1;
  
  // 質問形式
  if (text.includes('？') || text.includes('?')) score += 1;
  
  // ポジティブ要素
  const positiveWords = ['ありがとう', '嬉しい', '楽しい', '素晴らしい', '頑張る', '成功'];
  if (positiveWords.some(word => text.includes(word))) score += 1;
  
  // スコアに基づく評価
  if (score >= 4) return '高い';
  if (score >= 2) return '中程度';
  return '低め';
}

/**
 * 投稿ログの保存
 */
async function savePostLog(logData: {
  userId: string;
  tweetId: string;
  text: string;
  success: boolean;
  postedAt: string;
}) {
  try {
    await MySQLHelper.putItem('post_logs', {
      id: `tweet_${logData.tweetId}`,
      user_id: logData.userId,
      tweet_id: logData.tweetId,
      content: logData.text,
      character_count: logData.text.length,
      post_status: logData.success ? 'posted' : 'failed',
      posted_at: logData.postedAt,
      platform: 'twitter',
      engagement_data: JSON.stringify({}),
      created_at: logData.postedAt,
      updated_at: logData.postedAt,
    });

    console.log('📊 投稿ログ保存完了:', logData.tweetId);
  } catch (error) {
    console.error('投稿ログ保存エラー:', error);
    await errorLogger.warning(
      '投稿ログ保存失敗',
      'savePostLog',
      { 
        tweetId: logData.tweetId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
  }
}