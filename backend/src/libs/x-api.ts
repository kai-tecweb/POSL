import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';
import { SecretsHelper } from './secrets';

/**
 * X (Twitter) クライアント
 */
let twitterClient: TwitterApi | null = null;

const getTwitterClient = async (): Promise<TwitterApi> => {
  if (!twitterClient) {
    const credentials = await SecretsHelper.getXApiCredentials();
    
    twitterClient = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessTokenSecret,
    });
  }
  return twitterClient;
};

/**
 * X API 操作のヘルパー関数
 */
export class XHelper {
  /**
   * 投稿を送信
   */
  static async postTweet(text: string): Promise<{
    success: boolean;
    tweetId?: string;
    error?: string;
  }> {
    try {
      // テキストの文字数チェック
      if (text.length > 280) {
        throw new Error('Tweet text exceeds 280 characters');
      }

      const client = await getTwitterClient();
      
      const result: TweetV2PostTweetResult = await client.v2.tweet(text);
      
      if (!result.data?.id) {
        throw new Error('Failed to get tweet ID from response');
      }

      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error) {
      console.error('X Post Tweet Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 接続テスト
   */
  static async testConnection(): Promise<{
    success: boolean;
    user?: {
      id: string;
      username: string;
      name: string;
    };
    error?: string;
  }> {
    try {
      const client = await getTwitterClient();
      
      const user = await client.v2.me({
        'user.fields': ['id', 'username', 'name', 'public_metrics'],
      });

      if (!user.data) {
        throw new Error('Failed to retrieve user data');
      }

      return {
        success: true,
        user: {
          id: user.data.id,
          username: user.data.username,
          name: user.data.name || user.data.username,
        },
      };
    } catch (error) {
      console.error('X Test Connection Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * レート制限情報を取得
   */
  static async getRateLimitStatus(): Promise<{
    remainingPosts: number;
    resetTime: Date;
  }> {
    try {
      const client = await getTwitterClient();
      
      // レート制限情報を取得
      const rateLimitStatus = await client.v1.rateLimitStatuses();
      
      const tweetLimit = rateLimitStatus.resources.statuses?.['/statuses/update'];
      
      if (!tweetLimit) {
        throw new Error('Could not retrieve rate limit status');
      }

      return {
        remainingPosts: tweetLimit.remaining,
        resetTime: new Date(tweetLimit.reset * 1000),
      };
    } catch (error) {
      console.error('X Rate Limit Error:', error);
      
      // フォールバック値
      return {
        remainingPosts: 0,
        resetTime: new Date(Date.now() + 15 * 60 * 1000), // 15分後
      };
    }
  }

  /**
   * 投稿履歴を取得
   */
  static async getUserTweets(
    userId?: string,
    maxResults: number = 10
  ): Promise<Array<{
    id: string;
    text: string;
    createdAt: string;
    publicMetrics?: {
      retweetCount: number;
      likeCount: number;
      replyCount: number;
      quoteCount: number;
    };
  }>> {
    try {
      const client = await getTwitterClient();
      
      let targetUserId = userId;
      if (!targetUserId) {
        const me = await client.v2.me();
        targetUserId = me.data?.id;
      }

      if (!targetUserId) {
        throw new Error('Could not determine user ID');
      }

      const tweets = await client.v2.userTimeline(targetUserId, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['created_at', 'public_metrics', 'text'],
      });

      return tweets.data.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at || '',
        publicMetrics: tweet.public_metrics ? {
          retweetCount: tweet.public_metrics.retweet_count,
          likeCount: tweet.public_metrics.like_count,
          replyCount: tweet.public_metrics.reply_count,
          quoteCount: tweet.public_metrics.quote_count,
        } : undefined,
      })) || [];
    } catch (error) {
      console.error('X Get User Tweets Error:', error);
      return [];
    }
  }

  /**
   * 投稿を削除
   */
  static async deleteTweet(tweetId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = await getTwitterClient();
      
      const result = await client.v2.deleteTweet(tweetId);
      
      return {
        success: result.data?.deleted || false,
      };
    } catch (error) {
      console.error('X Delete Tweet Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * POSL専用：投稿生成＆実行
   */
  static async postWithLogging(
    text: string,
    metadata: {
      userId: string;
      prompt: string;
      trendData?: any[];
    }
  ): Promise<{
    success: boolean;
    tweetId?: string;
    error?: string;
    logData: any;
  }> {
    const startTime = new Date();
    
    const result = await this.postTweet(text);
    
    const logData = {
      userId: metadata.userId,
      postId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: text,
      timestamp: startTime.toISOString(),
      xPostId: result.tweetId,
      prompt: metadata.prompt,
      trendData: metadata.trendData || [],
      success: result.success,
      error: result.error,
    };

    return {
      success: result.success,
      tweetId: result.tweetId,
      error: result.error,
      logData,
    };
  }

  /**
   * 認証情報の検証
   */
  static async validateCredentials(credentials: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }): Promise<{
    valid: boolean;
    error?: string;
    userInfo?: {
      id: string;
      username: string;
      name: string;
    };
  }> {
    try {
      const testClient = new TwitterApi({
        appKey: credentials.apiKey,
        appSecret: credentials.apiSecret,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessTokenSecret,
      });

      const user = await testClient.v2.me({
        'user.fields': ['id', 'username', 'name'],
      });

      if (!user.data) {
        return {
          valid: false,
          error: 'Failed to retrieve user information',
        };
      }

      return {
        valid: true,
        userInfo: {
          id: user.data.id,
          username: user.data.username,
          name: user.data.name || user.data.username,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid credentials',
      };
    }
  }
}