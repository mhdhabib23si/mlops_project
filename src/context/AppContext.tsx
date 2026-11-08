import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { COMMENTS } from '../data/comments'
import { INITIAL_JOBS } from '../data/jobs'
import { apiClient } from '../lib/api'
import type { FeedbackComment, Filters, ProcessJob } from '../types'

interface AppState {
  isAuthenticated: boolean
  adminEmail: string
  filters: Filters
  comments: FeedbackComment[]
  jobs: ProcessJob[]
  login: (email: string, password: string) => boolean
  logout: () => void
  setFilters: (next: Filters) => void
  resetFilters: () => void
  addUploadJob: (file: File) => string
  startJob: (id: string, file?: File) => void
}

const DEFAULT_FILTERS: Filters = {
  year: 'all',
  category: 'all',
  sentiment: 'all',
}

const SESSION_KEY = 'pcr-feedback-auth'

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  )
  const [adminEmail] = useState('admin@pcr.ac.id')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [comments] = useState<FeedbackComment[]>(COMMENTS)
  const [jobs, setJobs] = useState<ProcessJob[]>(INITIAL_JOBS)

  const login = useCallback((email: string, password: string) => {
    const ok =
      email.trim().toLowerCase() === 'admin@pcr.ac.id' && password === 'admin123'
    if (ok) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setIsAuthenticated(true)
    }
    return ok
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }, [])

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const addUploadJob = useCallback((file: File) => {
    const id = `job-${Date.now()}`
    const kb = Math.max(1, Math.round(file.size / 1024))
    const job: ProcessJob = {
      id,
      fileName: file.name,
      fileSizeLabel: `${kb} KB · File terpilih`,
      status: 'menunggu',
      message: 'File telah dipilih. Validasi dan analisis belum dimulai.',
    }
    setJobs((prev) => [job, ...prev])
    return id
  }, [])

  const startJob = useCallback(async (id: string, file?: File) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? {
              ...job,
              status: 'memvalidasi',
              message: 'Sedang memeriksa format file, kolom, dan kelengkapan data.',
            }
          : job,
      ),
    )

    // If file is provided, call backend API for actual processing
    if (file) {
      try {
        const response = await apiClient.batchProcess(file)
        console.log('Batch processing response:', response)

        // Update job with actual results
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: 'memproses',
                  message: `Validasi berhasil · ${response.total} komentar · Klasifikasi kategori sedang berjalan.`,
                  progress: {
                    preprocessing: response.total,
                    sentiment: response.total,
                    category: Math.floor(response.total * 0.6),
                    saved: 0,
                    total: response.total,
                  },
                }
              : job,
          ),
        )

        // Simulate progress updates
        const total = response.total
        let current = Math.floor(total * 0.6)

        const progressInterval = setInterval(() => {
          current += Math.ceil(total * 0.1)
          if (current >= total) {
            clearInterval(progressInterval)
            setJobs((prev) =>
              prev.map((job) =>
                job.id === id
                  ? {
                      ...job,
                      status: 'selesai',
                      message: `${total} dari ${total} komentar berhasil dianalisis dan disimpan.`,
                      progress: {
                        preprocessing: total,
                        sentiment: total,
                        category: total,
                        saved: total,
                        total,
                      },
                    }
                  : job,
              ),
            )
          } else {
            setJobs((prev) =>
              prev.map((job) =>
                job.id === id
                  ? {
                      ...job,
                      progress: {
                        preprocessing: total,
                        sentiment: total,
                        category: current,
                        saved: 0,
                        total,
                      },
                    }
                  : job,
              ),
            )
          }
        }, 500)

      } catch (error) {
        console.error('Batch processing error:', error)
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: 'gagal',
                  message: 'Gagal memproses data. Silakan coba lagi.',
                  errorDetail: error instanceof Error ? error.message : 'Unknown error',
                }
              : job,
          ),
        )
      }
    } else {
      // Fallback to simulation for demo
      window.setTimeout(() => {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: 'memproses',
                  message:
                    'Validasi berhasil · 1.000 komentar · Klasifikasi kategori sedang berjalan.',
                  progress: {
                    preprocessing: 1000,
                    sentiment: 1000,
                    category: 600,
                    saved: 0,
                    total: 1000,
                  },
                }
              : job,
          ),
        )
      }, 1400)

      window.setTimeout(() => {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: 'selesai',
                  message: '1.000 dari 1.000 komentar berhasil dianalisis dan disimpan.',
                  progress: {
                    preprocessing: 1000,
                    sentiment: 1000,
                    category: 1000,
                    saved: 1000,
                    total: 1000,
                  },
                }
              : job,
          ),
        )
      }, 3200)
    }
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated,
      adminEmail,
      filters,
      comments,
      jobs,
      login,
      logout,
      setFilters,
      resetFilters,
      addUploadJob,
      startJob,
    }),
    [
      isAuthenticated,
      adminEmail,
      filters,
      comments,
      jobs,
      login,
      logout,
      resetFilters,
      addUploadJob,
      startJob,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider')
  return ctx
}
