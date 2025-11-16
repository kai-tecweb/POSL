import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../../libs/response'
import Joi from 'joi'

const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'ap-northeast-1',
  ...(process.env['AWS_ENDPOINT_URL'] && {
    endpoint: process.env['AWS_ENDPOINT_URL']
  })
})

const dynamoDb = DynamoDBDocumentClient.from(client)

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

    // DynamoDB更新パラメータ
    const updateParams: any = {
      TableName: process.env['POST_LOGS_TABLE'] || 'posl-post-logs-local',
      Key: {
        userId,
        postId
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': timestamp
      }
    }

    // エラー詳細がある場合は追加
    if (errorDetails) {
      updateParams.UpdateExpression += ', #error = :error'
      updateParams.ExpressionAttributeNames['#error'] = 'error'
      updateParams.ExpressionAttributeValues[':error'] = errorDetails
    }

    // 結果データがある場合は追加
    if (result) {
      updateParams.UpdateExpression += ', #result = :result'
      updateParams.ExpressionAttributeNames['#result'] = 'result'
      updateParams.ExpressionAttributeValues[':result'] = result
    }

    await dynamoDb.send(new UpdateCommand(updateParams))

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