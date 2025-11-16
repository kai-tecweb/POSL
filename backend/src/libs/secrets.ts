import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { ENV, isLocal } from './env';

/**
 * Secrets Manager クライアント設定
 */
const createSecretsManagerClient = () => {
  const config: any = {
    region: ENV.REGION,
  };

  // ローカル環境では使用しない（環境変数を直接使用）
  if (!isLocal()) {
    // 本番環境でのCredentialsは Lambda の IAM Role を使用
  }

  return new SecretsManagerClient(config);
};

export const secretsClient = createSecretsManagerClient();

/**
 * Secrets Manager 操作のヘルパー関数
 */
export class SecretsHelper {
  /**
   * シークレットを取得
   */
  static async getSecret(secretId: string): Promise<string> {
    // ローカル環境では環境変数から取得
    if (isLocal()) {
      return this.getSecretFromEnv(secretId);
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretId,
      });

      const response = await secretsClient.send(command);
      
      if (!response.SecretString) {
        throw new Error(`Secret ${secretId} has no string value`);
      }

      return response.SecretString;
    } catch (error) {
      console.error('Secrets Manager Get Secret Error:', error);
      throw new Error(`Failed to get secret: ${secretId}`);
    }
  }

  /**
   * JSONシークレットを取得
   */
  static async getSecretJson<T>(secretId: string): Promise<T> {
    const secretString = await this.getSecret(secretId);
    
    try {
      return JSON.parse(secretString) as T;
    } catch (error) {
      console.error('JSON Parse Error for secret:', secretId, error);
      throw new Error(`Failed to parse secret as JSON: ${secretId}`);
    }
  }

  /**
   * シークレットを作成
   */
  static async createSecret(
    name: string, 
    secretValue: string,
    description?: string
  ): Promise<void> {
    if (isLocal()) {
      console.warn(`Cannot create secret in local environment: ${name}`);
      return;
    }

    try {
      const command = new CreateSecretCommand({
        Name: name,
        SecretString: secretValue,
        Description: description,
      });

      await secretsClient.send(command);
    } catch (error) {
      console.error('Secrets Manager Create Secret Error:', error);
      throw new Error(`Failed to create secret: ${name}`);
    }
  }

  /**
   * シークレットを更新
   */
  static async updateSecret(secretId: string, secretValue: string): Promise<void> {
    if (isLocal()) {
      console.warn(`Cannot update secret in local environment: ${secretId}`);
      return;
    }

    try {
      const command = new UpdateSecretCommand({
        SecretId: secretId,
        SecretString: secretValue,
      });

      await secretsClient.send(command);
    } catch (error) {
      console.error('Secrets Manager Update Secret Error:', error);
      throw new Error(`Failed to update secret: ${secretId}`);
    }
  }

  /**
   * ローカル環境用：環境変数からシークレットを取得
   */
  private static getSecretFromEnv(secretId: string): string {
    const envMapping: Record<string, string> = {
      'posl/openai-api-key': ENV.OPENAI_API_KEY,
      'posl/x-api-key': ENV.X_API_KEY,
      'posl/x-api-secret': ENV.X_API_SECRET,
      'posl/x-access-token': ENV.X_ACCESS_TOKEN,
      'posl/x-access-token-secret': ENV.X_ACCESS_TOKEN_SECRET,
    };

    const value = envMapping[secretId];
    if (!value) {
      throw new Error(`No environment variable mapping for secret: ${secretId}`);
    }

    return value;
  }

  /**
   * POSL専用：OpenAI APIキーを取得
   */
  static async getOpenAIApiKey(): Promise<string> {
    return this.getSecret('posl/openai-api-key');
  }

  /**
   * POSL専用：X API認証情報を取得
   */
  static async getXApiCredentials(): Promise<{
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }> {
    if (isLocal()) {
      return {
        apiKey: ENV.X_API_KEY,
        apiSecret: ENV.X_API_SECRET,
        accessToken: ENV.X_ACCESS_TOKEN,
        accessTokenSecret: ENV.X_ACCESS_TOKEN_SECRET,
      };
    }

    // 本番環境では個別に取得するか、JSON形式で保存されたものを取得
    const [apiKey, apiSecret, accessToken, accessTokenSecret] = await Promise.all([
      this.getSecret('posl/x-api-key'),
      this.getSecret('posl/x-api-secret'),
      this.getSecret('posl/x-access-token'),
      this.getSecret('posl/x-access-token-secret'),
    ]);

    return {
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
    };
  }

  /**
   * POSL専用：X API認証情報をJSONで保存
   */
  static async saveXApiCredentials(credentials: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }): Promise<void> {
    if (isLocal()) {
      console.warn('Cannot save X API credentials in local environment');
      return;
    }

    const credentialsJson = JSON.stringify(credentials);
    await this.updateSecret('posl/x-api-credentials', credentialsJson);
  }

  /**
   * POSL専用：OpenAI APIキーを保存
   */
  static async saveOpenAIApiKey(apiKey: string): Promise<void> {
    if (isLocal()) {
      console.warn('Cannot save OpenAI API key in local environment');
      return;
    }

    await this.updateSecret('posl/openai-api-key', apiKey);
  }
}