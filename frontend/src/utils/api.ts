// API endpoints - 本番環境対応版（修正版）
const getApiBaseUrl = () => {
  // ブラウザ環境でない場合（SSR）
  if (typeof window === 'undefined') {
    // サーバーサイドでは環境変数から取得、なければ本番用デフォルト
    return process.env.NEXT_PUBLIC_API_URL || '/api'
  }
  
  // ブラウザ環境での判定
  const hostname = window.location.hostname
  console.log('Current hostname:', hostname) // デバッグログ
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // ローカル開発環境
    console.log('Using localhost API')
    return 'http://localhost:3001'
  } else {
    // 本番環境 - 現在のホストの /api を使用
    const protocol = window.location.protocol
    const host = window.location.host
    const apiUrl = `${protocol}//${host}/api`
    console.log('Using production API:', apiUrl)
    return apiUrl
  }
}

// エラーハンドリング用のユーティリティ
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    let errorText: string
    try {
      errorText = await response.text()
    } catch {
      errorText = response.statusText
    }
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: response.url
    })
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`)
  }
  return response
}

// 共通のfetch wrapper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl()
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`
  
  console.log('API Request:', {
    method: options.method || 'GET',
    url: url,
    headers: options.headers
  })
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    credentials: 'same-origin',
    ...options
  }
  
  try {
    const response = await fetch(url, defaultOptions)
    await handleApiError(response)
    
    // レスポンスが空の場合の処理
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text()
      if (!text) return null
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    } else {
      return await response.text()
    }
  } catch (error) {
    console.error('API Request failed:', error)
    throw error
  }
}

// API utility functions for settings
export const settingsAPI = {
  async getSettings(settingType: string) {
    console.log('Getting settings:', settingType)
    return await apiRequest(`/dev/settings/${settingType}`)
  },

  async updateSettings(settingType: string, data: any) {
    console.log('Updating settings:', settingType, data)
    return await apiRequest(`/dev/settings/${settingType}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
}

// API utility functions for posts
export const postsAPI = {
  async getPosts(limit = 10) {
    console.log('Getting posts, limit:', limit)
    return await apiRequest(`/api/post/logs?limit=${limit}`)
  },

  async createTestPost() {
    console.log('Creating test post')
    return await apiRequest('/dev/post/test-generate', {
      method: 'POST'
    })
  },

  async createAIPost() {
    console.log('Creating AI post with X posting')
    return await apiRequest('/dev/post/ai-with-x', {
      method: 'POST'
    })
  },

  async createSimpleAIPost() {
    console.log('Creating simple AI post')
    return await apiRequest('/dev/post/simple-ai', {
      method: 'POST'
    })
  }
}

// API utility functions for trends
export const trendsAPI = {
  async getTrends() {
    console.log('Getting trends')
    return await apiRequest('/api/trend/latest')
  }
}

// API utility functions for error logs
export const errorLogsAPI = {
  async getErrorLogs(limit = 10) {
    console.log('Getting error logs, limit:', limit)
    return await apiRequest(`/api/errors/logs?limit=${limit}`)
  },

  async clearErrorLogs() {
    console.log('Clearing error logs')
    return await apiRequest('/api/errors/logs', {
      method: 'DELETE'
    })
  }
}

// Health check
export const healthAPI = {
  async checkHealth() {
    console.log('Checking API health')
    return await apiRequest('/health')
  }
}

// API utility functions for diary
export const diaryAPI = {
  async transcribeAudio(audioData: string, audioUrl?: string) {
    console.log('Transcribing audio')
    return await apiRequest('/api/diary/transcribe', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'demo',
        audioData: audioData,
        audioUrl: audioUrl
      })
    })
  },

  async getDiaries(userId: string = 'demo', limit: number = 10) {
    console.log('Getting diaries', { userId, limit })
    return await apiRequest(`/api/diary/list?userId=${userId}&limit=${limit}`)
  },

  async deleteDiary(diaryId: string, userId: string = 'demo') {
    console.log('Deleting diary', { diaryId, userId })
    return await apiRequest(`/api/diary/${diaryId}?userId=${userId}`, {
      method: 'DELETE'
    })
  }
}

// API utility functions for persona
export const personaAPI = {
  async getProfile(userId: string = 'demo') {
    console.log('Getting persona profile', { userId })
    return await apiRequest(`/api/persona/profile?userId=${userId}`)
  }
}

// 型定義
export interface Post {
  id: number
  content: string
  tweet_id?: string
  status: 'draft' | 'posted' | 'failed'
  created_at: string
  updated_at: string
}

export interface Settings {
  id: number
  user_id: string
  setting_type: string
  setting_data: any
  created_at: string
  updated_at: string
}

export interface ErrorLog {
  id: number
  error_type: string
  error_message: string
  stack_trace?: string
  created_at: string
}

export interface Trend {
  id: number
  trend_data: any
  created_at: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// デバッグ用のAPI状態確認
export const debugAPI = {
  async testConnection() {
    const baseUrl = getApiBaseUrl()
    console.log('Testing API connection to:', baseUrl)
    
    try {
      const health = await healthAPI.checkHealth()
      console.log('API Health:', health)
      return { success: true, data: health }
    } catch (error: any) {
      console.error('API Connection failed:', error)
      return { success: false, error: String(error?.message || error) }
    }
  },
  
  getBaseUrl() {
    return getApiBaseUrl()
  }
}