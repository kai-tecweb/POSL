import { APIGatewayProxyHandler } from 'aws-lambda'
import { successResponse, errorResponse } from '../../libs/response'
import { MySQLHelper } from '../../libs/mysql'
import Joi from 'joi'

const updateSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').required(),
  error: Joi.string().optional(),
  result: Joi.object().optional()
})

// 投稿ステータス更新
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // パスパラメータの取得
    const postId = event.pathParameters?.['postId']
    if (!postId) {
      return errorResponse('postId path parameter is required')
    }

    // リクエストボディの取得とパース
    if (!event.body) {
      return errorResponse('Request body is required')
    }

    let body: any
    try {
      body = JSON.parse(event.body)
    } catch (error) {
      return errorResponse('Invalid JSON in request body')
    }

    // リクエストボディの検証
    const { error, value } = updateSchema.validate(body)
    if (error) {
      return errorResponse(`Invalid request body: ${error.message}`)
    }

    const { status, error: errorDetails, result } = value
    const userId = 'default' // 実際の実装では認証から取得
    const timestamp = new Date().toISOString()

    // MySQLの既存投稿ログを取得
    const existingLog = await MySQLHelper.getItem('post_logs', { 
      userId, 
      postId 
    });
    
    if (!existingLog) {
      return errorResponse(`Post log not found: postId=${postId}`);
    }

    // 更新データを準備
    const updatedLog: any = {
      ...existingLog,
      status,
      updated_at: timestamp
    };
    
    if (errorDetails) {
      updatedLog.error_message = errorDetails;
    }
    
    if (result) {
      updatedLog.result = JSON.stringify(result);
    }

    // MySQLHelperで更新実行
    await MySQLHelper.putItem('post_logs', updatedLog);

    return successResponse({
      postId,
      status,
      updatedAt: timestamp
    })

  } catch (error) {
    console.error('Error updating post status:', error)
    return errorResponse('Failed to update post status', 500)
  }
}