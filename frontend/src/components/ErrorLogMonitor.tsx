'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components'

interface ErrorLogEntry {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
  details?: any
}

interface ErrorLogMonitorProps {
  maxEntries?: number
  refreshInterval?: number
}

const ErrorLogMonitor = ({ maxEntries = 10, refreshInterval = 30000 }: ErrorLogMonitorProps) => {
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchErrorLogs = async () => {
    try {
      setLoading(true)
      
      // TODO: 実装時にはエラーログAPIエンドポイントを追加
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/errors/logs?limit=${maxEntries}`)
      // const data = await response.json()
      
      // モックデータ
      const mockLogs: ErrorLogEntry[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'X API投稿に失敗しました',
          source: 'generateAndPost',
          details: { error: 'Rate limit exceeded' }
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          level: 'warning',
          message: 'OpenAI APIの応答が遅延しています',
          source: 'promptEngine',
          details: { responseTime: '5.2s' }
        }
      ]
      
      setErrorLogs(mockLogs)
    } catch (error) {
      console.error('Failed to fetch error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrorLogs()
    
    const interval = setInterval(fetchErrorLogs, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-100 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  if (loading && errorLogs.length === 0) {
    return (
      <Card>
        <div className="p-4">
          <div className="animate-pulse">
            <h3 className="text-lg font-semibold mb-4">エラーログ監視</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">エラーログ監視</h3>
          <span className="text-sm text-gray-500">
            最新 {errorLogs.length} 件
          </span>
        </div>

        {errorLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">
              <svg className="w-8 h-8 mx-auto text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p>エラーはありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errorLogs.map((log) => (
              <div 
                key={log.id} 
                className={`border rounded-lg p-3 ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {log.level}
                      </span>
                      <span className="text-xs opacity-75">
                        {new Date(log.timestamp).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium mb-1">{log.message}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-75">Source: {log.source}</span>
                      {log.details && (
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            // TODO: 詳細表示モーダル
                            console.log('Error details:', log.details)
                          }}
                        >
                          詳細
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export default ErrorLogMonitor