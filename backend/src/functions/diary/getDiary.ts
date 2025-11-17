import { APIGatewayProxyEvent, APIGatewayProxyResult, Diary } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse, notFoundResponse } from '../../libs/response';
import { MySQLHelper } from '../../libs/mysql';
import { S3Helper } from '../../libs/s3';
import { ENV } from '../../libs/env';

/**
 * 特定の日記エントリーを取得
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDと日記IDを取得
    const userId = event.pathParameters?.['userId'];
    const diaryId = event.pathParameters?.['diaryId'];
    
    if (!userId || !diaryId) {
      return errorResponse('User ID and Diary ID are required', 400);
    }

    // 日記エントリーを取得
    const diary = await MySQLHelper.getItem(ENV.DIARIES_TABLE, {
      userId,
      diaryId
    }) as Diary | null;

    if (!diary) {
      return notFoundResponse('Diary entry not found');
    }

    // 音声ファイルのダウンロードURLを生成（存在する場合）
    let diaryWithUrl = { ...diary };
    if (diary.s3Key && diary.transcriptionStatus !== 'failed') {
      try {
        const audioUrl = await S3Helper.generateDownloadUrl(
          ENV.AUDIO_BUCKET,
          diary.s3Key,
          3600 // 1時間有効
        );
        diaryWithUrl.audioFileUrl = audioUrl;
      } catch (error) {
        // 音声ファイルが見つからない場合はエラーログのみ
        console.error(`Failed to generate download URL for ${diary.s3Key}:`, error);
      }
    }

    return successResponse(diaryWithUrl);

  } catch (error: any) {
    return internalServerErrorResponse('Failed to get diary', error);
  }
};