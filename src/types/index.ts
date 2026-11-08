export type Sentiment = 'Positif' | 'Netral' | 'Negatif'

export type ServiceCategory =
  | 'Kemahasiswaan'
  | 'Keuangan'
  | 'Sistem & TI'
  | 'Perpustakaan'
  | 'Kerjasama & Karir'
  | 'BAAK'
  | 'Sarana & Prasarana'

export type JobStatus =
  | 'menunggu'
  | 'memvalidasi'
  | 'memproses'
  | 'selesai'
  | 'gagal'

export interface FeedbackComment {
  id: number
  year: number
  date: string
  text: string
  originalCategory: string
  predictedCategory: string
  sentiment: Sentiment
}

export interface ProcessJob {
  id: string
  fileName: string
  fileSizeLabel: string
  status: JobStatus
  message: string
  progress?: {
    preprocessing: number
    sentiment: number
    category: number
    saved: number
    total: number
  }
  errorDetail?: string
}

export interface Filters {
  year: string
  category: string
  sentiment: string
}

export type { MessageSender, ChatMessage, ChatSession } from './chat'
