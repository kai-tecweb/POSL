import { APIGatewayProxyEvent, APIGatewayProxyResult, AudioUploadRequest, AudioUploadResponse, Diary } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse } from '../../libs/response';
import { DynamoDBHelper } from '../../libs/dynamodb';
import { S3Helper } from '../../libs/s3';
import { ENV } from '../../libs/env';

/**
 * Simple UUID v4 generator
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 音声ファイルアップロード用の署名付きURL生成
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDを取得（通常は認証情報から取得）
    const userId = event.pathParameters?.['userId'];
    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    // リクエストボディをパース
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const request: AudioUploadRequest = JSON.parse(event.body);

    // バリデーション
    if (!request.fileName || !request.contentType || !request.fileSize) {
      return errorResponse('fileName, contentType, and fileSize are required', 400);
    }

    // 対応音声フォーマットのチェック
    const supportedFormats = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'audio/ogg'];
    if (!supportedFormats.includes(request.contentType)) {
      return errorResponse(`Unsupported audio format. Supported formats: ${supportedFormats.join(', ')}`, 400);
    }

    // ファイルサイズ制限（50MB）
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (request.fileSize > maxFileSize) {
      return errorResponse('File size exceeds 50MB limit', 400);
    }

    // 新しい日記エントリーのID生成
    const diaryId = generateUUID();
    const timestamp = new Date().toISOString();

    // S3キーの生成
    const fileExtension = request.fileName.split('.').pop() || 'wav';
    const s3Key = `audio/${userId}/${timestamp.replace(/[:.]/g, '-')}-${diaryId}.${fileExtension}`;

    // 署名付きアップロードURLの生成（15分間有効）
    const uploadUrl = await S3Helper.generateUploadUrl(
      ENV.AUDIO_BUCKET,
      s3Key,
      15 * 60, // 15 minutes
      request.contentType
    );

    // DynamoDBに日記エントリーを作成（初期状態）
    const diaryEntry: Diary = {
      userId,
      diaryId,
      originalText: '', // 転写完了後に更新
      s3Key,
      audioFileUrl: '', // 転写完了後に更新
      extractedPersonaTraits: [],
      emotionTags: [],
      createdAt: timestamp,
      transcriptionStatus: 'pending',
      fileSize: request.fileSize
    };

    await DynamoDBHelper.putItem(ENV.DIARIES_TABLE, diaryEntry);

    // レスポンス
    const response: AudioUploadResponse = {
      uploadUrl,
      diaryId,
      s3Key
    };

    return successResponse(response);

  } catch (error: any) {
    return internalServerErrorResponse('Failed to generate upload URL', error);
  }
};