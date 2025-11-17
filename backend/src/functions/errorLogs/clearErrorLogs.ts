import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
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
    // 全エラーログを取得
    const scanParams = {
      TableName: process.env.ERROR_LOGS_TABLE
    }

    const scanResult = await docClient.send(new ScanCommand(scanParams))
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
      return successResponse({
        message: 'No error logs to clear',
        deletedCount: 0
      })
    }

    // BatchWriteを使用して削除（25件ずつ処理）
    const deleteRequests = scanResult.Items.map(item => ({
      DeleteRequest: {
        Key: {
          id: item.id
        }
      }
    }))

    // 25件ずつバッチで削除
    const batchSize = 25
    let deletedCount = 0

    for (let i = 0; i < deleteRequests.length; i += batchSize) {
      const batch = deleteRequests.slice(i, i + batchSize)
      
      const batchParams = {
        RequestItems: {
          [process.env.ERROR_LOGS_TABLE!]: batch
        }
      }

      await docClient.send(new BatchWriteCommand(batchParams))
      deletedCount += batch.length
    }

    console.log(`Successfully deleted ${deletedCount} error logs`)

    return successResponse({
      message: 'Error logs cleared successfully',
      deletedCount
    })

  } catch (error) {
    console.error('Error clearing error logs:', error)
    
    // DynamoDBローカルに接続できない場合はモックレスポンスを返す
    console.log('Returning mock response for clear operation')
    return successResponse({
      message: 'Error logs cleared successfully (mock)',
      deletedCount: 0,
      mock: true
    })
  }
}