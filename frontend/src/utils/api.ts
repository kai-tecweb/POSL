// API endpoints - 本番環境対応版（完全版）
const getApiBaseUrl = () => {
  // ブラウザ環境でない場合（SSR）
  if (typeof window === 'undefined') {
    // サーバーサイドでは環境変数から取得、なければ相対パスを使用
    return process.env.NEXT_PUBLIC_API_URL || ''
  }
  
  // ブラウザ環境では常に相対パスを使用（Nginxがプロキシするため）
  // /dev/エンドポイントの場合は/dev、それ以外は/apiを使用
  return ''
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
  // エンドポイントが既に完全なURLの場合はそのまま使用
  if (endpoint.startsWith('http')) {
    const url = endpoint
    console.log('API Request (absolute URL):', {
      method: options.method || 'GET',
      url: url
    })
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      credentials: 'same-origin',
      ...options
    })
    await handleApiError(response)
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
  }
  
  // 相対パスの場合はそのまま使用（Nginxが適切にプロキシする）
  const url = endpoint
  
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

// API utility functions for events
export const eventsAPI = {
  async getEvents(type: 'fixed' | 'today') {
    console.log('Getting events', { type })
    return await apiRequest(`/api/events?type=${type}`)
  },

  async getTodayEvents(date?: string) {
    console.log('Getting today events', { date })
    const url = date ? `/api/events/today?date=${date}` : '/api/events/today'
    return await apiRequest(url)
  },

  async toggleEvent(eventId: number) {
    console.log('Toggling event', { eventId })
    return await apiRequest(`/api/events/${eventId}/toggle`, {
      method: 'PUT'
    })
  }
}

// API utility functions for products
export const productsAPI = {
  async getProducts(userId?: string) {
    console.log('Getting products', { userId })
    const url = userId ? `/api/products?userId=${userId}` : '/api/products'
    return await apiRequest(url)
  },

  async getProduct(productId: number) {
    console.log('Getting product', { productId })
    return await apiRequest(`/api/products/${productId}`)
  },

  async createProduct(productData: any) {
    console.log('Creating product', productData)
    return await apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    })
  },

  async updateProduct(productId: number, productData: any) {
    console.log('Updating product', { productId, productData })
    return await apiRequest(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    })
  },

  async deleteProduct(productId: number) {
    console.log('Deleting product', { productId })
    return await apiRequest(`/api/products/${productId}`, {
      method: 'DELETE'
    })
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