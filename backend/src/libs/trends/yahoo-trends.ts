import axios from 'axios';
// import * as cheerio from 'cheerio'; // 一時的にコメントアウト

interface YahooTrendsResult {
  success: boolean;
  trends?: Array<{
    rank: number;
    keyword: string;
    searchVolume?: string;
    link?: string;
  }>;
  source?: string;
  error?: string;
}

interface TrendData {
  keyword: string;
  rank: number;
  category: string;
  trafficVolume: number;
  region: string;
}

/**
 * Yahoo検索ランキング取得クラス
 * Yahoo検索ランキングページをスクレイピングしてトレンドデータを取得
 */
export class YahooTrends {
  private static readonly YAHOO_SEARCH_URL = 'https://search.yahoo.co.jp/';
  private static readonly YAHOO_RANKING_URL = 'https://www.yahoo.co.jp/';

  /**
   * Yahoo検索ランキングの取得
   */
  static async getSearchRanking(
    category: string = 'all',
    limit: number = 20
  ): Promise<YahooTrendsResult> {
    try {
      // 実際のスクレイピングではなく、モックデータを使用（開発環境）
      // 本番環境では適切なスクレイピングまたはAPIを使用
      const mockTrends = this.generateMockYahooTrends(category, limit);
      
      return {
        success: true,
        trends: mockTrends,
        source: 'yahoo_mock_data',
      };

    } catch (error) {
      console.error('Yahoo Trends Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * モックデータ生成（開発用）
   */
  private static generateMockYahooTrends(
    category: string,
    limit: number
  ): Array<{ rank: number; keyword: string; searchVolume?: string; link?: string }> {
    // カテゴリ別のトレンドキーワード
    const trendsByCategory: { [key: string]: string[] } = {
      all: [
        '天気予報', 'ニュース速報', 'コロナウイルス', '株価', 'スポーツ結果',
        '芸能ニュース', '映画情報', 'アニメ', 'ゲーム', '音楽ランキング',
        '旅行', 'グルメ', 'ファッション', '健康', '美容',
        'AI技術', 'Python', 'JavaScript', '副業', '投資'
      ],
      entertainment: [
        '映画', 'ドラマ', 'アニメ', 'バラエティ', '音楽',
        '芸能人', 'アイドル', 'コンサート', '舞台', 'イベント'
      ],
      sports: [
        '野球', 'サッカー', 'バスケ', 'テニス', 'ゴルフ',
        'オリンピック', 'ワールドカップ', 'プロ野球', 'Jリーグ', 'NBA'
      ],
      news: [
        '政治', '経済', '国際', '社会', '事件',
        '災害', '天気', '交通', '選挙', '政策'
      ],
      technology: [
        'AI', 'ChatGPT', 'iPhone', 'Android', 'Windows',
        'プログラミング', 'Python', 'JavaScript', 'React', 'AWS'
      ]
    };

    const keywords = trendsByCategory[category] || trendsByCategory.all;
    const trends: Array<{ rank: number; keyword: string; searchVolume?: string; link?: string }> = [];

    for (let i = 0; i < Math.min(limit, keywords.length); i++) {
      const keyword = keywords[i];
      trends.push({
        rank: i + 1,
        keyword,
        searchVolume: `${Math.floor(Math.random() * 100000 + 10000).toLocaleString()}回`,
        link: `https://search.yahoo.co.jp/search?p=${encodeURIComponent(keyword)}`
      });
    }

    return trends;
  }

  /**
   * 実際のスクレイピング実装（本番用）
   * 注意: この実装は利用規約を遵守し、適切なレート制限を設ける必要がある
   * 現在はモックデータのみを使用
   */
  private static async scrapeYahooRanking(): Promise<YahooTrendsResult> {
    // スクレイピング機能は開発環境では無効化
    // 本番環境では適切なAPI利用またはスクレイピングサービスを使用
    return {
      success: false,
      error: 'Scraping disabled in development environment',
    };

    /* 本番環境用のスクレイピング実装例
    try {
      // Yahoo検索ランキングページの取得
      const response = await axios.get(this.YAHOO_RANKING_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; POSL-bot/1.0)',
        },
        timeout: 10000,
      });

      // HTMLをパース（cheerio使用）
      const $ = require('cheerio').load(response.data);
      const trends: Array<{ rank: number; keyword: string; link?: string }> = [];

      // Yahoo検索ランキングの要素を抽出
      $('.ranking-item').each((index, element) => {
        const keyword = $(element).find('.keyword').text().trim();
        const link = $(element).find('a').attr('href');

        if (keyword) {
          trends.push({
            rank: index + 1,
            keyword,
            link: link || undefined,
          });
        }
      });

      return {
        success: true,
        trends,
        source: 'yahoo_scraping',
      };

    } catch (error) {
      console.error('Yahoo scraping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
    */
  }
}

// 既存のヘルパークラスも維持（互換性のため）
export class YahooTrendsHelper {
  /**
   * リアルタイムトレンドを取得
   */
  static async fetchRealtimeTrends(count: number = 10): Promise<TrendData[]> {
    try {
      // 実際のAPI実装では、Yahoo Realtime Search APIやスクレイピングサービスを利用
      
      // 開発用のモックデータ
      const mockTrends: TrendData[] = [
        {
          keyword: 'Yahoo注目ワード1',
          rank: 1,
          category: 'ニュース',
          trafficVolume: 60000,
          region: 'JP'
        },
        {
          keyword: 'Yahoo注目ワード2',
          rank: 2,
          category: 'エンターテイメント',
          trafficVolume: 55000,
          region: 'JP'
        },
        {
          keyword: 'Yahoo注目ワード3',
          rank: 3,
          category: 'スポーツ',
          trafficVolume: 48000,
          region: 'JP'
        },
        {
          keyword: 'Yahoo注目ワード4',
          rank: 4,
          category: 'テクノロジー',
          trafficVolume: 42000,
          region: 'JP'
        },
        {
          keyword: 'Yahoo注目ワード5',
          rank: 5,
          category: '政治・社会',
          trafficVolume: 38000,
          region: 'JP'
        }
      ];

      return mockTrends.slice(0, count);

      /* 実際のAPI実装例
      const response = await axios.get('https://search.yahooapis.jp/RealTimeSearchService/V2/search', {
        params: {
          appid: process.env.YAHOO_API_KEY,
          query: 'trend keywords',
          results: count,
          start: 1
        }
      });
      
      return response.data.ResultSet.Result.map((item: any, index: number) => ({
        keyword: item.Title,
        rank: index + 1,
        category: item.Category,
        trafficVolume: item.ClickCount || 0,
        region: 'JP'
      }));
      */

    } catch (error) {
      console.error('Error fetching Yahoo Trends:', error);
      throw new Error('Failed to fetch Yahoo Trends data');
    }
  }

  /**
   * 特定カテゴリのトレンドを取得
   */
  static async fetchTrendsByCategory(category: string, count: number = 10): Promise<TrendData[]> {
    try {
      // カテゴリ別のモックデータ
      const mockTrends: TrendData[] = [
        {
          keyword: `${category}_トレンド1`,
          rank: 1,
          category,
          trafficVolume: 35000,
          region: 'JP'
        },
        {
          keyword: `${category}_トレンド2`,
          rank: 2,
          category,
          trafficVolume: 28000,
          region: 'JP'
        }
      ];

      return mockTrends.slice(0, count);

    } catch (error) {
      console.error('Error fetching Yahoo Category Trends:', error);
      throw new Error('Failed to fetch Yahoo Category Trends data');
    }
  }
}