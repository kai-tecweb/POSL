import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../types';
import { internalServerErrorResponse } from '../../libs/response';

/**
 * 投稿テスト API
 * フロントエンドから手動で投稿生成をテストするために使用
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // generateAndPost関数を内部的に呼び出し
    const { handler: generateAndPostHandler } = await import('../scheduler/generateAndPost');
    
    // 手動実行用のイベントを作成（EventBridgeイベントではない）
    const manualEvent = {
      ...event,
      source: undefined // EventBridgeのsourceフィールドを削除
    };

    const result = await generateAndPostHandler(manualEvent);

    return result;

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return internalServerErrorResponse(`Test post failed: ${errorMessage}`);
  }
};