'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button, Input } from '@/components'
import Layout from '@/components/Layout'

const TrendSettings = () => {
  const { trend, updateTrend, fetchTrends, trends } = useAppStore()
  const [formData, setFormData] = useState(trend)
  const [newCategory, setNewCategory] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  const handleSave = () => {
    updateTrend(formData)
    alert('トレンド設定を保存しました')
  }

  const handleSliderChange = (source: 'googleTrends' | 'yahooTrends', value: number) => {
    const otherSource = source === 'googleTrends' ? 'yahooTrends' : 'googleTrends'
    const otherValue = Math.max(0, 100 - value)
    
    setFormData(prev => ({
      ...prev,
      [source]: {
        ...prev[source],
        weight: value
      },
      [otherSource]: {
        ...prev[otherSource],
        weight: otherValue
      }
    }))
  }

  const addExcludeCategory = () => {
    if (newCategory && !formData.excludeCategories.includes(newCategory)) {
      setFormData(prev => ({
        ...prev,
        excludeCategories: [...prev.excludeCategories, newCategory]
      }))
      setNewCategory('')
    }
  }

  const removeExcludeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      excludeCategories: prev.excludeCategories.filter(c => c !== category)
    }))
  }

  const testTrendConnection = async () => {
    setIsTestingConnection(true)
    setTestResults(null)

    try {
      // TODO: Implement actual API test calls
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock test results
      const mockResults = {
        google: {
          status: 'success',
          trendsCount: 15,
          latestTrends: ['AI技術', '新製品発表', '季節イベント']
        },
        yahoo: {
          status: 'success', 
          trendsCount: 12,
          latestTrends: ['話題のニュース', 'エンタメ情報', 'スポーツ']
        }
      }
      
      setTestResults(mockResults)
    } catch (error) {
      setTestResults({
        google: { status: 'error', error: 'Google Trends API接続エラー' },
        yahoo: { status: 'error', error: 'Yahoo Trends API接続エラー' }
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const predefinedCategories = [
    'エンタメ・芸能', 'スポーツ', '政治', '経済・ビジネス', 'テクノロジー', 
    'ゲーム', 'アニメ・漫画', '音楽', '映画・ドラマ', '健康・医療',
    'グルメ・料理', 'ファッション', '旅行', '教育', '暴力・犯罪',
    'ギャンブル', 'アダルト', '宗教', '差別・ヘイト'
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">トレンド設定</h1>
          <p className="mt-2 text-gray-600">
            Google TrendsとYahoo Trendsからトレンド情報を取得し、投稿内容に反映させる設定を行います
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Settings */}
          <div className="space-y-6">
            <Card title="取得元とバランス設定">
              <div className="space-y-6">
                {/* Google Trends Settings */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.googleTrends.enabled}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          googleTrends: {
                            ...prev.googleTrends,
                            enabled: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        Google Trends
                      </span>
                    </label>
                    <span className="text-sm font-medium text-gray-700">
                      {formData.googleTrends.weight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.googleTrends.weight}
                    onChange={(e) => handleSliderChange('googleTrends', parseInt(e.target.value))}
                    disabled={!formData.googleTrends.enabled}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    世界的なトレンドや検索キーワードを取得
                  </p>
                </div>

                {/* Yahoo Trends Settings */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.yahooTrends.enabled}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          yahooTrends: {
                            ...prev.yahooTrends,
                            enabled: e.target.checked
                          }
                        }))}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        Yahoo Trends (リアルタイム検索)
                      </span>
                    </label>
                    <span className="text-sm font-medium text-gray-700">
                      {formData.yahooTrends.weight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.yahooTrends.weight}
                    onChange={(e) => handleSliderChange('yahooTrends', parseInt(e.target.value))}
                    disabled={!formData.yahooTrends.enabled}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    日本国内の話題やリアルタイム情報を取得
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex">
                    <div className="text-blue-400 mr-3">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-blue-800">バランス調整</div>
                      <div className="text-blue-700">
                        スライダーで重み付けを調整すると、もう一方の値が自動的に調整されます
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Exclude Categories */}
            <Card title="除外カテゴリ設定">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    投稿に含めたくないトピックのカテゴリを選択してください
                  </p>
                  
                  <div className="flex space-x-2 mb-4">
                    <Input
                      placeholder="カテゴリ名を入力"
                      value={newCategory}
                      onChange={setNewCategory}
                      onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addExcludeCategory()
                        }
                      }}
                    />
                    <Button
                      onClick={addExcludeCategory}
                      disabled={!newCategory}
                      size="sm"
                    >
                      追加
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">よく使われるカテゴリ</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {predefinedCategories.map(category => (
                        <button
                          key={category}
                          onClick={() => {
                            if (!formData.excludeCategories.includes(category)) {
                              setFormData(prev => ({
                                ...prev,
                                excludeCategories: [...prev.excludeCategories, category]
                              }))
                            }
                          }}
                          disabled={formData.excludeCategories.includes(category)}
                          className={`text-xs p-2 rounded border text-left transition-colors ${
                            formData.excludeCategories.includes(category)
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Current Exclusions */}
                {formData.excludeCategories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      現在の除外設定 ({formData.excludeCategories.length}件)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.excludeCategories.map(category => (
                        <span
                          key={category}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                        >
                          {category}
                          <button
                            onClick={() => removeExcludeCategory(category)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleSave} className="w-full">
                  設定を保存
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Connection Test */}
            <Card title="API接続テスト">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  両方のトレンドAPIとの接続状況を確認します
                </p>

                <Button
                  onClick={testTrendConnection}
                  disabled={isTestingConnection}
                  className="w-full"
                >
                  {isTestingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      接続テスト中...
                    </>
                  ) : (
                    'API接続をテスト'
                  )}
                </Button>

                {testResults && (
                  <div className="space-y-3">
                    <div className={`border rounded-lg p-3 ${
                      testResults.google.status === 'success' 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Google Trends</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          testResults.google.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {testResults.google.status === 'success' ? '成功' : 'エラー'}
                        </span>
                      </div>
                      {testResults.google.status === 'success' ? (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>取得件数: {testResults.google.trendsCount}件</p>
                          <p>最新トレンド: {testResults.google.latestTrends.join(', ')}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-red-600">
                          {testResults.google.error}
                        </p>
                      )}
                    </div>

                    <div className={`border rounded-lg p-3 ${
                      testResults.yahoo.status === 'success' 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Yahoo Trends</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          testResults.yahoo.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {testResults.yahoo.status === 'success' ? '成功' : 'エラー'}
                        </span>
                      </div>
                      {testResults.yahoo.status === 'success' ? (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>取得件数: {testResults.yahoo.trendsCount}件</p>
                          <p>最新トレンド: {testResults.yahoo.latestTrends.join(', ')}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-red-600">
                          {testResults.yahoo.error}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Current Trends Preview */}
            <Card title="現在のトレンド">
              <div className="space-y-3">
                {trends.length > 0 ? (
                  trends.slice(0, 8).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full text-xs flex items-center justify-center mr-3 font-medium">
                          {trend.rank}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{trend.keyword}</div>
                          {trend.category && (
                            <div className="text-xs text-gray-500">{trend.category}</div>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        trend.source === 'google' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {trend.source === 'google' ? 'Google' : 'Yahoo'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>トレンドデータを取得中...</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Usage Tips */}
            <Card title="使い方のコツ">
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900">バランス調整</h4>
                  <p>Google 70% : Yahoo 30% がおすすめです。Googleは世界的、Yahooは国内の話題に強いです。</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">除外設定</h4>
                  <p>ブランドイメージに合わない話題は事前に除外しておきましょう。</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">定期的な見直し</h4>
                  <p>月に1回程度、除外カテゴリやバランスを見直すことをおすすめします。</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default TrendSettings