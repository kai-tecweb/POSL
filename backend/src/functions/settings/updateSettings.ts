import { APIGatewayProxyEvent, APIGatewayProxyResult, Settings } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse, corsResponse, validationErrorResponse } from '../../libs/response';
import { getPathParameter, getUserId, isValidSettingType, parseBody } from '../../libs/validation';
import { MySQLHelper } from '../../libs/mysql';
import { ENV } from '../../libs/env';

/**
 * 設定更新 Lambda 関数
 * PUT /settings/{settingType}
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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

    // リクエストボディの解析
    const body = parseBody(event);
    
    // 基本的なバリデーション
    if (!body || typeof body !== 'object') {
      return validationErrorResponse('Request body must be a valid object');
    }

    // 設定タイプ別のバリデーション
    const validationResult = validateSettingData(settingType, body);
    if (!validationResult.isValid) {
      return validationErrorResponse('Invalid setting data', validationResult.errors);
    }

    // TODO: DynamoDB に設定を保存
    try {
      const settingData: Settings = {
        userId,
        settingType: settingType as any,
        data: body,
        updatedAt: new Date().toISOString()
      };

      await MySQLHelper.putItem(ENV.SETTINGS_TABLE, settingData);

      return successResponse(settingData);
    } catch (dbError) {
      console.error('Error saving settings to DynamoDB:', dbError);
      return internalServerErrorResponse('Failed to save settings');
    }

  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    
    return internalServerErrorResponse('Failed to update settings');
  }
};

/**
 * 設定データのバリデーション
 */
function validateSettingData(settingType: string, data: any): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  switch (settingType) {
    case 'post-time':
      if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
        errors.push('enabled must be a boolean');
      }
      if (data.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
        errors.push('time must be in HH:mm format');
      }
      break;

    case 'week-theme':
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of weekdays) {
        if (data[day] !== undefined && typeof data[day] !== 'string') {
          errors.push(`${day} must be a string`);
        }
      }
      break;

    case 'tone':
      const toneFields = ['politeness', 'casualness', 'positivity', 'expertise', 'emotionLevel', 'metaphorUsage', 'emojiUsage'];
      for (const field of toneFields) {
        if (data[field] !== undefined) {
          if (typeof data[field] !== 'number' || data[field] < 0 || data[field] > 100) {
            errors.push(`${field} must be a number between 0 and 100`);
          }
        }
      }
      break;

    case 'event':
      if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
        errors.push('enabled must be a boolean');
      }
      if (data.customEvents !== undefined) {
        if (!Array.isArray(data.customEvents)) {
          errors.push('customEvents must be an array');
        }
      }
      break;

    case 'trend':
      if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
        errors.push('enabled must be a boolean');
      }
      if (data.mixRatio !== undefined) {
        if (typeof data.mixRatio !== 'number' || data.mixRatio < 0 || data.mixRatio > 100) {
          errors.push('mixRatio must be a number between 0 and 100');
        }
      }
      break;

    default:
      // その他の設定タイプでは基本的なチェックのみ
      break;
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : []
  };
}