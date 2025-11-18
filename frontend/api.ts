// API endpoints - 環境に応じて動的に設定
const getApiBaseUrl = () => {
  // SSR時はサーバー側で実行される
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '/api'
  }
  
  // クライアント側での実行
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // ローカル開発環境
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  } else {
    // AWS本番環境 - 相対パスでNginxプロキシを利用
    return '/api'
  }
}

const API_BASE_URL = getApiBaseUrl()

// API utility functions for settings
export const settingsAPI = {
  async getSettings(settingType: string) {
    const response = await fetch(`${API_BASE_URL}/settings/${settingType}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${settingType} settings`)
    }
    return response.json()
  },

  async updateSettings(settingType: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/settings/${settingType}`, {
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
    const response = await fetch(`${API_BASE_URL}/trends/google`)
    if (!response.ok) {
      throw new Error('Failed to fetch trends')
    }
    return response.json()
  }
}

// API utility functions for post logs
export const postsAPI = {
  async getPostLogs(limit: number = 20) {
    const response = await fetch(`${API_BASE_URL}/post/logs?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch post logs')
    }
    return response.json()
  },

  async getPostStatus(limit: number = 20) {
    const response = await fetch(`${API_BASE_URL}/post/status?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch post status')
    }
    return response.json()
  },

  async testPost(content: string) {
    const response = await fetch(`${API_BASE_URL}/test/post`, {
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
    const response = await fetch(`${API_BASE_URL}/errors/logs?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch error logs')
    }
    return response.json()
  },

  async clearErrorLogs() {
    const response = await fetch(`${API_BASE_URL}/errors/logs`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Failed to clear error logs')
    }
    return response.json()
  }
}