import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiClient } from '../lib/api'
import type { Filters, ProcessJob } from '../types'

interface AppState {
  isAuthenticated: boolean
  adminEmail: string
  filters: Filters
  jobs: ProcessJob[]
  login: (email: string, password: string) => boolean
  logout: () => void
  setFilters: (next: Filters) => void
  resetFilters: () => void
  addUploadJob: (file: File) => string
  startJob: (id: string, file: File) => void
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
  const [jobs, setJobs] = useState<ProcessJob[]>([])

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

  const startJob = useCallback(async (id: string, file: File) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? {
              ...job,
              status: 'memproses',
              message: 'Data sedang dianalisis dan disimpan ke database.',
            }
          : job,
      ),
    )

    try {
      if (!file) throw new Error('File sumber tidak ditemukan. Silakan unggah file kembali.')
      const response = await apiClient.batchProcess(file)
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id
            ? {
                ...job,
                status: 'selesai',
                message: response.message ?? `${response.processed} komentar berhasil dianalisis.`,
                progress: {
                  preprocessing: response.processed,
                  sentiment: response.processed,
                  category: response.processed,
                  saved: response.processed,
                  total: response.total,
                },
              }
            : job,
        ),
      )
    } catch (error) {
      console.error('Batch processing error:', error)
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id
            ? {
                ...job,
                status: 'gagal',
                message: 'Gagal memproses data. Silakan periksa file dan coba lagi.',
                errorDetail: error instanceof Error ? error.message : 'Unknown error',
              }
            : job,
        ),
      )
    }
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated,
      adminEmail,
      filters,
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
