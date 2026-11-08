const API_BASE_URL = 'http://localhost:8000'

export interface CommentRequest {
  text: string
}

export interface CommentResponse {
  text: string
  sentiment: string
  category: string
  confidence: number
}

export interface BatchResponse {
  total: number
  processed: number
  results: CommentResponse[]
  status: string
}

export interface UploadResponse {
  filename: string
  total_rows: number
  valid_rows: number
  columns: string[]
  message: string
}

export interface ChatRequest {
  message: string
  session_id?: string
}

export interface ChatResponse {
  message: string
  summary_card?: {
    title: string
    description: string
  }
  sources?: string[]
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async healthCheck() {
    return this.request<{ status: string; service: string }>('/health')
  }

  async analyzeComment(text: string): Promise<CommentResponse> {
    return this.request<CommentResponse>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async batchProcess(file: File): Promise<BatchResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseUrl}/api/batch`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Batch Process Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    })
  }
}

export const apiClient = new ApiClient()
