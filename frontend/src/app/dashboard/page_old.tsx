'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button, PostStatusMonitor } from '@/components'
import Layout from '@/components/Layout'

const Dashboard = () => {
  const {
    postTime,
    trends,
    upcomingEvents,
    postLogs,
    loading,
    error,
    fetchTrends,
    fetchUpcomingEvents,
    fetchPostLogs,
    clearError
  } = useAppStore()

  useEffect(() => {
    // Load dashboard data on mount
    fetchTrends()
    fetchUpcomingEvents()
    fetchPostLogs()
  }, [fetchTrends, fetchUpcomingEvents, fetchPostLogs])

  const nextPostTime = postTime.enabled ? `今日 ${postTime.time}` : '未設定'
  const todayTheme = getTodayTheme()

  function getTodayTheme() {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const today = dayNames[new Date().getDay()]
    const { weekTheme } = useAppStore.getState()
    return weekTheme[today]
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            システムの状況と今日の投稿予定を確認できます
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <div className="flex">
                <div className="text-red-400 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-red-700">{error}</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearError}
              >
                閉じる
              </Button>
            </div>
          </div>
        )}

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Next Post */}
          <Card>
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">次の投稿</h3>
                <p className="text-2xl font-bold text-gray-900">{nextPostTime}</p>
              </div>
            </div>
          </Card>

          {/* Today's Theme */}
          <Card>
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">今日のテーマ</h3>
                <p className="text-lg font-bold text-gray-900 truncate">{todayTheme}</p>
              </div>
            </div>
          </Card>

          {/* API Status */}
          <Card>
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">API接続</h3>
                <p className="text-lg font-bold text-green-600">正常</p>
              </div>
            </div>
          </Card>

          {/* Auto Post Status */}
          <Card>
            <div className="flex items-center">
              <div className={`${postTime.enabled ? 'bg-green-100' : 'bg-yellow-100'} p-3 rounded-lg mr-4`}>
                <div className={`w-3 h-3 ${postTime.enabled ? 'bg-green-500' : 'bg-yellow-500'} rounded-full`}></div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">自動投稿</h3>
                <p className={`text-lg font-bold ${postTime.enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                  {postTime.enabled ? '有効' : '無効'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Post Status Monitor */}
            <PostStatusMonitor />

            {/* Trending Topics */}
            <Card title="トレンド情報 TOP3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-gray-500">読み込み中...</p>
                </div>
              ) : trends.length > 0 ? (
                <div className="space-y-3">
                  {trends.slice(0, 3).map((trend, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{trend.keyword}</span>
                        <span className="text-sm text-gray-500">{trend.source}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{trend.description || 'トレンドキーワード'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>トレンド情報はありません</p>
                  <Button 
                    className="mt-2" 
                    size="sm"
                    onClick={fetchTrends}
                  >
                    再読み込み
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
              </div>
            ) : trends.length > 0 ? (
              <div className="space-y-4">
                {trends.slice(0, 3).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                        {trend.rank}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{trend.keyword}</p>
                        <p className="text-sm text-gray-500 capitalize">{trend.source}</p>
                      </div>
                    </div>
                    {trend.category && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {trend.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>トレンド情報はありません</p>
                <Button 
                  className="mt-2" 
                  size="sm"
                  onClick={fetchTrends}
                >
                  再読み込み
                </Button>
              </div>
            )}
          </Card>

          {/* Upcoming Events */}
          <Card title="今後のイベント">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                        {new Date(event.date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>予定されているイベントはありません</p>
              </div>
            )}
          </Card>

          {/* Recent Posts */}
          <Card title="最近の投稿">
            {postLogs.length > 0 ? (
              <div className="space-y-4">
                {postLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.status === 'success' 
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status === 'success' ? '成功' : log.status === 'failed' ? '失敗' : '処理中'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{log.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>投稿履歴はありません</p>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card title="クイックアクション">
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="secondary"
                onClick={() => window.location.href = '/settings/post'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                投稿時間を設定
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="secondary"
                onClick={() => window.location.href = '/settings/week-theme'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                曜日テーマを設定
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="secondary"
                onClick={() => window.location.href = '/diary'}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a2 2 0 012-2h2a2 2 0 012 2v3a3 3 0 01-3 3z" />
                </svg>
                音声日記をアップロード
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard