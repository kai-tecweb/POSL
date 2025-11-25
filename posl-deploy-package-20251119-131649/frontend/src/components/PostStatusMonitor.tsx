'use client'

import { useEffect, useState } from 'react'
import { Card, Button } from '@/components'
import { useAppStore } from '@/store/appStore'

interface PostStatus {
  postId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  timestamp: string
  updatedAt?: string
  error?: string
  result?: any
}

const PostStatusMonitor = () => {
  const [postStatuses, setPostStatuses] = useState<PostStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPostStatuses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/post/status`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch post statuses')
      }
      
      const data = await response.json()
      setPostStatuses(data.data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // ポーリングで定期的に更新
  useEffect(() => {
    fetchPostStatuses()
    
    const interval = setInterval(fetchPostStatuses, 10000) // 10秒ごと
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待機中'
      case 'processing': return '処理中'
      case 'completed': return '完了'
      case 'failed': return '失敗'
      default: return '不明'
    }
  }

  if (loading && postStatuses.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <div className="animate-pulse">
            <h3 className="text-lg font-semibold mb-4">投稿ステータス監視</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
          <h3 className="text-lg font-semibold">投稿ステータス監視</h3>
          <Button 
            onClick={fetchPostStatuses} 
            disabled={loading}
            variant="secondary"
            size="sm"
          >
            {loading ? '更新中...' : '更新'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {postStatuses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            投稿ステータスがありません
          </div>
        ) : (
          <div className="space-y-3">
            {postStatuses.map((post) => (
              <div 
                key={post.postId} 
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {post.postId}
                      </span>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${getStatusColor(post.status)}
                      `}>
                        {getStatusLabel(post.status)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>作成: {new Date(post.timestamp).toLocaleString('ja-JP')}</div>
                      {post.updatedAt && (
                        <div>更新: {new Date(post.updatedAt).toLocaleString('ja-JP')}</div>
                      )}
                    </div>
                    
                    {post.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-700">{post.error}</p>
                      </div>
                    )}
                    
                    {post.result && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs text-green-700">
                          投稿が完了しました
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {post.status === 'processing' && (
                    <div className="ml-4">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export default PostStatusMonitor