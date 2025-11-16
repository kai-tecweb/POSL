'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button } from '@/components'
import Layout from '@/components/Layout'

const TemplateSettings = () => {
  const { template, updateTemplate } = useAppStore()
  const [formData, setFormData] = useState(template)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // 利用可能なテンプレートの定義
  const availableTemplates = {
    '雑談': {
      description: '日常的な話題や考えをカジュアルに',
      example: '今日は良い天気ですね。こんな日は散歩が気持ちいい...',
      icon: '💬'
    },
    '感想': {
      description: '体験や出来事についての感想・意見',
      example: '先日読んだ本がとても興味深くて、特に○○の部分が...',
      icon: '💭'
    },
    '体験談': {
      description: '個人的な体験や経験を共有',
      example: '昨日初めて○○を試してみました。最初は不安でしたが...',
      icon: '📖'
    },
    '学び・気づき': {
      description: '学んだことや新しい発見を共有',
      example: '最近気づいたことがあります。○○をするときは...',
      icon: '💡'
    },
    '質問・相談': {
      description: 'フォロワーへの質問や相談',
      example: '皆さんは○○のとき、どんな工夫をされていますか？',
      icon: '❓'
    },
    'ニュース・情報': {
      description: '最新情報やニュースについてのコメント',
      example: '○○のニュースを見て、これからの変化が楽しみです...',
      icon: '📰'
    },
    'モチベーション': {
      description: '励ましや前向きなメッセージ',
      example: '新しい週の始まりですね。今週も一緒に頑張りましょう！',
      icon: '🌟'
    },
    'ありがとう': {
      description: '感謝の気持ちを表現',
      example: 'いつも応援してくださる皆様、本当にありがとうございます...',
      icon: '🙏'
    },
    '予告・告知': {
      description: '今後の予定やお知らせ',
      example: '来週○○を予定しています。詳細は改めてお知らせします...',
      icon: '📢'
    },
    '振り返り': {
      description: '過去を振り返る内容',
      example: 'この1ヶ月を振り返ると、たくさんの成長がありました...',
      icon: '🔄'
    }
  }

  const handleTemplateToggle = (templateName: string) => {
    const isSelected = formData.selectedTemplates.includes(templateName)
    
    if (isSelected) {
      // 削除
      setFormData(prev => ({
        ...prev,
        selectedTemplates: prev.selectedTemplates.filter(t => t !== templateName),
        priorities: Object.fromEntries(
          Object.entries(prev.priorities).filter(([key]) => key !== templateName)
        )
      }))
    } else {
      // 追加
      const newPriority = formData.selectedTemplates.length + 1
      setFormData(prev => ({
        ...prev,
        selectedTemplates: [...prev.selectedTemplates, templateName],
        priorities: {
          ...prev.priorities,
          [templateName]: newPriority
        }
      }))
    }
  }

  const handleDragStart = (e: React.DragEvent, templateName: string) => {
    setDraggedItem(templateName)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropTargetTemplate: string) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem === dropTargetTemplate) {
      setDraggedItem(null)
      return
    }

    const draggedPriority = formData.priorities[draggedItem]
    const targetPriority = formData.priorities[dropTargetTemplate]

    // 優先度を入れ替え
    setFormData(prev => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [draggedItem]: targetPriority,
        [dropTargetTemplate]: draggedPriority
      }
    }))

    setDraggedItem(null)
  }

  const handleSave = () => {
    updateTemplate(formData)
    alert('テンプレート設定を保存しました')
  }

  const resetToDefault = () => {
    const defaultSettings = {
      selectedTemplates: ['雑談', '感想', '体験談'],
      priorities: {
        '雑談': 1,
        '感想': 2,
        '体験談': 3
      }
    }
    setFormData(defaultSettings)
  }

  // 優先度順にソートされた選択済みテンプレート
  const sortedSelectedTemplates = formData.selectedTemplates.sort((a, b) => 
    (formData.priorities[a] || 999) - (formData.priorities[b] || 999)
  )

  // 未選択のテンプレート
  const unselectedTemplates = Object.keys(availableTemplates).filter(
    template => !formData.selectedTemplates.includes(template)
  )

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">投稿テンプレート設定</h1>
          <p className="mt-2 text-gray-600">
            投稿に使用するテンプレートの種類と優先度を設定します。ドラッグ&ドロップで優先度を変更できます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Selected Templates */}
          <Card title={`選択中のテンプレート (${formData.selectedTemplates.length}/10)`}>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex">
                  <div className="text-blue-400 mr-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-blue-800">ドラッグ&ドロップ</div>
                    <div className="text-blue-700">
                      テンプレートをドラッグして順番を変更できます
                    </div>
                  </div>
                </div>
              </div>

              {sortedSelectedTemplates.length > 0 ? (
                <div className="space-y-2">
                  {sortedSelectedTemplates.map((templateName) => {
                    const template = availableTemplates[templateName as keyof typeof availableTemplates]
                    const priority = formData.priorities[templateName]
                    
                    return (
                      <div
                        key={templateName}
                        draggable
                        onDragStart={(e) => handleDragStart(e, templateName)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, templateName)}
                        className={`p-4 border rounded-lg cursor-move transition-all ${
                          draggedItem === templateName
                            ? 'opacity-50 scale-95'
                            : 'hover:shadow-md border-green-200 bg-green-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full font-bold text-sm">
                              {priority}
                            </div>
                            <div className="text-2xl">{template.icon}</div>
                            <div>
                              <div className="font-medium text-gray-900">{templateName}</div>
                              <div className="text-sm text-gray-600">{template.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-gray-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </div>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleTemplateToggle(templateName)}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3 ml-11 text-sm text-gray-500 bg-white rounded p-2 border">
                          <span className="text-xs font-medium text-gray-400">例: </span>
                          {template.example}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2">選択されているテンプレートはありません</p>
                  <p className="text-sm">右側から追加してください</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  設定を保存
                </Button>
                <Button variant="secondary" onClick={resetToDefault}>
                  デフォルト
                </Button>
              </div>
            </div>
          </Card>

          {/* Available Templates */}
          <Card title="利用可能なテンプレート">
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                クリックして選択・追加してください
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unselectedTemplates.map((templateName) => {
                  const template = availableTemplates[templateName as keyof typeof availableTemplates]
                  
                  return (
                    <div
                      key={templateName}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
                      onClick={() => handleTemplateToggle(templateName)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900">{templateName}</div>
                            <Button size="sm" variant="secondary">
                              追加
                            </Button>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                          <div className="mt-2 text-sm text-gray-500 bg-gray-50 rounded p-2">
                            <span className="text-xs font-medium text-gray-400">例: </span>
                            {template.example}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {unselectedTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>すべてのテンプレートが選択済みです</p>
                </div>
              )}
            </div>
          </Card>

          {/* Usage Guide */}
          <Card title="使用方法">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">テンプレートの役割</h4>
                <p className="text-sm text-gray-600">
                  各テンプレートは投稿の骨格となる構造を提供します。AIは選択されたテンプレートを参考に、曜日テーマやトレンド情報と組み合わせて投稿を生成します。
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">優先度について</h4>
                <ul className="text-sm text-gray-600 space-y-1 pl-4">
                  <li>• 数字が小さいほど優先度が高い</li>
                  <li>• ドラッグ&ドロップで簡単に並び替え可能</li>
                  <li>• 上位3つが主に使われます</li>
                  <li>• バランスよく配置されます</li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">推奨設定</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium text-gray-700">バランス型</div>
                    <div>雑談 → 感想 → 体験談</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium text-gray-700">情報発信型</div>
                    <div>ニュース・情報 → 学び・気づき → 感想</div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="font-medium text-gray-700">コミュニティ型</div>
                    <div>質問・相談 → ありがとう → モチベーション</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <Card title="設定サマリー">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {formData.selectedTemplates.length}
                  </div>
                  <div className="text-sm text-blue-600">選択中</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-600">
                    {Object.keys(availableTemplates).length}
                  </div>
                  <div className="text-sm text-gray-600">総数</div>
                </div>
              </div>

              {sortedSelectedTemplates.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">優先度順</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    {sortedSelectedTemplates.slice(0, 5).map((templateName, index) => (
                      <li key={templateName} className="flex items-center">
                        <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full text-xs flex items-center justify-center mr-2">
                          {index + 1}
                        </span>
                        {templateName}
                      </li>
                    ))}
                    {sortedSelectedTemplates.length > 5 && (
                      <li className="text-gray-400">...他 {sortedSelectedTemplates.length - 5} 件</li>
                    )}
                  </ol>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default TemplateSettings