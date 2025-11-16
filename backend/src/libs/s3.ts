import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV, isLocal } from './env';

/**
 * S3 クライアント設定
 */
const createS3Client = () => {
  const config: any = {
    region: ENV.REGION,
  };

  // ローカル環境の場合はMinIOエンドポイントを設定
  if (isLocal() && ENV.S3_ENDPOINT_URL) {
    config.endpoint = ENV.S3_ENDPOINT_URL;
    config.forcePathStyle = true;
    config.credentials = {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin123',
    };
  }

  return new S3Client(config);
};

export const s3Client = createS3Client();

/**
 * S3 操作のヘルパー関数
 */
export class S3Helper {
  /**
   * オブジェクトをアップロード
   */
  static async uploadObject(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload object to S3: ${bucket}/${key}`);
    }
  }

  /**
   * オブジェクトをダウンロード
   */
  static async getObject(bucket: string, key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      // ストリームをBufferに変換
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('S3 Get Object Error:', error);
      throw new Error(`Failed to get object from S3: ${bucket}/${key}`);
    }
  }

  /**
   * オブジェクトを削除
   */
  static async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error('S3 Delete Object Error:', error);
      throw new Error(`Failed to delete object from S3: ${bucket}/${key}`);
    }
  }

  /**
   * オブジェクトの存在確認
   */
  static async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      // オブジェクトが存在しない場合
      return false;
    }
  }

  /**
   * オブジェクトのメタデータを取得
   */
  static async getObjectMetadata(
    bucket: string,
    key: string
  ): Promise<{ contentType?: string; contentLength?: number; metadata?: Record<string, string> }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      return {
        contentType: response.ContentType || undefined,
        contentLength: response.ContentLength || undefined,
        metadata: response.Metadata || undefined,
      };
    } catch (error) {
      console.error('S3 Get Metadata Error:', error);
      throw new Error(`Failed to get metadata from S3: ${bucket}/${key}`);
    }
  }

  /**
   * プリサインドURLを生成（アップロード用）
   */
  static async generateUploadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
    contentType?: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('S3 Generate Upload URL Error:', error);
      throw new Error(`Failed to generate upload URL for S3: ${bucket}/${key}`);
    }
  }

  /**
   * プリサインドURLを生成（ダウンロード用）
   */
  static async generateDownloadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('S3 Generate Download URL Error:', error);
      throw new Error(`Failed to generate download URL for S3: ${bucket}/${key}`);
    }
  }

  /**
   * 音声ファイル専用のアップロード（POSL用）
   */
  static async uploadAudioFile(
    userId: string,
    diaryId: string,
    audioData: Buffer,
    originalFileName: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = originalFileName.split('.').pop() || 'wav';
    const key = `audio/${userId}/${timestamp}-${diaryId}.${fileExtension}`;

    await this.uploadObject(
      ENV.AUDIO_BUCKET,
      key,
      audioData,
      `audio/${fileExtension}`,
      {
        userId,
        diaryId,
        originalFileName,
        uploadedAt: new Date().toISOString(),
      }
    );

    return key;
  }

  /**
   * 音声ファイルの取得（POSL用）
   */
  static async getAudioFile(key: string): Promise<{ data: Buffer; metadata: any }> {
    const data = await this.getObject(ENV.AUDIO_BUCKET, key);
    const metadata = await this.getObjectMetadata(ENV.AUDIO_BUCKET, key);
    
    return { data, metadata };
  }

  /**
   * 音声ファイルの削除（POSL用）
   */
  static async deleteAudioFile(key: string): Promise<void> {
    await this.deleteObject(ENV.AUDIO_BUCKET, key);
  }
}