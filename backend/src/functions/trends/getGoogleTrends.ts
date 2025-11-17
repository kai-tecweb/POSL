import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../libs/response';
import { errorLogger } from '../../libs/error-logger';
import { GoogleTrends } from '../../libs/trends/google-trends';

interface GoogleTrendsRequest {
  timeframe?: string;  // 'today 1-m', 'today 3-m', 'today 12-m', etc.
  geo?: string;        // 'JP' for Japan
  category?: number;   // Category ID (0 for all)
  limit?: number;      // Number of results to return
}

interface GoogleTrendsResponse {
  success: boolean;
  data?: {
    timeframe: string;
    geo: string;
    trends: Array<{
      query: string;
      value: number;
      formattedValue: string;
      link?: string;
    }>;
    timestamp: string;
  };
  error?: string;
}

/**
 * Google Trends データ取得エンドポイント
 * GET /trends/google
 */
export const getGoogleTrends = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    const request: GoogleTrendsRequest = {
      timeframe: queryParams.timeframe || 'today 1-m',
      geo: queryParams.geo || 'JP',
      category: queryParams.category ? parseInt(queryParams.category) : 0,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
    };

    console.log('📈 Google Trends データ取得開始:', request);

    // Google Trends データの取得
    const trendsData = await GoogleTrends.getTrendingSearches(
      request.timeframe!,
      request.geo!,
      request.category!,
      request.limit!
    );

    if (!trendsData.success) {
      await errorLogger.error(
        'Google Trends API呼び出し失敗',
        'getGoogleTrends',
        { 
          error: trendsData.error,
          request,
        }
      );

      return errorResponse(
        'Failed to fetch Google Trends data',
        500,
        trendsData.error
      );
    }

    const response: GoogleTrendsResponse = {
      success: true,
      data: {
        timeframe: request.timeframe!,
        geo: request.geo!,
        trends: trendsData.trends || [],
        timestamp: new Date().toISOString(),
      },
    };

    console.log('✅ Google Trends データ取得完了:', response.data?.trends.length, '件');

    return successResponse(response.data);

  } catch (error) {
    console.error('Google Trends Error:', error);
    
    await errorLogger.error(
      'Google Trendsエンドポイントエラー',
      'getGoogleTrends',
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    return errorResponse(
      'Internal server error while fetching Google Trends',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};