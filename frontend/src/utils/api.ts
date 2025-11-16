// API endpoints
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
    const response = await fetch(`${API_BASE_URL}/trends/fetch`)
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