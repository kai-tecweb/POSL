'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button, Input } from '@/components'
import Layout from '@/components/Layout'

const PromptSettings = () => {
  const { prompt, updatePrompt } = useAppStore()
  const [formData, setFormData] = useState(prompt)
  const [newRule, setNewRule] = useState('')
  const [newNgWord, setNewNgWord] = useState('')
  const [newPreferredPhrase, setNewPreferredPhrase] = useState('')

  // 事前定義されたルール例
  const predefinedRules = [
    '絵文字を1-2個含める',
    'ハッシュタグは3個以下',
    '280文字以内で簡潔に',
    '質問で終わることを避ける',
    '時事的な話題を控える',
    '個人的な意見は「私は」を付ける',
    'フォロワーとの交流を意識する',
    '批判的な内容は避ける',
    '専門用語は分かりやすく説明',
    '前向きで建設的な内容にする'
  ]

  // NGワードの例
  const predefinedNgWords = [
    '批判', '否定', '失敗', '問題', '困る', '大変', 'ダメ', '悪い',
    '政治', '宗教', 'お金', '病気', '死', '戦争', 'コロナ', 'ウイルス'
  ]

  // 好きな表現の例
  const predefinedPhrases = [
    'ありがとうございます', 'おつかれさまです', 'よろしくお願いします',
    'いかがでしょうか', 'なるほど', 'そうですね', 'いいですね',
    '素晴らしい', '楽しい', '嬉しい', 'ワクワク', 'ドキドキ',
    'がんばります', 'よろしくお願いします', 'ありがとう', 'お疲れ様'
  ]

  const handleAddRule = () => {
    if (newRule.trim() && !formData.additionalRules.includes(newRule.trim())) {
      setFormData(prev => ({
        ...prev,
        additionalRules: [...prev.additionalRules, newRule.trim()]
      }))
      setNewRule('')
    }
  }

  const handleRemoveRule = (rule: string) => {
    setFormData(prev => ({
      ...prev,
      additionalRules: prev.additionalRules.filter(r => r !== rule)
    }))
  }

  const handleAddNgWord = () => {
    if (newNgWord.trim() && !formData.ngWords.includes(newNgWord.trim())) {
      setFormData(prev => ({
        ...prev,
        ngWords: [...prev.ngWords, newNgWord.trim()]
      }))
      setNewNgWord('')
    }
  }

  const handleRemoveNgWord = (word: string) => {
    setFormData(prev => ({
      ...prev,
      ngWords: prev.ngWords.filter(w => w !== word)
    }))
  }

  const handleAddPreferredPhrase = () => {
    if (newPreferredPhrase.trim() && !formData.preferredPhrases.includes(newPreferredPhrase.trim())) {
      setFormData(prev => ({
        ...prev,
        preferredPhrases: [...prev.preferredPhrases, newPreferredPhrase.trim()]
      }))
      setNewPreferredPhrase('')
    }
  }

  const handleRemovePreferredPhrase = (phrase: string) => {
    setFormData(prev => ({
      ...prev,
      preferredPhrases: prev.preferredPhrases.filter(p => p !== phrase)
    }))
  }

  const addPredefined = (type: 'rule' | 'ngWord' | 'phrase', item: string) => {
    switch (type) {
      case 'rule':
        if (!formData.additionalRules.includes(item)) {
          setFormData(prev => ({
            ...prev,
            additionalRules: [...prev.additionalRules, item]
          }))
        }
        break
      case 'ngWord':
        if (!formData.ngWords.includes(item)) {
          setFormData(prev => ({
            ...prev,
            ngWords: [...prev.ngWords, item]
          }))
        }
        break
      case 'phrase':
        if (!formData.preferredPhrases.includes(item)) {
          setFormData(prev => ({
            ...prev,
            preferredPhrases: [...prev.preferredPhrases, item]
          }))
        }
        break
    }
  }

  const handleSave = () => {
    updatePrompt(formData)
    alert('プロンプト設定を保存しました')
  }

  const clearAll = () => {
    if (confirm('すべての設定をクリアしますか？')) {
      setFormData({
        additionalRules: [],
        ngWords: [],
        preferredPhrases: []
      })
    }
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">プロンプト微調整</h1>
          <p className="mt-2 text-gray-600">
            投稿生成時のプロンプトに追加するルール、NGワード、好きな表現を設定して、よりパーソナライズされた投稿を作成します。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Additional Rules */}
          <Card title="追加ルール">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                投稿生成時に守ってほしいルールを追加できます
              </p>

              {/* Add New Rule */}
              <div className="space-y-2">
                <Input
                  placeholder="新しいルールを入力"
                  value={newRule}
                  onChange={setNewRule}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddRule()
                    }
                  }}
                />
                <Button
                  onClick={handleAddRule}
                  disabled={!newRule.trim()}
                  size="sm"
                  className="w-full"
                >
                  ルールを追加
                </Button>
              </div>

              {/* Current Rules */}
              {formData.additionalRules.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    現在のルール ({formData.additionalRules.length}件)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formData.additionalRules.map((rule, index) => (
                      <div key={index} className="flex items-start justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm text-blue-900 flex-1">{rule}</span>
                        <button
                          onClick={() => handleRemoveRule(rule)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predefined Rules */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">よく使われるルール</h4>
                <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
                  {predefinedRules.map((rule) => (
                    <button
                      key={rule}
                      onClick={() => addPredefined('rule', rule)}
                      disabled={formData.additionalRules.includes(rule)}
                      className={`text-xs p-2 rounded border text-left transition-colors ${
                        formData.additionalRules.includes(rule)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* NG Words */}
          <Card title="NGワード">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                投稿に含めたくないワードを設定します
              </p>

              {/* Add New NG Word */}
              <div className="space-y-2">
                <Input
                  placeholder="NGワードを入力"
                  value={newNgWord}
                  onChange={setNewNgWord}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddNgWord()
                    }
                  }}
                />
                <Button
                  onClick={handleAddNgWord}
                  disabled={!newNgWord.trim()}
                  size="sm"
                  className="w-full"
                >
                  NGワードを追加
                </Button>
              </div>

              {/* Current NG Words */}
              {formData.ngWords.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    現在のNGワード ({formData.ngWords.length}件)
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {formData.ngWords.map((word, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                      >
                        {word}
                        <button
                          onClick={() => handleRemoveNgWord(word)}
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

              {/* Predefined NG Words */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">よく使われるNGワード</h4>
                <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                  {predefinedNgWords.map((word) => (
                    <button
                      key={word}
                      onClick={() => addPredefined('ngWord', word)}
                      disabled={formData.ngWords.includes(word)}
                      className={`text-xs p-2 rounded border text-left transition-colors ${
                        formData.ngWords.includes(word)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Preferred Phrases */}
          <Card title="好きな表現">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                投稿に積極的に使いたい表現や口癖を設定します
              </p>

              {/* Add New Preferred Phrase */}
              <div className="space-y-2">
                <Input
                  placeholder="好きな表現を入力"
                  value={newPreferredPhrase}
                  onChange={setNewPreferredPhrase}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddPreferredPhrase()
                    }
                  }}
                />
                <Button
                  onClick={handleAddPreferredPhrase}
                  disabled={!newPreferredPhrase.trim()}
                  size="sm"
                  className="w-full"
                >
                  表現を追加
                </Button>
              </div>

              {/* Current Preferred Phrases */}
              {formData.preferredPhrases.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    現在の好きな表現 ({formData.preferredPhrases.length}件)
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {formData.preferredPhrases.map((phrase, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {phrase}
                        <button
                          onClick={() => handleRemovePreferredPhrase(phrase)}
                          className="ml-2 text-green-600 hover:text-green-800"
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

              {/* Predefined Preferred Phrases */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">よく使われる表現</h4>
                <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
                  {predefinedPhrases.map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => addPredefined('phrase', phrase)}
                      disabled={formData.preferredPhrases.includes(phrase)}
                      className={`text-xs p-2 rounded border text-left transition-colors ${
                        formData.preferredPhrases.includes(phrase)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Settings Summary */}
          <Card title="設定サマリー" className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formData.additionalRules.length}
                </div>
                <div className="text-sm text-gray-600">追加ルール</div>
                <div className="text-xs text-gray-500 mt-1">
                  最大20件まで
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {formData.ngWords.length}
                </div>
                <div className="text-sm text-gray-600">NGワード</div>
                <div className="text-xs text-gray-500 mt-1">
                  最大100件まで
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formData.preferredPhrases.length}
                </div>
                <div className="text-sm text-gray-600">好きな表現</div>
                <div className="text-xs text-gray-500 mt-1">
                  最大50件まで
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex space-x-3">
                <Button onClick={handleSave} className="flex-1">
                  設定を保存
                </Button>
                <Button variant="secondary" onClick={clearAll}>
                  すべてクリア
                </Button>
              </div>
            </div>
          </Card>

          {/* Usage Tips */}
          <Card title="使い方のコツ">
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-900">追加ルール</h4>
                <p>具体的で実行しやすいルールを設定しましょう。「必ず〜する」「〜は避ける」のような明確な指示が効果的です。</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">NGワード</h4>
                <p>ブランドイメージに合わない言葉や、トラブルになりやすい単語を登録します。部分一致でチェックされます。</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">好きな表現</h4>
                <p>あなたらしい口調や、よく使う挨拶などを登録すると、よりパーソナルな投稿が生成されます。</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex">
                  <div className="text-yellow-400 mr-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-yellow-800">注意</div>
                    <div className="text-yellow-700 text-xs">
                      設定が多すぎると投稿の自然性が失われる場合があります。適度な数に調整することをおすすめします。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default PromptSettings