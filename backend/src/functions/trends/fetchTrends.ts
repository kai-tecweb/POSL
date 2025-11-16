import { APIGatewayProxyEvent, APIGatewayProxyResult, TrendData } from '../../types';
import { successResponse, errorResponse, internalServerErrorResponse, corsResponse } from '../../libs/response';
import { GoogleTrendsHelper } from '../../libs/trends/google-trends';
import { YahooTrendsHelper } from '../../libs/trends/yahoo-trends';

/**
 * トレンド取得 Lambda 関数
 * GET /trends/fetch?source=google|yahoo&region=JP&count=10
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // CORS プリフライト対応
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse();
  }

  try {
    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    const source = queryParams['source'] || 'google';
    const region = queryParams['region'] || 'JP';
    const count = parseInt(queryParams['count'] || '10');

    // バリデーション
    if (!['google', 'yahoo'].includes(source)) {
      return errorResponse('Invalid source parameter. Must be "google" or "yahoo"', 400);
    }

    if (count < 1 || count > 50) {
      return errorResponse('Invalid count parameter. Must be between 1 and 50', 400);
    }

    let trends: TrendData[] = [];

    try {
      // ソース別にトレンドを取得
      switch (source) {
        case 'google':
          trends = await GoogleTrendsHelper.fetchDailyTrends(region, count);
          break;
        case 'yahoo':
          trends = await YahooTrendsHelper.fetchRealtimeTrends(count);
          break;
        default:
          return errorResponse('Unsupported source', 400);
      }

      // レスポンス
      return successResponse({
        source,
        region,
        count: trends.length,
        timestamp: new Date().toISOString(),
        trends
      });

    } catch (apiError) {
      console.error(`Error fetching ${source} trends:`, apiError);
      return errorResponse(`Failed to fetch trends from ${source}`, 503);
    }

  } catch (error) {
    console.error('Error in fetchTrends:', error);
    
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    
    return internalServerErrorResponse('Failed to fetch trends');
  }
};