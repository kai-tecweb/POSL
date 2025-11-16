import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse, corsResponse } from '../../libs/response';
import { getPathParameter, getUserId, isValidSettingType } from '../../libs/validation';

/**
 * 設定取得 Lambda 関数
 * GET /settings/{settingType}
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // CORS プリフライト対応
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    // パスパラメータの取得とバリデーション
    const settingType = getPathParameter(event, 'settingType');
    
    if (!isValidSettingType(settingType)) {
      return errorResponse('Invalid setting type', 400);
    }

    const userId = getUserId(event);

    // TODO: DynamoDB から設定を取得
    // 現在はモックデータを返す
    const mockSettings = {
      'post-time': {
        enabled: true,
        time: '20:00',
        timezone: 'Asia/Tokyo'
      },
      'week-theme': {
        monday: '月曜日は新しいスタート！',
        tuesday: '火曜日は学びの日',
        wednesday: '水曜日は振り返りの日',
        thursday: '木曜日はトレンドを追いかけよう',
        friday: '金曜日は週末に向けて',
        saturday: '土曜日は自由な発想で',
        sunday: '日曜日はリラックス'
      },
      'tone': {
        politeness: 70,
        casualness: 60,
        positivity: 80,
        expertise: 50,
        emotionLevel: 70,
        metaphorUsage: 30,
        emojiUsage: 50
      }
    };

    const data = mockSettings[settingType as keyof typeof mockSettings] || {};

    return successResponse({
      settingType,
      userId,
      data
    });

  } catch (error) {
    console.error('Error in getSettings:', error);
    
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    
    return internalServerErrorResponse('Failed to retrieve settings');
  }
};