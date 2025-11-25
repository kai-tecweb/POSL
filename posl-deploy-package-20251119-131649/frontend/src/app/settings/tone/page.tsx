'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button } from '@/components'
import Layout from '@/components/Layout'
import type { ToneProfile } from '@/types'

const ToneSettings = () => {
  const { tone, updateTone } = useAppStore()
  const [formData, setFormData] = useState<ToneProfile>(tone)
  const [previewContent, setPreviewContent] = useState<string>('')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // プリセット定義
  const presets: Record<string, ToneProfile> = {
    professional: {
      politeness: 85,
      casualness: 20,
      positivity: 70,
      informativeness: 90,
      emotiveness: 30,
      creativityLevel: 50,
      personalTouch: 40
    },
    friendly: {
      politeness: 60,
      casualness: 80,
      positivity: 90,
      informativeness: 60,
      emotiveness: 70,
      creativityLevel: 70,
      personalTouch: 85
    },
    creative: {
      politeness: 50,
      casualness: 70,
      positivity: 80,
      informativeness: 50,
      emotiveness: 85,
      creativityLevel: 95,
      personalTouch: 80
    },
    informative: {
      politeness: 70,
      casualness: 30,
      positivity: 60,
      informativeness: 95,
      emotiveness: 40,
      creativityLevel: 40,
      personalTouch: 30
    },
    casual: {
      politeness: 40,
      casualness: 95,
      positivity: 75,
      informativeness: 50,
      emotiveness: 60,
      creativityLevel: 60,
      personalTouch: 90
    }
  }

  const presetLabels = {
    professional: 'プロフェッショナル',
    friendly: 'フレンドリー',
    creative: 'クリエイティブ',
    informative: '情報重視',
    casual: 'カジュアル'
  }

  const sliderConfig = [
    {
      key: 'politeness' as keyof ToneProfile,
      label: '丁寧さ',
      description: '敬語や丁寧な表現の使用度',
      lowLabel: 'タメ口',
      highLabel: '敬語',
      color: 'blue'
    },
    {
      key: 'casualness' as keyof ToneProfile,
      label: 'カジュアルさ',
      description: 'くだけた表現や親しみやすさ',
      lowLabel: 'フォーマル',
      highLabel: 'カジュアル',
      color: 'green'
    },
    {
      key: 'positivity' as keyof ToneProfile,
      label: 'ポジティブさ',
      description: '明るく前向きな表現の度合い',
      lowLabel: '中立的',
      highLabel: 'ポジティブ',
      color: 'yellow'
    },
    {
      key: 'informativeness' as keyof ToneProfile,
      label: '情報性',
      description: '具体的な情報や詳細の含有度',
      lowLabel: 'シンプル',
      highLabel: '詳細',
      color: 'purple'
    },
    {
      key: 'emotiveness' as keyof ToneProfile,
      label: '感情表現',
      description: '感情や気持ちの表現度',
      lowLabel: '抑制的',
      highLabel: '感情的',
      color: 'pink'
    },
    {
      key: 'creativityLevel' as keyof ToneProfile,
      label: '創造性',
      description: 'ユニークな表現や比喩の使用度',
      lowLabel: '標準的',
      highLabel: '創造的',
      color: 'indigo'
    },
    {
      key: 'personalTouch' as keyof ToneProfile,
      label: '個人的な要素',
      description: '個人的体験や意見の含有度',
      lowLabel: '客観的',
      highLabel: '主観的',
      color: 'red'
    }
  ]

  const handleSliderChange = (key: keyof ToneProfile, value: number) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
    setSelectedPreset('') // プリセット選択をリセット
  }

  const applyPreset = (presetName: string) => {
    setFormData(presets[presetName])
    setSelectedPreset(presetName)
  }

  const handleSave = () => {
    updateTone(formData)
    alert('文体・トーン設定を保存しました')
  }

  const generatePreview = async () => {
    setIsGeneratingPreview(true)
    setPreviewContent('')

    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock preview based on settings
      let preview = ''
      
      if (formData.politeness > 70) {
        preview += 'おはようございます。本日も素晴らしい一日となりますように。'
      } else if (formData.politeness > 40) {
        preview += 'おはようございます！今日も頑張りましょう。'
      } else {
        preview += 'おはよう！今日もよろしく。'
      }

      if (formData.informativeness > 70) {
        preview += ' 今日は気温が20度、晴れ時々曇りの予報です。'
      }

      if (formData.emotiveness > 70) {
        preview += ' とても嬉しい気持ちでいっぱいです！✨'
      } else if (formData.emotiveness > 40) {
        preview += ' 良い気分で過ごせそうです。'
      }

      if (formData.creativityLevel > 70) {
        preview += ' 今日という新しいページに、どんな物語を書こうかな？'
      }

      if (formData.personalTouch > 70) {
        preview += ' 個人的には、こういう日が一番好きです。'
      }

      preview += '\n\n#今日もよろしく #素敵な一日 #ポジティブ'

      setPreviewContent(preview)
    } catch (error) {
      setPreviewContent('プレビューの生成に失敗しました。')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // リアルタイムプレビュー（設定変更から2秒後に自動生成）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (previewContent) {
        generatePreview()
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [formData])

  const getSliderColor = (color: string) => {
    const colors = {
      blue: 'from-blue-400 to-blue-600',
      green: 'from-green-400 to-green-600',
      yellow: 'from-yellow-400 to-yellow-600',
      purple: 'from-purple-400 to-purple-600',
      pink: 'from-pink-400 to-pink-600',
      indigo: 'from-indigo-400 to-indigo-600',
      red: 'from-red-400 to-red-600'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">文体・トーン設定</h1>
          <p className="mt-2 text-gray-600">
            投稿の文体や雰囲気を7つの要素で細かく調整できます。プリセットから選ぶか、個別に調整してください。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Presets */}
          <Card title="プリセット選択">
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                よく使われる設定パターンから選択できます
              </p>
              {Object.entries(presetLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPreset === key
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {key === 'professional' && '丁寧で情報重視、ビジネス向け'}
                    {key === 'friendly' && '親しみやすく、ポジティブ'}
                    {key === 'creative' && 'ユニークで感情豊か、個性的'}
                    {key === 'informative' && '詳細で客観的、教育的'}
                    {key === 'casual' && 'くだけた感じ、親近感のある'}
                  </div>
                </button>
              ))}
              
              <div className="pt-4">
                <Button
                  onClick={() => {
                    setFormData(tone) // 保存済み設定に戻す
                    setSelectedPreset('')
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  保存済み設定に戻す
                </Button>
              </div>
            </div>
          </Card>

          {/* Sliders */}
          <Card title="詳細調整">
            <div className="space-y-6">
              {sliderConfig.map((config) => (
                <div key={config.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">
                      {config.label}
                    </label>
                    <span className="text-sm font-medium text-gray-900">
                      {formData[config.key]}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData[config.key]}
                      onChange={(e) => handleSliderChange(config.key, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, rgb(229 231 235) 0%, rgb(229 231 235) ${formData[config.key]}%, rgb(59 130 246) ${formData[config.key]}%, rgb(59 130 246) 100%)`
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{config.lowLabel}</span>
                    <span>{config.highLabel}</span>
                  </div>

                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <Button onClick={handleSave} className="w-full">
                  設定を保存
                </Button>
                <Button 
                  onClick={generatePreview} 
                  variant="secondary" 
                  className="w-full"
                  disabled={isGeneratingPreview}
                >
                  {isGeneratingPreview ? 'プレビュー生成中...' : 'プレビューを生成'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card title="プレビュー">
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                現在の設定で生成される投稿のサンプルです
              </div>

              <div className="bg-gray-50 rounded-lg p-4 min-h-32">
                {isGeneratingPreview ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <p className="mt-2 text-gray-500">生成中...</p>
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
                    「プレビューを生成」ボタンをクリックして<br />
                    設定内容を確認してください
                  </div>
                )}
              </div>

              {previewContent && (
                <div className="text-xs text-gray-500 text-center">
                  文字数: {previewContent.length}/280
                </div>
              )}

              {/* Current Settings Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">現在の設定</h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {sliderConfig.map(config => (
                    <div key={config.key} className="flex justify-between">
                      <span className="text-blue-700">{config.label}:</span>
                      <span className="text-blue-900 font-medium">{formData[config.key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">💡 調整のコツ</h4>
                <ul className="text-xs text-yellow-800 space-y-1">
                  <li>• 丁寧さと個人的要素は反比例することが多い</li>
                  <li>• 創造性を上げるとユニークな表現が増加</li>
                  <li>• 情報性が高いと具体的な内容が多くなる</li>
                  <li>• リアルタイムで調整結果が反映されます</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default ToneSettings