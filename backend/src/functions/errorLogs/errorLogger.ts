import { DynamoDB } from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.REGION || 'ap-northeast-1',
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    accessKeyId: 'local',
    secretAccessKey: 'local'
  })
})

export interface ErrorLogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
  details?: any
}

export const logError = async (
  level: 'error' | 'warning' | 'info',
  message: string,
  source: string,
  details?: any
): Promise<void> => {
  try {
    const logEntry: ErrorLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      details
    }

    await dynamodb.put({
      TableName: process.env.ERROR_LOGS_TABLE!,
      Item: logEntry
    }).promise()

    console.log(`[${level.toUpperCase()}] ${source}: ${message}`, details)
  } catch (error) {
    // エラーログの記録に失敗してもアプリケーションを止めない
    console.error('Failed to log error:', error)
    console.error(`Original ${level}:`, { message, source, details })
  }
}

// 便利な関数
export const logErrorMessage = (message: string, source: string, details?: any) => 
  logError('error', message, source, details)

export const logWarningMessage = (message: string, source: string, details?: any) => 
  logError('warning', message, source, details)

export const logInfoMessage = (message: string, source: string, details?: any) => 
  logError('info', message, source, details)