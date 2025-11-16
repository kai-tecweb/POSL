/**
 * 環境変数を安全に取得するヘルパー関数
 */

export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue || '';
};

export const getEnvVarAsNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const numValue = Number(value || defaultValue);
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return numValue;
};

export const getEnvVarAsBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  if (!value) return defaultValue!;
  return value.toLowerCase() === 'true';
};

// 環境変数の定数
export const ENV = {
  STAGE: getEnvVar('STAGE', 'local'),
  REGION: getEnvVar('REGION', 'ap-northeast-1'),
  
  // DynamoDB テーブル名
  USERS_TABLE: getEnvVar('USERS_TABLE', 'posl-users-local'),
  SETTINGS_TABLE: getEnvVar('SETTINGS_TABLE', 'posl-settings-local'),
  POST_LOGS_TABLE: getEnvVar('POST_LOGS_TABLE', 'posl-post-logs-local'),
  DIARIES_TABLE: getEnvVar('DIARIES_TABLE', 'posl-diaries-local'),
  PERSONA_PROFILES_TABLE: getEnvVar('PERSONA_PROFILES_TABLE', 'posl-persona-profiles-local'),
  
  // S3 バケット
  AUDIO_BUCKET: getEnvVar('AUDIO_BUCKET', 'posl-audio-bucket-local'),
  
  // 外部API
  OPENAI_API_KEY: getEnvVar('OPENAI_API_KEY', 'dummy_key'),
  X_API_KEY: getEnvVar('X_API_KEY', 'dummy_key'),
  X_API_SECRET: getEnvVar('X_API_SECRET', 'dummy_secret'),
  X_ACCESS_TOKEN: getEnvVar('X_ACCESS_TOKEN', 'dummy_token'),
  X_ACCESS_TOKEN_SECRET: getEnvVar('X_ACCESS_TOKEN_SECRET', 'dummy_token_secret'),
  
  // AWS エンドポイント（ローカル開発用）
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
  S3_ENDPOINT_URL: process.env.S3_ENDPOINT_URL,
  
  // MySQL データベース設定
  MYSQL_HOST: getEnvVar('MYSQL_HOST', 'localhost'),
  MYSQL_PORT: getEnvVar('MYSQL_PORT', '3306'),
  MYSQL_USER: getEnvVar('MYSQL_USER', 'root'),
  MYSQL_PASSWORD: getEnvVar('MYSQL_PASSWORD', 'password'),
  MYSQL_DATABASE: getEnvVar('MYSQL_DATABASE', 'posl_db'),
  
  // その他
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
} as const;

export const isLocal = () => ENV.STAGE === 'local';
export const isDev = () => ENV.STAGE === 'dev';
export const isProd = () => ENV.STAGE === 'prod';
export const isProduction = () => ENV.NODE_ENV === 'production';