import { APIGatewayProxyEvent, APIGatewayProxyResult, Diary } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse, notFoundResponse } from '../../libs/response';
import { DynamoDBHelper } from '../../libs/dynamodb';
import { S3Helper } from '../../libs/s3';
import { ENV } from '../../libs/env';

/**
 * 日記エントリーを削除
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDと日記IDを取得
    const userId = event.pathParameters?.['userId'];
    const diaryId = event.pathParameters?.['diaryId'];
    
    if (!userId || !diaryId) {
      return errorResponse('User ID and Diary ID are required', 400);
    }

    // 日記エントリーを取得（削除前に存在確認とS3キー取得）
    const diary = await DynamoDBHelper.getItem(ENV.DIARIES_TABLE, {
      userId,
      diaryId
    }) as Diary | null;

    if (!diary) {
      return notFoundResponse('Diary entry not found');
    }

    // S3から音声ファイルを削除（存在する場合）
    if (diary.s3Key) {
      try {
        await S3Helper.deleteAudioFile(diary.s3Key);
      } catch (error) {
        // S3削除に失敗してもDynamoDBの削除は継続
        // エラーはログのみ出力
      }
    }

    // DynamoDBから日記エントリーを削除
    await DynamoDBHelper.deleteItem(ENV.DIARIES_TABLE, {
      userId,
      diaryId
    });

    return successResponse({
      message: 'Diary deleted successfully',
      deletedDiaryId: diaryId
    });

  } catch (error: any) {
    return internalServerErrorResponse('Failed to delete diary', error);
  }
};