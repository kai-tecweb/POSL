'use client'

import Link from 'next/link'
import Layout from '@/components/Layout'

const SettingsPage = () => {
  const settingsCategories = [
    {
      name: '投稿設定',
      href: '/settings/post',
      description: '投稿時間やタイムゾーン、API接続の設定',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: '曜日テーマ',
      href: '/settings/week-theme',
      description: '曜日ごとの投稿テーマを設定',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'イベント管理',
      href: '/settings/events',
      description: '特別なイベントや記念日の設定',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'トレンド設定',
      href: '/settings/trends',
      description: 'Google TrendsとYahoo Trendsの設定',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'bg-orange-100 text-orange-600'
    },
    {
      name: '文体・トーン',
      href: '/settings/tone',
      description: '投稿の文体やトーンの設定',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      color: 'bg-pink-100 text-pink-600'
    },
    {
      name: 'テンプレート',
      href: '/settings/template',
      description: '投稿テンプレートの種類と優先度',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      name: 'プロンプト設定',
      href: '/settings/prompt',
      description: 'AI生成に使用するプロンプトの設定',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6 4h1m-6 0h-2M5.637 5.637l.707.707M12 12l-4-4m0 0l4-4m-4 4h8m-5 8a9 9 0 110-18 9 9 0 010 18z" />
        </svg>
      ),
      color: 'bg-yellow-100 text-yellow-600'
    }
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <p className="mt-2 text-gray-600">
            投稿テーマや文体、スケジュールなどの各種設定を行います
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category) => (
            <Link
              key={category.href}
              href={category.href as any}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-primary-300"
            >
              <div className="flex items-start mb-4">
                <div className={`${category.color} p-3 rounded-lg mr-4`}>
                  {category.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {category.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-primary-600 text-sm font-medium">
                設定を開く
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default SettingsPage

