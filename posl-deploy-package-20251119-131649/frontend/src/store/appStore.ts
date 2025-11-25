import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  PostTimeSettings,
  WeekThemeSettings,
  EventSettings,
  TrendSettings,
  ToneProfile,
  TemplateSettings,
  PromptSettings,
  TrendData,
  UpcomingEvent,
  PostLog,
  DiaryEntry
} from '@/types'
import { settingsAPI, trendsAPI, postsAPI } from '@/utils/api'

interface AppStore extends AppState {
  // Settings actions
  updatePostTime: (settings: PostTimeSettings) => void
  updateWeekTheme: (settings: WeekThemeSettings) => void
  addEvent: (event: EventSettings) => void
  updateEvent: (id: string, event: Partial<EventSettings>) => void
  removeEvent: (id: string) => void
  updateTrend: (settings: TrendSettings) => void
  updateTone: (profile: ToneProfile) => void
  updateTemplate: (settings: TemplateSettings) => void
  updatePrompt: (settings: PromptSettings) => void
  
  // Settings sync actions
  savePostTime: (settings: PostTimeSettings) => Promise<void>
  saveWeekTheme: (settings: WeekThemeSettings) => Promise<void>
  saveTrend: (settings: TrendSettings) => Promise<void>
  saveTone: (profile: ToneProfile) => Promise<void>
  saveTemplate: (settings: TemplateSettings) => Promise<void>
  savePrompt: (settings: PromptSettings) => Promise<void>
  
  // Settings load actions
  loadPostTime: () => Promise<void>
  loadWeekTheme: () => Promise<void>
  loadTrend: () => Promise<void>
  loadTone: () => Promise<void>
  loadTemplate: () => Promise<void>
  loadPrompt: () => Promise<void>
  loadAllSettings: () => Promise<void>
  
  // Initialize
  initialize: () => Promise<void>
  
  // Data actions
  fetchTrends: () => Promise<void>
  fetchUpcomingEvents: () => Promise<void>
  fetchPostLogs: () => Promise<void>
  fetchDiaryEntries: () => Promise<void>
  
  // Diary actions
  uploadDiary: (file: File) => Promise<void>
  deleteDiary: (id: string) => Promise<void>
  
  // UI actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

const defaultPostTime: PostTimeSettings = {
  enabled: false,
  time: '20:00',
  timezone: 'Asia/Tokyo'
}

const defaultWeekTheme: WeekThemeSettings = {
  monday: '新しい週の始まり',
  tuesday: '火曜日のモチベーション',
  wednesday: '週の中間地点',
  thursday: 'もうすぐ週末',
  friday: '金曜日の終わり',
  saturday: '週末の楽しみ',
  sunday: '日曜日のまったり'
}

const defaultTrendSettings: TrendSettings = {
  googleTrends: {
    enabled: true,
    weight: 70
  },
  yahooTrends: {
    enabled: true,
    weight: 30
  },
  excludeCategories: []
}

const defaultToneProfile: ToneProfile = {
  politeness: 50,
  casualness: 50,
  positivity: 70,
  informativeness: 60,
  emotiveness: 40,
  creativityLevel: 60,
  personalTouch: 50
}

const defaultTemplateSettings: TemplateSettings = {
  selectedTemplates: ['雑談', '感想', '体験談'],
  priorities: {
    '雑談': 1,
    '感想': 2,
    '体験談': 3
  }
}

const defaultPromptSettings: PromptSettings = {
  additionalRules: [],
  ngWords: [],
  preferredPhrases: []
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      postTime: defaultPostTime,
      weekTheme: defaultWeekTheme,
      events: [],
      trend: defaultTrendSettings,
      tone: defaultToneProfile,
      template: defaultTemplateSettings,
      prompt: defaultPromptSettings,
      
      trends: [],
      upcomingEvents: [],
      postLogs: [],
      diaryEntries: [],
      
      loading: false,
      error: null,

      // Initialize settings from backend on startup
      initialize: async () => {
        const { loadAllSettings } = get()
        await loadAllSettings()
      },

      // Settings actions
      updatePostTime: (settings) => 
        set({ postTime: settings }),
      
      updateWeekTheme: (settings) => 
        set({ weekTheme: settings }),
      
      addEvent: (event) => 
        set((state) => ({ 
          events: [...state.events, event] 
        })),
      
      updateEvent: (id, eventUpdate) =>
        set((state) => ({
          events: state.events.map(event => 
            event.id === id ? { ...event, ...eventUpdate } : event
          )
        })),
      
      removeEvent: (id) =>
        set((state) => ({
          events: state.events.filter(event => event.id !== id)
        })),
      
      updateTrend: (settings) =>
        set({ trend: settings }),
      
      updateTone: (profile) =>
        set({ tone: profile }),
      
      updateTemplate: (settings) =>
        set({ template: settings }),
      
      updatePrompt: (settings) =>
        set({ prompt: settings }),

      // Settings sync actions
      savePostTime: async (settings) => {
        try {
          set({ loading: true })
          // time (HH:MM) を hour と minute に変換
          const [hour, minute] = settings.time.split(':').map(Number)
          const apiData = {
            hour,
            minute,
            timezone: settings.timezone,
            enabled: settings.enabled
          }
          await settingsAPI.updateSettings('post-time', apiData)
          set({ postTime: settings, loading: false })
        } catch (error) {
          set({ 
            error: '投稿時間設定の保存に失敗しました', 
            loading: false 
          })
        }
      },

      saveWeekTheme: async (settings) => {
        try {
          set({ loading: true })
          await settingsAPI.updateSettings('week-theme', settings)
          set({ weekTheme: settings, loading: false })
        } catch (error) {
          set({ 
            error: '曜日テーマ設定の保存に失敗しました', 
            loading: false 
          })
        }
      },

      saveTrend: async (settings) => {
        try {
          set({ loading: true })
          await settingsAPI.updateSettings('trend', settings)
          set({ trend: settings, loading: false })
        } catch (error) {
          set({ 
            error: 'トレンド設定の保存に失敗しました', 
            loading: false 
          })
        }
      },

      saveTone: async (profile) => {
        try {
          set({ loading: true })
          await settingsAPI.updateSettings('tone', profile)
          set({ tone: profile, loading: false })
        } catch (error) {
          set({ 
            error: 'トーン設定の保存に失敗しました', 
            loading: false 
          })
        }
      },

      saveTemplate: async (settings) => {
        try {
          set({ loading: true })
          await settingsAPI.updateSettings('template', settings)
          set({ template: settings, loading: false })
        } catch (error) {
          set({ 
            error: 'テンプレート設定の保存に失敗しました', 
            loading: false 
          })
        }
      },

      savePrompt: async (settings) => {
        try {
          set({ loading: true })
          await settingsAPI.updateSettings('prompt', settings)
          set({ prompt: settings, loading: false })
        } catch (error) {
          set({ 
            error: 'プロンプト設定の保存に失敗しました', 
            loading: false 
          })
        }
      },

      // Settings load actions
      loadPostTime: async () => {
        try {
          set({ loading: true })
          const response = await settingsAPI.getSettings('post-time')
          // hour と minute を time (HH:MM) に変換
          const data = response.data
          const time = `${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}`
          set({ 
            postTime: {
              enabled: data.enabled ?? true,
              time,
              timezone: data.timezone || 'Asia/Tokyo'
            }, 
            loading: false 
          })
        } catch (error) {
          set({ 
            error: '投稿時間設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      loadWeekTheme: async () => {
        try {
          set({ loading: true })
          const response = await settingsAPI.getSettings('week-theme')
          set({ weekTheme: response.data, loading: false })
        } catch (error) {
          set({ 
            error: '曜日テーマ設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      loadTrend: async () => {
        try {
          set({ loading: true })
          const response = await settingsAPI.getSettings('trend')
          set({ trend: response.data, loading: false })
        } catch (error) {
          set({ 
            error: 'トレンド設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      loadTone: async () => {
        try {
          set({ loading: true })
          const response = await settingsAPI.getSettings('tone')
          set({ tone: response.data, loading: false })
        } catch (error) {
          set({ 
            error: 'トーン設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      loadTemplate: async () => {
        try {
          set({ loading: true })
          const response = await settingsAPI.getSettings('template')
          set({ template: response.data, loading: false })
        } catch (error) {
          set({ 
            error: 'テンプレート設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      loadPrompt: async () => {
        try {
          set({ loading: true })
          const response = await settingsAPI.getSettings('prompt')
          set({ prompt: response.data, loading: false })
        } catch (error) {
          set({ 
            error: 'プロンプト設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      loadAllSettings: async () => {
        const { loadPostTime, loadWeekTheme, loadTrend, loadTone, loadTemplate, loadPrompt } = get()
        
        try {
          set({ loading: true })
          await Promise.allSettled([
            loadPostTime(),
            loadWeekTheme(), 
            loadTrend(),
            loadTone(),
            loadTemplate(),
            loadPrompt()
          ])
          set({ loading: false })
        } catch (error) {
          set({ 
            error: '設定の読み込みに失敗しました', 
            loading: false 
          })
        }
      },

      // Data actions (API calls would be implemented here)
      fetchTrends: async () => {
        console.log('fetchTrends called - starting trend fetch')
        try {
          set({ loading: true })
          console.log('Making API call to trendsAPI.fetchTrends()')
          const response = await trendsAPI.fetchTrends()
          console.log('API response received:', response)
          
          // Transform Google Trends response to TrendData format
          const trends: TrendData[] = response.data?.trends?.map((trend: any, index: number) => ({
            rank: index + 1,
            keyword: trend.query || trend.keyword || trend.title,
            source: 'google',
            category: 'トレンド'
          })) || []
          
          console.log('Transformed trends:', trends)
          set({ trends, loading: false })
        } catch (error) {
          console.error('Failed to fetch trends:', error)
          // Fallback to mock data
          const mockTrends: TrendData[] = [
            { rank: 1, keyword: 'AI技術', source: 'google', category: 'Technology' },
            { rank: 2, keyword: '新商品', source: 'yahoo', category: 'Business' },
            { rank: 3, keyword: '季節イベント', source: 'google', category: 'Event' }
          ]
          set({ 
            trends: mockTrends, 
            error: 'トレンド情報の取得に失敗しました（モックデータを表示中）', 
            loading: false 
          })
        }
      },

      fetchUpcomingEvents: async () => {
        set({ loading: true })
        try {
          // TODO: Implement API call
          const mockEvents: UpcomingEvent[] = [
            { 
              id: '1', 
              title: 'クリスマス', 
              date: '2024-12-25',
              description: 'クリスマスの投稿テーマ'
            }
          ]
          
          set({ upcomingEvents: mockEvents, loading: false })
        } catch (error) {
          set({ 
            error: 'イベント情報の取得に失敗しました', 
            loading: false 
          })
        }
      },

      fetchPostLogs: async () => {
        set({ loading: true })
        try {
          // TODO: Implement API call
          const mockLogs: PostLog[] = [
            {
              id: '1',
              content: 'おはようございます！今日も良い一日を！',
              createdAt: '2024-11-16T09:00:00Z',
              platform: 'x',
              status: 'success'
            }
          ]
          
          set({ postLogs: mockLogs, loading: false })
        } catch (error) {
          set({ 
            error: '投稿ログの取得に失敗しました', 
            loading: false 
          })
        }
      },

      fetchDiaryEntries: async () => {
        set({ loading: true })
        try {
          // TODO: Implement API call
          const mockEntries: DiaryEntry[] = []
          
          set({ diaryEntries: mockEntries, loading: false })
        } catch (error) {
          set({ 
            error: '日記データの取得に失敗しました', 
            loading: false 
          })
        }
      },

      // Diary actions
      uploadDiary: async (file: File) => {
        set({ loading: true })
        try {
          // TODO: Implement file upload API call
          const newEntry: DiaryEntry = {
            id: Date.now().toString(),
            filename: `diary_${Date.now()}.mp3`,
            originalFilename: file.name,
            uploadedAt: new Date().toISOString(),
            transcriptionStatus: 'pending',
            fileSize: file.size
          }
          
          set((state) => ({
            diaryEntries: [...state.diaryEntries, newEntry],
            loading: false
          }))
        } catch (error) {
          set({ 
            error: '音声ファイルのアップロードに失敗しました', 
            loading: false 
          })
        }
      },

      deleteDiary: async (id: string) => {
        set({ loading: true })
        try {
          // TODO: Implement delete API call
          set((state) => ({
            diaryEntries: state.diaryEntries.filter(entry => entry.id !== id),
            loading: false
          }))
        } catch (error) {
          set({ 
            error: '日記の削除に失敗しました', 
            loading: false 
          })
        }
      },

      // UI actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'posl-app-store',
      // Only persist settings, not temporary data like loading states
      partialize: (state) => ({
        postTime: state.postTime,
        weekTheme: state.weekTheme,
        events: state.events,
        trend: state.trend,
        tone: state.tone,
        template: state.template,
        prompt: state.prompt
      })
    }
  )
)