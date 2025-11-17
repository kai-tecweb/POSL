import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../libs/response';
import { errorLogger } from '../../libs/error-logger';
import { OpenAIHelper } from '../../libs/openai';
import { MySQLHelper } from '../../libs/mysql';
import { S3Helper } from '../../libs/s3';
import * as fs from 'fs';
import * as path from 'path';

interface TranscribeAudioRequest {
  audioFile?: string;  // Base64 encoded audio file
  audioUrl?: string;   // URL to audio file
  userId: string;
  diaryId?: string;    // Optional diary ID to associate with
  language?: string;   // Language code (e.g., 'ja', 'en')
}

interface TranscribeAudioResponse {
  success: boolean;
  data?: {
    transcription: string;
    diaryId: string;
    audioFileUrl?: string;
    confidence?: number;
    processingTime: number;
  };
  error?: string;
}

/**
 * 音声文字起こしエンドポイント
 * POST /diary/transcribe
 */
export const transcribeAudio = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();

  try {
    // リクエストボディの解析
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }

    const request: TranscribeAudioRequest = JSON.parse(event.body);

    // 必須パラメータの検証
    if (!request.userId) {
      return errorResponse('User ID is required', 400);
    }

    if (!request.audioFile && !request.audioUrl) {
      return errorResponse('Audio file or audio URL is required', 400);
    }

    console.log('🎤 音声文字起こし開始:', {
      userId: request.userId,
      diaryId: request.diaryId,
      hasAudioFile: !!request.audioFile,
      hasAudioUrl: !!request.audioUrl,
    });

    // 音声ファイルの処理
    let audioFilePath: string;
    let audioFileUrl: string | undefined;

    if (request.audioFile) {
      // Base64エンコードされた音声データの処理
      const result = await processBase64Audio(request.audioFile, request.userId);
      audioFilePath = result.filePath;
      audioFileUrl = result.s3Url;
    } else if (request.audioUrl) {
      // URL経由の音声ファイルの処理
      audioFilePath = await downloadAudioFromUrl(request.audioUrl, request.userId);
    } else {
      throw new Error('No valid audio source provided');
    }

    // Whisper APIによる文字起こし実行
    const transcriptionText = await OpenAIHelper.transcribeAudio(audioFilePath, {
      language: request.language || 'ja',
    });

    if (!transcriptionText || transcriptionText.trim().length === 0) {
      await errorLogger.error(
        'Whisper API文字起こし失敗（空のテキスト）',
        'transcribeAudio',
        { 
          userId: request.userId,
        }
      );

      return errorResponse(
        'Failed to transcribe audio: empty result',
        500
      );
    }

    // 日記データの保存
    const diaryId = request.diaryId || generateDiaryId();
    await saveDiaryWithTranscription({
      diaryId,
      userId: request.userId,
      transcription: transcriptionText,
      audioFileUrl,
      confidence: 1.0, // OpenAI Whisperはconfidenceスコアを返さないため固定値
    });

    // 一時ファイルのクリーンアップ
    if (fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }

    const processingTime = Date.now() - startTime;

    const response: TranscribeAudioResponse = {
      success: true,
      data: {
        transcription: transcriptionText,
        diaryId,
        audioFileUrl,
        confidence: 1.0,
        processingTime,
      },
    };

    console.log('✅ 音声文字起こし完了:', {
      diaryId,
      textLength: transcriptionText.length,
      processingTime: `${processingTime}ms`,
    });

    return successResponse(response.data);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Transcribe Audio Error:', error);
    
    await errorLogger.error(
      '音声文字起こしエンドポイントエラー',
      'transcribeAudio',
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    return errorResponse(
      'Internal server error during audio transcription',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};

// 既存のhandler関数も維持（互換性のため）
export const handler = transcribeAudio;

/**
 * Base64エンコードされた音声データの処理
 */
async function processBase64Audio(
  base64Data: string,
  userId: string
): Promise<{ filePath: string; s3Url: string }> {
  // Base64データからファイルタイプを判定
  const matches = base64Data.match(/^data:audio\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid audio file format');
  }

  const fileExtension = matches[1];
  const audioData = matches[2];

  // 一時ファイルに保存
  const tempFileName = `audio_${Date.now()}.${fileExtension}`;
  const tempFilePath = path.join('/tmp', tempFileName);
  
  const audioBuffer = Buffer.from(audioData, 'base64');
  fs.writeFileSync(tempFilePath, audioBuffer);

  // S3にアップロード
  const s3Key = `audio/${userId}/${tempFileName}`;
  
  try {
    await S3Helper.uploadObject(
      process.env.AUDIO_BUCKET || 'posl-audio-bucket',
      s3Key,
      audioBuffer,
      `audio/${fileExtension}`,
      {
        userId,
        uploadedAt: new Date().toISOString(),
      }
    );

    // S3 URL を生成（簡易版）
    const s3Url = `https://${process.env.AUDIO_BUCKET || 'posl-audio-bucket'}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${s3Key}`;

    return {
      filePath: tempFilePath,
      s3Url,
    };

  } catch (error) {
    throw new Error(`Failed to upload audio to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * URL経由の音声ファイルのダウンロード
 */
async function downloadAudioFromUrl(
  audioUrl: string,
  userId: string
): Promise<string> {
  // URL からファイルをダウンロード（実装簡略化）
  // 実際の実装では適切なHTTPクライアントとエラーハンドリングが必要
  const tempFileName = `audio_${Date.now()}.wav`;
  const tempFilePath = path.join('/tmp', tempFileName);
  
  // モック実装：実際にはaxiosでダウンロード
  throw new Error('URL audio download not implemented yet');
  
  // 実装例:
  // const response = await axios.get(audioUrl, { responseType: 'stream' });
  // const writer = fs.createWriteStream(tempFilePath);
  // response.data.pipe(writer);
  // return tempFilePath;
}

/**
 * 日記データの保存
 */
async function saveDiaryWithTranscription(data: {
  diaryId: string;
  userId: string;
  transcription: string;
  audioFileUrl?: string;
  confidence?: number;
}): Promise<void> {
  const now = new Date().toISOString();

  await MySQLHelper.putItem('diaries', {
    id: data.diaryId,
    user_id: data.userId,
    title: generateDiaryTitle(data.transcription),
    content: data.transcription,
    audio_file_url: data.audioFileUrl || null,
    transcription_confidence: data.confidence || null,
    entry_type: 'voice',
    created_at: now,
    updated_at: now,
  });
}

/**
 * 日記IDの生成
 */
function generateDiaryId(): string {
  return `diary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 文字起こしテキストから日記タイトルを生成
 */
function generateDiaryTitle(transcription: string): string {
  // 最初の30文字程度を取得してタイトルにする
  const title = transcription.substring(0, 30).replace(/\n/g, ' ').trim();
  return title || '音声日記';
}