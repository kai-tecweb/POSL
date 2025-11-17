import { APIGatewayProxyEvent, APIGatewayProxyResult, Diary } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse } from '../../libs/response';
import { MySQLHelper } from '../../libs/mysql';
import { S3Helper } from '../../libs/s3';
import { ENV } from '../../libs/env';

/**
 * ユーザーの日記一覧を取得
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDを取得
    const userId = event.pathParameters?.['userId'];
    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams['limit'] || '10', 10);
    const status = queryParams['status']; // pending, processing, completed, failed

    // 日記一覧を取得（MySQLのscanを使用）
    const diaryItems = await MySQLHelper.scan<Diary>(
      ENV.DIARIES_TABLE,
      'userId = :userId',
      {
        ':userId': userId,
        ...(status && { ':status': status })
      },
      undefined,
      limit
    );

    // ステータスでフィルタリング（必要に応じて）
    const filteredDiaries = status 
      ? diaryItems.filter(diary => diary.transcriptionStatus === status)
      : diaryItems;

    // 作成日時の降順でソート
    const sortedDiaries = filteredDiaries.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // レスポンスに音声ファイルのダウンロードURLを追加
    const diariesWithUrls = await Promise.all(
      sortedDiaries.map(async (diary) => {
        if (diary.s3Key && diary.transcriptionStatus !== 'failed') {
          try {
            const audioUrl = await S3Helper.generateDownloadUrl(
              ENV.AUDIO_BUCKET,
              diary.s3Key,
              3600 // 1時間有効
            );
            return { ...diary, audioFileUrl: audioUrl };
          } catch (error) {
            // 音声ファイルが見つからない場合はそのまま返す
            return diary;
          }
        }
        return diary;
      })
    );

    const response = {
      diaries: diariesWithUrls,
      count: diariesWithUrls.length
    };

    return successResponse(response);

  } catch (error: any) {
    return internalServerErrorResponse('Failed to get diaries', error);
  }
};