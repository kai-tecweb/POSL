import { APIGatewayProxyEvent, APIGatewayProxyResult, TranscriptionRequest, TranscriptionResponse, Diary } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse, notFoundResponse } from '../../libs/response';
import { DynamoDBHelper } from '../../libs/dynamodb';
import { S3Helper } from '../../libs/s3';
import { OpenAIHelper } from '../../libs/openai';
import { ENV } from '../../libs/env';

/**
 * 音声ファイルの転写処理
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ユーザーIDを取得
    const userId = event.pathParameters?.['userId'];
    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    // リクエストボディをパース
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const request: TranscriptionRequest = JSON.parse(event.body);

    // バリデーション
    if (!request.diaryId || !request.s3Key) {
      return errorResponse('diaryId and s3Key are required', 400);
    }

    // 日記エントリーの取得
    const diaryEntry = await DynamoDBHelper.getItem(ENV.DIARIES_TABLE, {
      userId,
      diaryId: request.diaryId
    }) as Diary | null;

    if (!diaryEntry) {
      return notFoundResponse('Diary entry not found');
    }

    // 既に処理済みの場合は結果を返す
    if (diaryEntry.transcriptionStatus === 'completed' && diaryEntry.originalText) {
      return successResponse({
        diaryId: request.diaryId,
        transcribedText: diaryEntry.originalText,
        confidence: 1.0,
        processingTimeMs: 0
      } as TranscriptionResponse);
    }

    // 処理中の場合
    if (diaryEntry.transcriptionStatus === 'processing') {
      return errorResponse('Transcription is already in progress', 409);
    }

    // 処理ステータスを更新
    await DynamoDBHelper.updateItem(
      ENV.DIARIES_TABLE,
      { userId, diaryId: request.diaryId },
      'SET transcriptionStatus = :status, processedAt = :processedAt',
      {
        ':status': 'processing',
        ':processedAt': new Date().toISOString()
      }
    );

    const startTime = Date.now();

    try {
      // S3から音声ファイルを取得
      const { data: audioData } = await S3Helper.getAudioFile(request.s3Key);

      // OpenAI Whisper APIで転写
      const transcriptionResult = await OpenAIHelper.transcribeAudio(
        audioData,
        {
          language: request.language || 'ja'
        }
      );

      const processingTimeMs = Date.now() - startTime;

      // DynamoDBを更新（転写結果を保存）
      await DynamoDBHelper.updateItem(
        ENV.DIARIES_TABLE,
        { userId, diaryId: request.diaryId },
        'SET originalText = :text, transcriptionStatus = :status, processedAt = :processedAt',
        {
          ':text': transcriptionResult,
          ':status': 'completed',
          ':processedAt': new Date().toISOString()
        }
      );

      // レスポンス
      const response: TranscriptionResponse = {
        diaryId: request.diaryId,
        transcribedText: transcriptionResult,
        confidence: 1.0,
        processingTimeMs
      };

      return successResponse(response);

    } catch (transcriptionError) {
      // 転写に失敗した場合はステータスを更新
      await DynamoDBHelper.updateItem(
        ENV.DIARIES_TABLE,
        { userId, diaryId: request.diaryId },
        'SET transcriptionStatus = :status, processedAt = :processedAt',
        {
          ':status': 'failed',
          ':processedAt': new Date().toISOString()
        }
      );

      throw transcriptionError;
    }

  } catch (error: any) {
    return internalServerErrorResponse('Failed to transcribe audio', error);
  }
};