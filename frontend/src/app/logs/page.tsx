'use client'

import { useState, useEffect } from 'react'
import { postsAPI } from '@/utils/api'
import Layout from '@/components/Layout'

interface PostLog {
  id: number
  user_id: string
  content: string
  tweet_id: string | null
  status: string
  posted_at: string | null
  created_at: string
  updated_at: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<PostLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        const response = await postsAPI.getPostLogs(10)
        console.log('Logs API response:', response)
        
        if (response.success && response.data) {
          setLogs(response.data)  // 直接dataを使用
        } else {
          setError('Failed to fetch logs')
        }
      } catch (err) {
        console.error('Error fetching logs:', err)
        setError('Failed to fetch logs')
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">投稿ログ</h1>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">ログを読み込み中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">投稿ログ</h1>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">エラー: {error}</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">投稿ログ</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              最近の投稿履歴 ({logs.length}件)
            </h2>
          </div>
          
          {logs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              投稿履歴がありません
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'posted'
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.status === 'posted' ? '投稿済み' : log.status}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      
                      <p className="text-gray-900 mb-2">{log.content}</p>
                      
                      {log.posted_at && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">投稿日時:</span> {new Date(log.posted_at).toLocaleString('ja-JP')}
                        </p>
                      )}
                    </div>
                    
                    <div className="ml-4 text-sm text-gray-500">
                      ID: {log.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}