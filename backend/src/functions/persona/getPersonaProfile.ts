import { APIGatewayProxyEvent, APIGatewayProxyResult, PersonaProfile } from '../../types';
import { MySQLHelper } from '../../libs/mysql';
import { successResponse, internalServerErrorResponse } from '../../libs/response';
import { ENV } from '../../libs/env';

/**
 * 人格プロファイル取得 API
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.headers?.['X-User-Id'] || 
                   event.queryStringParameters?.['userId'] || 
                   'default-user';

    // MySQLから人格プロファイルを取得
    const profile = await MySQLHelper.getItem<PersonaProfile>(
      ENV.PERSONA_PROFILES_TABLE,
      { userId }
    );

    // プロファイルが存在しない場合はデフォルトを返す
    const defaultProfile: PersonaProfile = {
      userId,
      summary: '',
      traits: [],
      commonTopics: [],
      speakingStyle: {
        formality: 50,
        positivity: 50,
        expertise: 50,
        emotionLevel: 50
      },
      lastUpdated: new Date().toISOString(),
      diaryCount: 0
    };

    const response = {
      profile: profile || defaultProfile,
      exists: !!profile
    };

    return successResponse(response);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return internalServerErrorResponse(`Failed to fetch persona profile: ${errorMessage}`);
  }
};