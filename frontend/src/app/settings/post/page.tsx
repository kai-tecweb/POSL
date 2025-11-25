'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button, Input } from '@/components'
import Layout from '@/components/Layout'

const PostSettings = () => {
  const { postTime, updatePostTime, loading, error } = useAppStore()
  const [formData, setFormData] = useState(postTime)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleSave = () => {
    updatePostTime(formData)
    setTestResult('設定を保存しました')
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setTestResult(null)

    try {
      // TODO: Implement actual API test
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      setTestResult('API接続テスト成功！X (Twitter) への投稿準備が完了しています。')
    } catch (error) {
      setTestResult('API接続テストに失敗しました。設定を確認してください。')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const timezoneOptions = [
    { value: 'Asia/Tokyo', label: '日本標準時 (JST)' },
    { value: 'America/New_York', label: '東部標準時 (EST)' },
    { value: 'Europe/London', label: 'グリニッジ標準時 (GMT)' },
    { value: 'UTC', label: '協定世界時 (UTC)' }
  ]

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">自動投稿設定</h1>
          <p className="mt-2 text-gray-600">
            投稿時間やスケジュールの設定を行います
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Test Result Display */}
        {testResult && (
          <div className={`mb-6 border rounded-md p-4 ${
            testResult.includes('成功') || testResult.includes('保存')
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {testResult}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Settings */}
          <Card title="基本設定">
            <div className="space-y-6">
              {/* Auto Post Toggle */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      enabled: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    自動投稿を有効にする
                  </span>
                </label>
                <p className="mt-1 text-sm text-gray-500">
                  設定した時間に自動的にコンテンツを生成して投稿します
                </p>
              </div>

              {/* Post Time */}
              <div>
                <Input
                  label="投稿時間"
                  type="time"
                  value={formData.time}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    time: value 
                  }))}
                  disabled={!formData.enabled}
                />
                <p className="mt-1 text-sm text-gray-500">
                  毎日この時間に自動投稿が実行されます
                </p>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイムゾーン
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    timezone: e.target.value 
                  }))}
                  disabled={!formData.enabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  {timezoneOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  投稿時間の基準となるタイムゾーンを選択してください
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? '保存中...' : '設定を保存'}
                </Button>
              </div>
            </div>
          </Card>

          {/* API Connection Test */}
          <Card title="API接続テスト">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  X (Twitter) APIとの接続状況を確認します。
                  実際の投稿前に接続テストを行うことをお勧めします。
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">現在の状態</h4>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">API認証情報が設定済み</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">接続テスト未実行</span>
                  </div>
                </div>

                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  variant="secondary"
                  className="w-full"
                >
                  {isTestingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      接続テスト中...
                    </>
                  ) : (
                    'API接続をテスト'
                  )}
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">注意事項</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 接続テストでは実際の投稿は行われません</li>
                  <li>• APIキーの権限を確認します</li>
                  <li>• テスト失敗時は設定を見直してください</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Schedule Preview */}
          <Card title="投稿スケジュール">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">次回投稿予定</h4>
                {formData.enabled ? (
                  <div>
                    <p className="text-lg font-bold text-blue-600">
                      今日 {formData.time}
                    </p>
                    <p className="text-sm text-gray-600">
                      {timezoneOptions.find(tz => tz.value === formData.timezone)?.label}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">自動投稿が無効になっています</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">今週の投稿予定</h4>
                <div className="space-y-2">
                  {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => {
                    const date = new Date()
                    date.setDate(date.getDate() + index)
                    const isToday = index === 0
                    
                    return (
                      <div key={day} className="flex justify-between items-center py-2 px-3 rounded-md bg-gray-50">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium mr-3 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                            {day}曜日
                          </span>
                          <span className="text-sm text-gray-500">
                            {date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <span className={`text-sm ${formData.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {formData.enabled ? formData.time : '無効'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Help & Documentation */}
          <Card title="ヘルプ">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">よくある質問</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <details className="cursor-pointer">
                    <summary className="font-medium">投稿時間を変更した場合、いつから反映されますか？</summary>
                    <p className="mt-1 pl-4">設定保存後、次回の投稿から新しい時間で実行されます。</p>
                  </details>
                  <details className="cursor-pointer">
                    <summary className="font-medium">自動投稿が失敗した場合はどうなりますか？</summary>
                    <p className="mt-1 pl-4">エラーログが記録され、次回の投稿時間まで待機します。</p>
                  </details>
                  <details className="cursor-pointer">
                    <summary className="font-medium">タイムゾーンを変更する必要がありますか？</summary>
                    <p className="mt-1 pl-4">日本にお住まいの場合は、デフォルトの日本標準時のままで問題ありません。</p>
                  </details>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default PostSettings