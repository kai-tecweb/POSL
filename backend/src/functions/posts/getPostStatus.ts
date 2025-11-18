import { APIGatewayProxyHandler } from 'aws-lambda'
import { successResponse, errorResponse } from '../../libs/response'
import { MySQLHelper } from '../../libs/mysql'
import Joi from 'joi'

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  lastKey: Joi.string().optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional()
})

// 投稿ステータス取得
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // クエリパラメータの検証
    const { error, value } = querySchema.validate(event.queryStringParameters || {})
    if (error) {
      return errorResponse(`Invalid query parameters: ${error.message}`)
    }

    const { limit = 20, lastKey, status } = value
    const userId = 'demo' // 実際の実装では認証から取得

    // MySQLでの投稿ログ取得
    const whereConditions: any = { userId };
    
    if (status) {
      whereConditions.status = status;
    }

    const items = await MySQLHelper.scan('post_logs', whereConditions);

    // timestampで降順ソート
    items.sort((a: any, b: any) => {
      return new Date(b.timestamp || b.created_at).getTime() - 
             new Date(a.timestamp || a.created_at).getTime();
    });

    // limit適用
    const limitedItems = items.slice(0, limit);

    return successResponse({
      items: limitedItems,
      lastKey: null, // MySQLでは単純なlimitを使用
      count: limitedItems.length
    });

  } catch (error) {
    console.error('Error getting post status:', error)
    return errorResponse('Failed to get post status', 500)
  }
}