import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../types';
import { successResponse, internalServerErrorResponse } from '../../libs/response';

/**
 * テスト用API - 完全にクリーンな実装
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.['userId'] || 'demo';
    
    const testData = {
      success: true,
      message: '🚀 MySQL-First 生まれ変わり成功！',
      userId: userId,
      posts: [
        {
          userId: userId,
          postId: 'clean-test-1',
          timestamp: new Date().toISOString(),
          content: 'DynamoDB抽象化を完全排除した新実装です！',
          prompt: 'クリーンなアーキテクチャ',
          success: true
        }
      ],
      environment: 'clean-mysql-first'
    };

    return successResponse(testData);

  } catch (error: any) {
    console.error('Clean test error:', error);
    return internalServerErrorResponse(`Clean test failed: ${error.message}`);
  }
};