import { APIGatewayProxyEvent } from '../types';

/**
 * リクエストボディをパースして返す
 */
export const parseBody = <T = any>(event: APIGatewayProxyEvent): T => {
  if (!event.body) {
    throw new Error('Request body is required');
  }
  
  try {
    return JSON.parse(event.body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
};

/**
 * パスパラメータを取得
 */
export const getPathParameter = (
  event: APIGatewayProxyEvent,
  name: string
): string => {
  const value = event.pathParameters?.[name];
  if (!value) {
    throw new Error(`Path parameter '${name}' is required`);
  }
  return value;
};

/**
 * クエリパラメータを取得
 */
export const getQueryParameter = (
  event: APIGatewayProxyEvent,
  name: string,
  defaultValue?: string
): string | undefined => {
  const value = event.queryStringParameters?.[name];
  return value || defaultValue;
};

/**
 * 必須クエリパラメータを取得
 */
export const getRequiredQueryParameter = (
  event: APIGatewayProxyEvent,
  name: string
): string => {
  const value = event.queryStringParameters?.[name];
  if (!value) {
    throw new Error(`Query parameter '${name}' is required`);
  }
  return value;
};

/**
 * ヘッダーを取得
 */
export const getHeader = (
  event: APIGatewayProxyEvent,
  name: string
): string | undefined => {
  return event.headers[name] || event.headers[name.toLowerCase()];
};

/**
 * Authorization ヘッダーからベアラートークンを取得
 */
export const getBearerToken = (event: APIGatewayProxyEvent): string => {
  const authHeader = getHeader(event, 'Authorization');
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }
  
  const match = authHeader.match(/Bearer (.+)/);
  if (!match) {
    throw new Error('Invalid authorization header format');
  }
  
  return match[1];
};

/**
 * ユーザーIDを取得（認証実装後に使用）
 */
export const getUserId = (_event: APIGatewayProxyEvent): string => {
  // 現在は固定値、将来的にはJWTトークンから取得
  return 'default-user';
};

/**
 * メールアドレスのバリデーション
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 文字列が空かどうかチェック
 */
export const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === '';
};

/**
 * 必須フィールドのバリデーション
 */
export const validateRequired = (data: any, fields: string[]): string[] => {
  const errors: string[] = [];
  
  for (const field of fields) {
    if (isEmpty(data[field])) {
      errors.push(`Field '${field}' is required`);
    }
  }
  
  return errors;
};

/**
 * 日付形式（YYYY-MM-DD）のバリデーション
 */
export const isValidDate = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * 時刻形式（HH:mm）のバリデーション
 */
export const isValidTime = (timeString: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * 数値範囲のバリデーション
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * 設定タイプのバリデーション
 */
export const isValidSettingType = (settingType: string): boolean => {
  const validTypes = [
    'post-time',
    'week-theme', 
    'event',
    'trend',
    'tone',
    'template',
    'prompt',
    'x-auth'
  ];
  return validTypes.includes(settingType);
};