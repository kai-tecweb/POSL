import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../types';
// import { SimpleMySQLHelper } from '../../libs/simple-mysql'; // 一時的に無効化
import { successResponse, internalServerErrorResponse } from '../../libs/response';

/**
 * 投稿ログ一覧取得 API (MySQL-First設計)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーID取得
    const userId = event.headers?.['X-User-Id'] || 
                   event.queryStringParameters?.['userId'] || 
                   'demo'; // デフォルトをdemoに変更

    // ページネーション設定
    const limit = Number(event.queryStringParameters?.['limit']) || 50;

    // 🔥 一時的に固定データでテスト（MySQL接続問題の切り分け）
    const posts = [
      {
        userId: userId,
        postId: 'demo-post-1',
        timestamp: '2024-11-17T12:00:00Z',
        content: 'これは生まれ変わったMySQL-First実装のテストです！',
        prompt: 'シンプルで効率的な投稿を生成してください',
        success: true,
        createdAt: '2024-11-17T12:00:00Z'
      },
      {
        userId: userId,
        postId: 'demo-post-2',
        timestamp: '2024-11-17T11:00:00Z',
        content: 'DynamoDB抽象化を完全排除しました 🚀',
        prompt: 'MySQL-Firstの設計について',
        success: true,
        createdAt: '2024-11-17T11:00:00Z'
      }
    ];

    console.log('🚀 MySQL-First implementation working with demo data');

    // SimpleMySQLHelperで投稿ログを取得（後で有効化）
    // const posts = await SimpleMySQLHelper.getPostLogs(userId, limit);

    // レスポンス構築
    const response = {
      success: true,
      posts: posts,
      pagination: {
        count: posts.length,
        limit,
        hasMore: posts.length === limit
      },
      userId
    };

    return successResponse(response);

  } catch (error: any) {
    console.error('getPostLogs Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return internalServerErrorResponse(`Failed to fetch post logs: ${errorMessage}`);
  }
};