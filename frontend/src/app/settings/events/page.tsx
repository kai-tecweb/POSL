'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { Card } from '@/components'
import { eventsAPI } from '@/utils/api'

interface Event {
  id: number
  user_id: string
  event_type: 'fixed' | 'today' | 'personal'
  title: string
  date: string
  description: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

const EventsPage = () => {
  const [activeTab, setActiveTab] = useState<'fixed' | 'today' | 'personal'>('fixed')
  const [fixedEvents, setFixedEvents] = useState<Event[]>([])
  const [todayEvents, setTodayEvents] = useState<Event[]>([])
  const [personalEvents, setPersonalEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

  // イベント一覧を取得
  const fetchEvents = async (type: 'fixed' | 'today' | 'personal') => {
    try {
      setLoading(true)
      setError(null)
      const response = type === 'personal' 
        ? await eventsAPI.getEvents(type, 'demo')
        : await eventsAPI.getEvents(type)
      
      if (response.success && response.data) {
        // 日付順にソート
        const sortedEvents = response.data.sort((a: Event, b: Event) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateA - dateB
        })
        
        if (type === 'fixed') {
          setFixedEvents(sortedEvents)
        } else if (type === 'personal') {
          setPersonalEvents(sortedEvents)
        } else {
          setTodayEvents(sortedEvents)
        }
      } else {
        throw new Error(response.error || 'イベントの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('Failed to fetch events:', err)
      setError(err.message || 'イベントの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初期ロード
  useEffect(() => {
    fetchEvents('fixed')
    fetchEvents('today')
    fetchEvents('personal')
  }, [])

  // タブ切り替え時に再取得（必要に応じて）
  useEffect(() => {
    if (activeTab === 'fixed' && fixedEvents.length === 0 && !loading) {
      fetchEvents('fixed')
    } else if (activeTab === 'today' && todayEvents.length === 0 && !loading) {
      fetchEvents('today')
    } else if (activeTab === 'personal' && personalEvents.length === 0 && !loading) {
      fetchEvents('personal')
    }
  }, [activeTab])

  // イベントのON/OFF切り替え
  const handleToggle = async (eventId: number) => {
    try {
      setTogglingIds(prev => new Set(prev).add(eventId))
      setError(null)
      
      const response = await eventsAPI.toggleEvent(eventId)
      
      if (response.success && response.data) {
        // 該当イベントを更新
        const updateEvent = (events: Event[]) => 
          events.map(e => e.id === eventId ? response.data : e)
        
        if (activeTab === 'fixed') {
          setFixedEvents(updateEvent(fixedEvents))
        } else if (activeTab === 'today') {
          setTodayEvents(updateEvent(todayEvents))
        } else {
          setPersonalEvents(updateEvent(personalEvents))
        }
      } else {
        throw new Error(response.error || 'イベントの切り替えに失敗しました')
      }
    } catch (err: any) {
      console.error('Failed to toggle event:', err)
      setError(err.message || 'イベントの切り替えに失敗しました')
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  // 日付をフォーマット（MM-DD形式）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}/${day}`
  }

  // 現在のイベントリスト
  const currentEvents = activeTab === 'fixed' ? fixedEvents : activeTab === 'today' ? todayEvents : personalEvents
  const eventTypeLabel = activeTab === 'fixed' ? '鉄板イベント' : activeTab === 'today' ? '今日は何の日' : '独自イベント'

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">イベント管理</h1>
          <p className="mt-2 text-gray-600">
            特別なイベントや記念日のON/OFFを管理します
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('fixed')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'fixed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              鉄板イベント ({fixedEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'today'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              今日は何の日 ({todayEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'personal'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              独自イベント ({personalEvents.length})
            </button>
          </nav>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : currentEvents.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500">イベントが見つかりません</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentEvents.map((event) => (
              <Card key={event.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {formatDate(event.date)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={event.is_enabled}
                        onChange={() => handleToggle(event.id)}
                        disabled={togglingIds.has(event.id)}
                        className="sr-only peer"
                      />
                      <div className={`
                        w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                        ${event.is_enabled ? 'peer-checked:bg-primary-600' : ''}
                        ${togglingIds.has(event.id) ? 'opacity-50 cursor-not-allowed' : ''}
                      `}></div>
                    </label>
                  </div>
                </div>
                {event.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`
                      px-2 py-1 rounded-full
                      ${event.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                    `}>
                      {event.is_enabled ? '有効' : '無効'}
                    </span>
                    {togglingIds.has(event.id) && (
                      <span className="text-primary-600">更新中...</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">イベント管理について</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>鉄板イベント:</strong> 元日、バレンタインデー、クリスマスなど、毎年同じ日に発生する固定イベントです。
              </p>
              <p>
                <strong>今日は何の日:</strong> 猫の日、ポッキーの日など、一般的な記念日です。
              </p>
              <p>
                <strong>ON/OFF切り替え:</strong> スイッチを切り替えることで、そのイベントの投稿を有効/無効にできます。
                無効にしたイベントは自動投稿されません。
              </p>
              <p className="text-xs text-gray-500 mt-4">
                注意: イベントの作成・編集・削除はできません。システムで管理されているイベントのみ表示されます。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default EventsPage
