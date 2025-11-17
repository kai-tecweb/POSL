import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { successResponse, errorResponse } from '../../libs/response'

const dynamoDbClient = new DynamoDBClient({ 
  region: process.env.REGION || 'ap-northeast-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: 'http://localhost:8000'
  })
})
const docClient = DynamoDBDocumentClient.from(dynamoDbClient)

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2))

  try {
    const limit = event.queryStringParameters?.limit ? 
      parseInt(event.queryStringParameters.limit) : 10

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse('Invalid limit parameter. Must be between 1 and 100.', 400)
    }

    const params = {
      TableName: process.env.ERROR_LOGS_TABLE,
      Limit: limit
    }

    console.log('DynamoDB Scan params:', JSON.stringify(params, null, 2))

    const result = await docClient.send(new ScanCommand(params))

    // タイムスタンプで新しい順にソート
    const sortedLogs = (result.Items || []).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    console.log(`Retrieved ${sortedLogs.length} error logs`)

    return successResponse({
      errorLogs: sortedLogs,
      count: sortedLogs.length,
      lastEvaluatedKey: result.LastEvaluatedKey
    })

  } catch (error) {
    console.error('Error retrieving error logs:', error)
    
    // エラー時はモックデータを返す
    const mockLogs = [
      {
        id: 'mock-1',
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'X API投稿に失敗しました',
        source: 'generateAndPost',
        details: {
          error: 'Rate limit exceeded',
          statusCode: 429,
          retryAfter: 900
        }
      },
      {
        id: 'mock-2',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        level: 'warning',
        message: 'OpenAI APIの応答が遅延しています',
        source: 'promptEngine',
        details: {
          responseTime: '5.2s',
          model: 'gpt-4',
          tokensUsed: 1500
        }
      }
    ]

    return successResponse({
      errorLogs: mockLogs,
      count: mockLogs.length,
      mock: true
    })
  }
}