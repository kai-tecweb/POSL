import { APIGatewayProxyResult } from '../types';

// CORS ヘッダー
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * 成功レスポンス
 */
export const successResponse = (
  data: any,
  statusCode: number = 200
): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: true,
    data,
  }),
});

/**
 * エラーレスポンス
 */
export const errorResponse = (
  message: string,
  statusCode: number = 400,
  error?: string
): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: false,
    error: error || 'Error',
    message,
  }),
});

/**
 * バリデーションエラーレスポンス
 */
export const validationErrorResponse = (
  message: string,
  details?: any
): APIGatewayProxyResult => ({
  statusCode: 422,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: false,
    error: 'ValidationError',
    message,
    details,
  }),
});

/**
 * 認証エラーレスポンス
 */
export const unauthorizedResponse = (
  message: string = 'Unauthorized'
): APIGatewayProxyResult => ({
  statusCode: 401,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: false,
    error: 'Unauthorized',
    message,
  }),
});

/**
 * 404エラーレスポンス
 */
export const notFoundResponse = (
  message: string = 'Not Found'
): APIGatewayProxyResult => ({
  statusCode: 404,
  headers: CORS_HEADERS,
  body: JSON.stringify({
    success: false,
    error: 'NotFound',
    message,
  }),
});

/**
 * サーバーエラーレスポンス
 */
export const internalServerErrorResponse = (
  message: string = 'Internal Server Error',
  error?: any
): APIGatewayProxyResult => {
  // 本番環境では詳細なエラー情報は隠す
  const isProduction = process.env.NODE_ENV === 'production';
  const responseBody = {
    success: false,
    error: 'InternalServerError',
    message: isProduction ? 'An internal server error occurred' : message,
    ...(isProduction ? {} : { details: error }),
  };

  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify(responseBody),
  };
};

/**
 * CORS プリフライトレスポンス
 */
export const corsResponse = (): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: CORS_HEADERS,
  body: '',
});