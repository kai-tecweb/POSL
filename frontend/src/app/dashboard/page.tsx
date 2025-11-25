'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { TrendData, PostLog } from '@/types'
import Layout from '@/components/Layout'

const Dashboard = () => {
  const { trends, postLogs, loading, fetchTrends, fetchPostLogs, error } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  const loadData = async () => {
    try {
      // fetchTrendsとfetchPostLogsを個別に呼び出し（エラーハンドリングを改善）
      try {
        await fetchTrends()
      } catch (err) {
        console.error('Failed to fetch trends:', err)
        // エラーが発生しても続行
      }
      
      try {
        await fetchPostLogs()
      } catch (err) {
        console.error('Failed to fetch post logs:', err)
        // エラーが発生しても続行
      }
    } catch (err) {
      console.error('Data loading failed:', err)
    }
  }

  if (!mounted) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">読み込み中...</div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            システムの状況と今日の投稿予定を確認できます
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <div className="text-red-700">{error}</div>
              <button
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                onClick={() => useAppStore.getState().clearError()}
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">次回投稿</h3>
                <p className="text-lg font-bold text-gray-900">未設定</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">今日のテーマ</h3>
                <p className="text-lg font-bold text-gray-900">未設定</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">投稿数</h3>
                <p className="text-lg font-bold text-gray-900">{postLogs.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">状態</h3>
                <p className="text-lg font-bold text-green-600">正常</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">トレンド情報</h2>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : trends.length > 0 ? (
                <div className="space-y-3">
                  {trends.slice(0, 5).map((trend: TrendData, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{trend.keyword}</span>
                        <span className="text-sm text-gray-500">{trend.category || trend.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>トレンド情報はありません</p>
                  <button 
                    className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    onClick={loadData}
                  >
                    再読み込み
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">投稿ログ</h2>
              {postLogs.length > 0 ? (
                <div className="space-y-3">
                  {postLogs.slice(0, 3).map((log: PostLog) => (
                    <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{log.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>投稿ログがありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  )
}

export default Dashboard
