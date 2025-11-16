/**
 * Jest セットアップファイル
 * テスト実行前の共通設定
 */

// Jest タイムアウトの設定
jest.setTimeout(10000);

// 環境変数のモック設定
process.env = {
  ...process.env,
  // テスト用環境変数
  NODE_ENV: 'test',
  STAGE: 'test',
  REGION: 'ap-northeast-1',
  USERS_TABLE: 'posl-users-test',
  SETTINGS_TABLE: 'posl-settings-test',
  POST_LOGS_TABLE: 'posl-post-logs-test',
  DIARIES_TABLE: 'posl-diaries-test',
  PERSONA_PROFILES_TABLE: 'posl-persona-profiles-test',
  AUDIO_BUCKET: 'posl-audio-bucket-test',
  OPENAI_API_KEY: 'test-openai-key',
  X_API_KEY: 'test-x-key',
  X_API_SECRET: 'test-x-secret',
  X_ACCESS_TOKEN: 'test-x-token',
  X_ACCESS_TOKEN_SECRET: 'test-x-token-secret'
};

// グローバルモック設定
global.console = {
  ...console,
  // テスト実行中のログを抑制（必要に応じて）
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Date のモック設定用ヘルパー
(global as any).mockDate = (dateString: string) => {
  const fixedDate = new Date(dateString);
  jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());
  jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);
};

// Date モックのクリア用ヘルパー
(global as any).clearDateMock = () => {
  jest.spyOn(Date, 'now').mockRestore();
  jest.spyOn(global, 'Date').mockRestore();
};