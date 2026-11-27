import type { ServiceCategory, Sentiment } from '../types'

const configuredApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined
const API_BASE_URL =
  configuredApiBase === '/'
    ? ''
    : (configuredApiBase?.replace(/\/$/, '') || 'http://localhost:8000')

export interface CommentRequest {
  text: string
}

export interface CommentResponse {
  text: string
  sentiment: Sentiment
  category: string
  confidence: number
}

export interface BatchResponse {
  total: number
  processed: number
  results: PersistedFeedbackComment[]
  status: 'completed' | 'already_imported'
  message?: string
}

export interface PersistedFeedbackComment {
  id: number
  year: number
  text: string
  original_category: string | null
  sentiment: Sentiment
  category: string
  confidence: number | null
  label_source: 'dataset' | 'model' | 'mixed'
  source_label_confidence: string | null
  source_label_method: string | null
  verification_status: string | null
}

export interface CommentsPage {
  comments: PersistedFeedbackComment[]
  total: number
  limit: number
  offset: number
}

export interface DashboardStats {
  total_comments: number
  total_positif: number
  total_netral: number
  total_negatif: number
  available_years: number[]
  yearly_totals: Record<string, number>
  yearly_sentiment: Record<
    string,
    { positif: number; netral: number; negatif: number }
  >
  category_stats: {
    name: string
    total: number
    positif: number
    netral: number
    negatif: number
  }[]
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
  sentiment: Sentiment
  category: ServiceCategory
  confidence: number
  summary_card?: {
    title: string
    description: string
  }
  sources?: string[]
}

export interface FaceAnalysisResponse {
  emotion: string
  sentiment: 'Positif' | 'Netral' | 'Negatif'
  confidence: number
  model_emotion: string
  model_confidence: number
  adjusted_for_sad: boolean
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

  async getStats(filters: {
    year?: string
    category?: string
    sentiment?: string
  } = {}): Promise<DashboardStats> {
    const params = new URLSearchParams()
    if (filters.year && filters.year !== 'all') params.set('year', filters.year)
    if (filters.category && filters.category !== 'all') params.set('category', filters.category)
    if (filters.sentiment && filters.sentiment !== 'all') params.set('sentiment', filters.sentiment)
    const query = params.size ? `?${params.toString()}` : ''
    return this.request<DashboardStats>(`/api/stats${query}`)
  }

  async getComments(options: {
    limit?: number
    offset?: number
    year?: string
    category?: string
    sentiment?: string
    search?: string
  } = {}): Promise<CommentsPage> {
    const params = new URLSearchParams()
    if (options.limit !== undefined) params.set('limit', String(options.limit))
    if (options.offset !== undefined) params.set('offset', String(options.offset))
    if (options.year && options.year !== 'all') params.set('year', options.year)
    if (options.category && options.category !== 'all') params.set('category', options.category)
    if (options.sentiment && options.sentiment !== 'all') params.set('sentiment', options.sentiment)
    if (options.search) params.set('search', options.search)
    return this.request<CommentsPage>(`/api/comments?${params.toString()}`)
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
      const error = await response.json().catch(() => null) as { detail?: unknown } | null
      const detail = typeof error?.detail === 'string' ? `: ${error.detail}` : ''
      throw new Error(`Upload Error: ${response.status} ${response.statusText}${detail}`)
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
      const error = await response.json().catch(() => null) as { detail?: unknown } | null
      const detail = typeof error?.detail === 'string' ? `: ${error.detail}` : ''
      throw new Error(`Batch Process Error: ${response.status} ${response.statusText}${detail}`)
    }

    return response.json()
  }

  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    })
  }

  async analyzeFace(image: Blob): Promise<FaceAnalysisResponse> {
    const formData = new FormData()
    formData.append('file', image, 'foto-sentimen.jpg')

    const response = await fetch(`${this.baseUrl}/api/analyze-face`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null) as { detail?: string } | null
      throw new Error(error?.detail || `Analisis ekspresi gagal (${response.status}).`)
    }

    return response.json()
  }
}

export const apiClient = new ApiClient()
