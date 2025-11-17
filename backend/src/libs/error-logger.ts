import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'

const dynamoDbClient = new DynamoDBClient({ 
  region: process.env.REGION || 'ap-northeast-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: 'http://localhost:8000'
  })
})
const docClient = DynamoDBDocumentClient.from(dynamoDbClient)

export interface ErrorLog {
  id?: string
  timestamp?: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
  details?: any
}

/**
 * エラーログをDynamoDBに保存
 */
export const logError = async (errorLog: ErrorLog): Promise<void> => {
  try {
    const logEntry = {
      id: errorLog.id || uuidv4(),
      timestamp: errorLog.timestamp || new Date().toISOString(),
      level: errorLog.level,
      message: errorLog.message,
      source: errorLog.source,
      ...(errorLog.details && { details: errorLog.details })
    }

    const params = {
      TableName: process.env.ERROR_LOGS_TABLE,
      Item: logEntry
    }

    await docClient.send(new PutCommand(params))
    console.log('Error log saved successfully:', logEntry.id)
  } catch (error) {
    // エラーログの保存に失敗してもアプリケーションは継続
    console.error('Failed to save error log:', error)
  }
}

/**
 * エラーログのヘルパー関数
 */
export const errorLogger = {
  error: (message: string, source: string, details?: any) => 
    logError({ level: 'error', message, source, details }),
  
  warning: (message: string, source: string, details?: any) => 
    logError({ level: 'warning', message, source, details }),
  
  info: (message: string, source: string, details?: any) => 
    logError({ level: 'info', message, source, details })
}