import { APIGatewayProxyEvent, APIGatewayProxyResult, PostLog } from '../../types';
import { MySQLHelper } from '../../libs/mysql';
import { successResponse, internalServerErrorResponse } from '../../libs/response';
import { ENV } from '../../libs/env';

/**
 * 投稿ログ一覧取得 API
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーID取得（ヘッダーまたはクエリパラメータから）
    const userId = event.headers?.['X-User-Id'] || 
                   event.queryStringParameters?.['userId'] || 
                   'default-user';

    // ページネーション設定
    const limit = Number(event.queryStringParameters?.['limit']) || 50;

    // MySQLからデータを取得
    const posts = await MySQLHelper.query<PostLog>(
      'post_logs',
      { userId: userId },
      { limit, orderBy: { createdAt: 'DESC' } }
    );

    // レスポンス構築
    const response = {
      posts: posts,
      pagination: {
        count: posts.length,
        limit
      },
      userId
    };

    return successResponse(response);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return internalServerErrorResponse(`Failed to fetch post logs: ${errorMessage}`);
  }
};