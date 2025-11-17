import { MySQLHelper } from './mysql'
import { v4 as uuidv4 } from 'uuid'

export interface ErrorLog {
  id?: string
  timestamp?: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
  details?: any
}

/**
 * エラーログをMySQLに保存
 */
export const logError = async (errorLog: ErrorLog): Promise<void> => {
  try {
    const logEntry = {
      id: errorLog.id || uuidv4(),
      timestamp: errorLog.timestamp || new Date().toISOString(),
      level: errorLog.level,
      message: errorLog.message,
      source: errorLog.source,
      ...(errorLog.details && { details: JSON.stringify(errorLog.details) })
    }

    // MySQLのerror_logsテーブルに保存
    await MySQLHelper.putItem('error_logs', logEntry)
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