// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios from 'axios'; // 将来のAPI実装で使用予定
import { TrendData } from '../../types';

/**
 * Google Trends API 操作のヘルパー関数
 * 注：実際のGoogle Trends APIは公式には公開されていないため、
 * ここではサンプル実装を提供
 */
export class GoogleTrendsHelper {
  /**
   * 日別トレンドを取得
   */
  static async fetchDailyTrends(region: string = 'JP', count: number = 10): Promise<TrendData[]> {
    try {
      // 実際のAPI実装では、PyTrendsライブラリを使用したサーバーレス関数や
      // サードパーティのGoogle Trends APIサービスを利用
      
      // 現在は開発用のモックデータを返す
      const mockTrends: TrendData[] = [
        {
          keyword: 'AI技術',
          rank: 1,
          category: 'テクノロジー',
          trafficVolume: 50000,
          region
        },
        {
          keyword: '仮想通貨',
          rank: 2,
          category: '金融',
          trafficVolume: 45000,
          region
        },
        {
          keyword: '新商品発表',
          rank: 3,
          category: 'ビジネス',
          trafficVolume: 40000,
          region
        },
        {
          keyword: 'スポーツニュース',
          rank: 4,
          category: 'スポーツ',
          trafficVolume: 35000,
          region
        },
        {
          keyword: '映画レビュー',
          rank: 5,
          category: 'エンターテイメント',
          trafficVolume: 30000,
          region
        }
      ];

      // 要求された数だけ返す
      return mockTrends.slice(0, count);

      /* 実際のAPI実装例
      const response = await axios.get('https://your-pytrends-service.com/api/daily-trends', {
        params: {
          geo: region,
          cat: 0, // all categories
          hl: 'ja'
        }
      });
      
      return response.data.trends.slice(0, count);
      */

    } catch (error) {
      console.error('Error fetching Google Trends:', error);
      throw new Error('Failed to fetch Google Trends data');
    }
  }

  /**
   * リアルタイムトレンドを取得
   */
  static async fetchRealtimeTrends(region: string = 'JP', count: number = 10): Promise<TrendData[]> {
    try {
      // リアルタイムトレンドのモックデータ
      const mockTrends: TrendData[] = [
        {
          keyword: '最新ニュース',
          rank: 1,
          category: 'ニュース',
          trafficVolume: 100000,
          region
        },
        {
          keyword: 'トレンド話題',
          rank: 2,
          category: 'エンターテイメント',
          trafficVolume: 85000,
          region
        }
      ];

      return mockTrends.slice(0, count);

    } catch (error) {
      console.error('Error fetching Google Realtime Trends:', error);
      throw new Error('Failed to fetch Google Realtime Trends data');
    }
  }
}