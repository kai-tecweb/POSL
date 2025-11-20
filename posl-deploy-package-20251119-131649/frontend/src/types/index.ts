// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// User settings types
export interface PostTimeSettings {
  enabled: boolean
  time: string // HH:MM format
  timezone: string
}

export interface WeekThemeSettings {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface EventSettings {
  id: string
  title: string
  date: string
  description?: string
  enabled: boolean
  behavior: 'add' | 'replace'
}

export interface TrendSettings {
  googleTrends: {
    enabled: boolean
    weight: number // 0-100
  }
  yahooTrends: {
    enabled: boolean
    weight: number // 0-100
  }
  excludeCategories: string[]
}

export interface ToneProfile {
  politeness: number // 0-100
  casualness: number // 0-100
  positivity: number // 0-100
  informativeness: number // 0-100
  emotiveness: number // 0-100
  creativityLevel: number // 0-100
  personalTouch: number // 0-100
}

export interface TemplateSettings {
  selectedTemplates: string[]
  priorities: Record<string, number>
}

export interface PromptSettings {
  additionalRules: string[]
  ngWords: string[]
  preferredPhrases: string[]
}

// Dashboard data types
export interface TrendData {
  rank: number
  keyword: string
  source: 'google' | 'yahoo'
  category?: string
}

export interface UpcomingEvent {
  id: string
  title: string
  date: string
  description?: string
}

export interface PostLog {
  id: string
  content: string
  createdAt: string
  platform: 'twitter' | 'x'
  status: 'success' | 'failed' | 'pending'
  prompt?: string
  error?: string
}

// Audio diary types
export interface DiaryEntry {
  id: string
  filename: string
  originalFilename: string
  uploadedAt: string
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed'
  transcription?: string
  duration?: number
  fileSize: number
}

// Component props types
export interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export interface InputProps {
  label?: string
  error?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  type?: 'text' | 'email' | 'password' | 'number' | 'time'
  required?: boolean
  disabled?: boolean
  className?: string
}

// State management types
export interface AppState {
  // User settings
  postTime: PostTimeSettings
  weekTheme: WeekThemeSettings
  events: EventSettings[]
  trend: TrendSettings
  tone: ToneProfile
  template: TemplateSettings
  prompt: PromptSettings
  
  // Dashboard data
  trends: TrendData[]
  upcomingEvents: UpcomingEvent[]
  postLogs: PostLog[]
  
  // Diary data
  diaryEntries: DiaryEntry[]
  
  // UI state
  loading: boolean
  error: string | null
}

export interface AppActions {
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