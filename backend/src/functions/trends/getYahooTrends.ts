import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../../libs/response';
import { errorLogger } from '../../libs/error-logger';
import { YahooTrends } from '../../libs/trends/yahoo-trends';

interface YahooTrendsRequest {
  category?: string;  // 'all', 'entertainment', 'sports', 'news', etc.
  limit?: number;     // Number of results to return
}

interface YahooTrendsResponse {
  success: boolean;
  data?: {
    category: string;
    trends: Array<{
      rank: number;
      keyword: string;
      searchVolume?: string;
      link?: string;
    }>;
    timestamp: string;
    source: string;
  };
  error?: string;
}

/**
 * Yahoo検索ランキング取得エンドポイント
 * GET /trends/yahoo
 */
export const getYahooTrends = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    const request: YahooTrendsRequest = {
      category: queryParams.category || 'all',
      limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
    };

    console.log('🔍 Yahoo検索ランキング取得開始:', request);

    // Yahoo Trends データの取得
    const trendsData = await YahooTrends.getSearchRanking(
      request.category!,
      request.limit!
    );

    if (!trendsData.success) {
      await errorLogger.error(
        'Yahoo検索ランキング取得失敗',
        'getYahooTrends',
        { 
          error: trendsData.error,
          request,
        }
      );

      return errorResponse(
        'Failed to fetch Yahoo search ranking',
        500,
        trendsData.error
      );
    }

    const response: YahooTrendsResponse = {
      success: true,
      data: {
        category: request.category!,
        trends: trendsData.trends || [],
        timestamp: new Date().toISOString(),
        source: trendsData.source || 'yahoo_search_ranking',
      },
    };

    console.log('✅ Yahoo検索ランキング取得完了:', response.data?.trends.length, '件');

    return successResponse(response.data);

  } catch (error) {
    console.error('Yahoo Trends Error:', error);
    
    await errorLogger.error(
      'Yahoo Trendsエンドポイントエラー',
      'getYahooTrends',
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

    return errorResponse(
      'Internal server error while fetching Yahoo Trends',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};