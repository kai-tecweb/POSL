'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Card, Button, Input } from '@/components'
import Layout from '@/components/Layout'
import type { EventSettings } from '@/types'

const EventManagement = () => {
  const { events, addEvent, updateEvent, removeEvent } = useAppStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<EventSettings>>({
    title: '',
    date: '',
    description: '',
    enabled: true,
    behavior: 'add'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.date) return

    if (editingId) {
      // Update existing event
      updateEvent(editingId, formData)
      setEditingId(null)
    } else {
      // Add new event
      const newEvent: EventSettings = {
        id: Date.now().toString(),
        title: formData.title,
        date: formData.date,
        description: formData.description || '',
        enabled: formData.enabled || true,
        behavior: formData.behavior || 'add'
      }
      addEvent(newEvent)
    }

    // Reset form
    setFormData({
      title: '',
      date: '',
      description: '',
      enabled: true,
      behavior: 'add'
    })
    setShowAddForm(false)
  }

  const handleEdit = (event: EventSettings) => {
    setFormData(event)
    setEditingId(event.id)
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      date: '',
      description: '',
      enabled: true,
      behavior: 'add'
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const upcomingEvents = sortedEvents.filter(event => 
    new Date(event.date) >= new Date()
  )
  
  const pastEvents = sortedEvents.filter(event => 
    new Date(event.date) < new Date()
  )

  const getEventStatus = (date: string) => {
    const eventDate = new Date(date)
    const today = new Date()
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: '終了', color: 'gray' }
    if (diffDays === 0) return { text: '今日', color: 'red' }
    if (diffDays === 1) return { text: '明日', color: 'orange' }
    if (diffDays <= 7) return { text: `${diffDays}日後`, color: 'yellow' }
    return { text: `${diffDays}日後`, color: 'blue' }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">イベント管理</h1>
            <p className="mt-2 text-gray-600">
              特別な日やイベントを登録して、投稿内容に反映させることができます
            </p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            新しいイベントを追加
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add/Edit Form */}
          {showAddForm && (
            <Card title={editingId ? 'イベントを編集' : '新しいイベントを追加'}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="イベント名"
                  value={formData.title || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                  placeholder="例: クリスマス、誕生日、新年"
                  required
                />

                <Input
                  label="日付"
                  type="date"
                  value={formData.date || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
                  required
                />

                <Input
                  label="説明（任意）"
                  value={formData.description || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder="イベントの詳細や投稿での取り扱い方を記載"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    投稿への反映方法
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="behavior"
                        value="add"
                        checked={formData.behavior === 'add'}
                        onChange={(e) => setFormData(prev => ({ ...prev, behavior: e.target.value as 'add' | 'replace' }))}
                        className="border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">曜日テーマに追加</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="behavior"
                        value="replace"
                        checked={formData.behavior === 'replace'}
                        onChange={(e) => setFormData(prev => ({ ...prev, behavior: e.target.value as 'add' | 'replace' }))}
                        className="border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm">曜日テーマを置き換え</span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    「追加」は通常テーマ + イベント、「置き換え」はイベントのみで投稿
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enabled || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      このイベントを有効にする
                    </span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingId ? '更新' : '追加'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card title={`今後のイベント (${upcomingEvents.length}件)`}>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => {
                  const status = getEventStatus(event.date)
                  return (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              status.color === 'red' ? 'bg-red-100 text-red-800' :
                              status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                              status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {status.text}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(event.date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!event.enabled && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              無効
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            event.behavior === 'add' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {event.behavior === 'add' ? '追加' : '置換'}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(event)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm('このイベントを削除しますか？')) {
                              removeEvent(event.id)
                            }
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2">今後のイベントはありません</p>
                <p className="text-sm">「新しいイベントを追加」から登録してください</p>
              </div>
            )}
          </Card>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <Card title={`過去のイベント (${pastEvents.length}件)`}>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {pastEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">{event.title}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(event)}
                        >
                          再利用
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeEvent(event.id)}
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pastEvents.length > 10 && (
                  <p className="text-center text-sm text-gray-500">
                    他 {pastEvents.length - 10} 件...
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Usage Guide */}
          <Card title="イベント機能の使い方">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">イベントとは？</h4>
                <p className="text-sm text-gray-600">
                  特別な日やイベントを事前に登録しておくことで、その日の投稿内容に自動的に反映させることができます。
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">反映方法の違い</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs mr-3 mt-0.5">追加</span>
                    <div>
                      <div className="font-medium">曜日テーマに追加</div>
                      <div className="text-gray-600">通常の曜日テーマ + イベント情報で投稿</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-3 mt-0.5">置換</span>
                    <div>
                      <div className="font-medium">曜日テーマを置き換え</div>
                      <div className="text-gray-600">イベント情報のみで投稿（曜日テーマ無視）</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">活用例</h4>
                <ul className="text-sm text-gray-600 space-y-1 pl-4">
                  <li>• 誕生日、記念日</li>
                  <li>• 季節イベント（クリスマス、正月等）</li>
                  <li>• 製品発表、重要な発表</li>
                  <li>• 個人的なマイルストーン</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex">
                  <div className="text-yellow-400 mr-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800">ヒント</div>
                    <div className="text-yellow-700">
                      イベントは投稿日の数日前から準備として言及することも可能です
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

export default EventManagement