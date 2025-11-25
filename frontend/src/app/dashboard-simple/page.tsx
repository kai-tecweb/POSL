'use client'

import { useEffect } from 'react'

const Dashboard = () => {
  useEffect(() => {
    console.log('Dashboard component mounted')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード（簡素版）</h1>
        <p className="mt-2 text-gray-600">
          システムの状況と今日の投稿予定を確認できます
        </p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">次回投稿</h3>
            <p className="text-lg font-bold text-gray-900">未設定</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">今日のテーマ</h3>
            <p className="text-lg font-bold text-gray-900">未設定</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">投稿数</h3>
            <p className="text-lg font-bold text-gray-900">0</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">状態</h3>
            <p className="text-lg font-bold text-green-600">正常</p>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900">トレンド情報（テスト）</h2>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">AI技術</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">新商品発表</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard