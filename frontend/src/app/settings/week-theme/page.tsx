'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button, Input } from '@/components'
import Layout from '@/components/Layout'

const WeekThemeSettings = () => {
  const { weekTheme, updateWeekTheme, loading } = useAppStore()
  const [formData, setFormData] = useState(weekTheme)
  const [activePreview, setActivePreview] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  const dayLabels = {
    monday: '月曜日',
    tuesday: '火曜日', 
    wednesday: '水曜日',
    thursday: '木曜日',
    friday: '金曜日',
    saturday: '土曜日',
    sunday: '日曜日'
  } as const

  const dayEmojis = {
    monday: '💪',
    tuesday: '🔥',
    wednesday: '⚡',
    thursday: '🌟',
    friday: '🎉',
    saturday: '😊',
    sunday: '☕'
  } as const

  const handleSave = () => {
    updateWeekTheme(formData)
    // Show success message
    alert('曜日テーマを保存しました')
  }

  const handleFieldChange = (day: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [day]: value
    }))
  }

  const generatePreview = async (day: keyof typeof formData) => {
    setActivePreview(day)
    setIsGeneratingPreview(true)
    setPreviewContent('')

    try {
      // TODO: Implement actual API call to generate preview
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock preview generation
      const theme = formData[day]
      const mockPreview = `${theme}をテーマに、今日の出来事を振り返りながら、ちょっとした気づきや感想をシェアしたいと思います。

皆さんは${dayLabels[day]}をどのように過ごされましたか？私は${theme.toLowerCase()}ということを意識して一日を過ごしてみました。

#${dayLabels[day]} #${theme.replace(/\s+/g, '')} #日常 #つぶやき`

      setPreviewContent(mockPreview)
    } catch (error) {
      setPreviewContent('プレビューの生成に失敗しました。')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const resetToDefault = () => {
    const defaultThemes = {
      monday: '新しい週の始まり',
      tuesday: '火曜日のモチベーション',
      wednesday: '週の中間地点',
      thursday: 'もうすぐ週末',
      friday: '金曜日の終わり',
      saturday: '週末の楽しみ',
      sunday: '日曜日のまったり'
    }
    setFormData(defaultThemes)
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">曜日テーマ設定</h1>
          <p className="mt-2 text-gray-600">
            各曜日の投稿テーマを設定します。設定したテーマに基づいて投稿内容が自動生成されます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Theme Settings */}
          <div className="space-y-6">
            <Card title="曜日別テーマ設定">
              <div className="space-y-6">
                {Object.entries(dayLabels).map(([day, label]) => (
                  <div key={day} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{dayEmojis[day as keyof typeof dayEmojis]}</span>
                        <label className="text-sm font-medium text-gray-700">
                          {label}
                        </label>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generatePreview(day as keyof typeof formData)}
                        disabled={isGeneratingPreview || !formData[day as keyof typeof formData].trim()}
                      >
                        プレビュー
                      </Button>
                    </div>
                    <Input
                      value={formData[day as keyof typeof formData]}
                      onChange={(value) => handleFieldChange(day as keyof typeof formData, value)}
                      placeholder={`${label}のテーマを入力してください`}
                    />
                    <p className="text-xs text-gray-500">
                      例: 「新しい挑戦」「週末の準備」「リラックスタイム」など
                    </p>
                  </div>
                ))}

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? '保存中...' : '設定を保存'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={resetToDefault}
                  >
                    デフォルトに戻す
                  </Button>
                </div>
              </div>
            </Card>

            {/* Usage Tips */}
            <Card title="設定のヒント">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">効果的なテーマの設定方法</h4>
                  <ul className="text-sm text-gray-600 space-y-1 pl-4">
                    <li>• 具体的で分かりやすいテーマにする</li>
                    <li>• その曜日の気分や活動に合わせる</li>
                    <li>• フォロワーが共感しやすい内容にする</li>
                    <li>• 季節やトレンドも意識する</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">テーマ例</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-gray-700">月曜日</div>
                      <div className="text-gray-600">新しい目標、週の計画</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-gray-700">金曜日</div>
                      <div className="text-gray-600">週末計画、達成感</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-gray-700">土曜日</div>
                      <div className="text-gray-600">趣味、リラックス</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="font-medium text-gray-700">日曜日</div>
                      <div className="text-gray-600">振り返り、準備</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Preview Area */}
          <div className="space-y-6">
            <Card title="プレビュー">
              {activePreview ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">
                      {dayEmojis[activePreview as keyof typeof dayEmojis]}
                    </span>
                    <h3 className="text-lg font-medium text-gray-900">
                      {dayLabels[activePreview as keyof typeof dayLabels]}のプレビュー
                    </h3>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-2">
                      テーマ: {formData[activePreview as keyof typeof formData]}
                    </div>
                    
                    {isGeneratingPreview ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        <p className="mt-2 text-gray-500">投稿内容を生成中...</p>
                      </div>
                    ) : previewContent ? (
                      <div className="bg-white rounded-lg border p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              あなたのアカウント
                            </div>
                            <div className="text-gray-700 whitespace-pre-line">
                              {previewContent}
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                              {new Date().toLocaleString('ja-JP')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        プレビューを生成するにはテーマを設定して「プレビュー」ボタンをクリックしてください
                      </div>
                    )}
                  </div>

                  {previewContent && !isGeneratingPreview && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        文字数: {previewContent.length}/280
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generatePreview(activePreview as keyof typeof formData)}
                      >
                        再生成
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p className="mt-2">
                    各曜日のプレビューボタンをクリックすると<br />
                    投稿内容のプレビューが表示されます
                  </p>
                </div>
              )}
            </Card>

            {/* Weekly Overview */}
            <Card title="今週のテーマ一覧">
              <div className="space-y-3">
                {Object.entries(dayLabels).map(([day, label]) => {
                  const today = new Date().getDay()
                  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day)
                  const isToday = today === dayIndex
                  
                  return (
                    <div
                      key={day}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-lg mr-3">
                          {dayEmojis[day as keyof typeof dayEmojis]}
                        </span>
                        <div>
                          <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                            {label}
                            {isToday && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">今日</span>}
                          </div>
                          <div className={`text-sm ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                            {formData[day as keyof typeof formData]}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => generatePreview(day as keyof typeof formData)}
                        disabled={isGeneratingPreview}
                      >
                        確認
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default WeekThemeSettings