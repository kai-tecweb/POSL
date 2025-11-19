// API endpoints - 環境に応じて動的に設定
const getApiBaseUrl = () => {
  // ブラウザ環境でない場合（SSR）
  if (typeof window === 'undefined') {
    return '/api'
  }
  
  // ブラウザ環境での判定
  const hostname = window.location.hostname
  console.log('Current hostname:', hostname) // デバッグログ
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // ローカル開発環境
    console.log('Using localhost API')
    return 'http://localhost:3001'
  } else {
    // AWS本番環境 - 相対パスでNginxプロキシを利用
    console.log('Using production API path: /api')
    return '/api'
  }
}

// API utility functions for settings
export const settingsAPI = {
  async getSettings(settingType: string) {
    const baseUrl = getApiBaseUrl()
    console.log('Settings API call to:', `${baseUrl}/dev/settings/${settingType}`)
    const response = await fetch(`${baseUrl}/dev/settings/${settingType}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${settingType} settings`)
    }
    return response.json()
  },

  async updateSettings(settingType: string, data: any) {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/dev/settings/${settingType}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      throw new Error(`Failed to update ${settingType} settings`)
    }
    return response.json()
  }
}

// API utility functions for trends
export const trendsAPI = {
  async fetchTrends() {
    const baseUrl = getApiBaseUrl()
    console.log('Trends API call to:', `${baseUrl}/api/trends/google`)
    const response = await fetch(`${baseUrl}/api/trends/google`)
    if (!response.ok) {
      throw new Error('Failed to fetch trends')
    }
    return response.json()
  }
}

// API utility functions for post logs
export const postsAPI = {
  async getPostLogs(limit: number = 20) {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/post/logs?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch post logs')
    }
    return response.json()
  },

  async getPostStatus(limit: number = 20) {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/post/status`)
    if (!response.ok) {
      throw new Error('Failed to fetch post status')
    }
    return response.json()
  },

  async testPost(content: string) {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/test/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content })
    })
    if (!response.ok) {
      throw new Error('Failed to send test post')
    }
    return response.json()
  }
}

// API utility functions for error logs
export const errorLogsAPI = {
  async getErrorLogs(limit: number = 10) {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/errors/logs?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch error logs')
    }
    return response.json()
  },

  async clearErrorLogs() {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/errors/logs`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Failed to clear error logs')
    }
    return response.json()
  }
}