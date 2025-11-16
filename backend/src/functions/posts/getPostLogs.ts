import { APIGatewayProxyEvent, APIGatewayProxyResult, PostLog } from '../../types';
import { DynamoDBHelper } from '../../libs/dynamodb';
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

    // DynamoDBからデータを取得
    const posts = await DynamoDBHelper.query<PostLog>(
      ENV.POST_LOGS_TABLE,
      'userId = :userId',
      { ':userId': userId },
      undefined, // indexName
      undefined, // expressionAttributeNames
      limit,
      false // scanIndexForward (最新順)
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