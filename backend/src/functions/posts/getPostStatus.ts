import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../../libs/response'
import Joi from 'joi'

const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'ap-northeast-1',
  ...(process.env['AWS_ENDPOINT_URL'] && {
    endpoint: process.env['AWS_ENDPOINT_URL']
  })
})

const dynamoDb = DynamoDBDocumentClient.from(client)

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
    const userId = 'default' // 実際の実装では認証から取得

    // DynamoDBクエリの構築
    let queryParams: any = {
      TableName: process.env['POST_LOGS_TABLE'] || 'posl-post-logs-local',
      IndexName: 'timestamp-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: limit,
      ScanIndexForward: false // 最新から取得
    }

    // ステータスフィルター
    if (status) {
      queryParams.FilterExpression = '#status = :status'
      queryParams.ExpressionAttributeNames = {
        '#status': 'status'
      }
      queryParams.ExpressionAttributeValues[':status'] = status
    }

    // ページネーション
    if (lastKey) {
      queryParams.ExclusiveStartKey = JSON.parse(lastKey)
    }

    const result = await dynamoDb.send(new QueryCommand(queryParams))

    return successResponse({
      items: result.Items || [],
      lastKey: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : null,
      count: result.Count || 0
    })

  } catch (error) {
    console.error('Error getting post status:', error)
    return errorResponse('Failed to get post status', 500)
  }
}