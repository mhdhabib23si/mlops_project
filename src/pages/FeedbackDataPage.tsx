import { useEffect, useState } from 'react'
import { DetailDrawer } from '../components/data/DetailDrawer'
import { UploadModal } from '../components/data/UploadModal'
import { FilterBar } from '../components/ui/FilterBar'
import { IconSearch, IconUpload } from '../components/ui/Icons'
import { SentimentBadge } from '../components/ui/SentimentBadge'
import { useApp } from '../context/AppContext'
import { apiClient, type PersistedFeedbackComment } from '../lib/api'
import { formatNumber } from '../lib/format'
import type { FeedbackComment } from '../types'

const PAGE_SIZE = 7

function toFeedbackComment(comment: PersistedFeedbackComment): FeedbackComment {
  return {
    id: comment.id,
    year: comment.year,
    date: String(comment.year),
    text: comment.text,
    originalCategory: comment.original_category ?? 'Tidak tersedia',
    predictedCategory: comment.category,
    sentiment: comment.sentiment,
    labelSource: comment.label_source,
    sourceLabelConfidence: comment.source_label_confidence,
    sourceLabelMethod: comment.source_label_method,
    verificationStatus: comment.verification_status,
  }
}

export function FeedbackDataPage() {
  const { filters, setFilters, resetFilters } = useApp()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [years, setYears] = useState<string[]>([])
  const [yearError, setYearError] = useState('')
  const [pageLoad, setPageLoad] = useState<{
    key: string
    comments: PersistedFeedbackComment[]
    total: number
    error?: string
  } | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [detail, setDetail] = useState<FeedbackComment | null>(null)

  useEffect(() => {
    let active = true
    apiClient.getStats()
      .then((stats) => {
        if (active) setYears(stats.available_years.map(String))
      })
      .catch((cause: unknown) => {
        if (active) setYearError(cause instanceof Error ? cause.message : 'Gagal memuat daftar tahun.')
      })
    return () => {
      active = false
    }
  }, [])

  const search = query.trim()
  const queryKey = `${filters.year}|${filters.category}|${filters.sentiment}|${page}|${search}`

  useEffect(() => {
    let active = true
    apiClient.getComments({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      year: filters.year,
      category: filters.category,
      sentiment: filters.sentiment,
      search,
    })
      .then((result) => {
        if (!active) return
        setPageLoad({
          key: queryKey,
          comments: result.comments,
          total: result.total,
        })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setPageLoad({
          key: queryKey,
          comments: [],
          total: 0,
          error: cause instanceof Error ? cause.message : 'Gagal memuat data umpan balik.',
        })
      })
    return () => {
      active = false
    }
  }, [filters.year, filters.category, filters.sentiment, page, search, queryKey])

  const loading = !pageLoad || pageLoad.key !== queryKey
  const error = yearError || (pageLoad?.key === queryKey ? pageLoad.error ?? '' : '')
  const comments = pageLoad?.key === queryKey ? pageLoad.comments : []
  const total = pageLoad?.key === queryKey ? pageLoad.total : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const end = Math.min(safePage * PAGE_SIZE, total)
  const firstVisiblePage = Math.max(1, Math.min(safePage - 2, totalPages - 4))
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstVisiblePage + index,
  )

  return (
    <div className="page">
      <p className="crumb">Feedback Analytics | Data Umpan Balik</p>
      <header className="page-head">
        <div>
          <h1>Data Umpan Balik</h1>
          <p>
            {formatNumber(total)} komentar tersimpan
            {years.length > 0 ? ` · tahun ${years[0]}-${years[years.length - 1]}` : ''}
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowUpload(true)}>
          <IconUpload /> Unggah Data
        </button>
      </header>

      <div className="search-box">
        <IconSearch />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
          placeholder="Cari kata atau frasa dalam komentar..."
        />
      </div>

      <FilterBar
        filters={filters}
        years={years}
        onChange={(next) => {
          setFilters(next)
          setPage(1)
        }}
        onReset={() => {
          resetFilters()
          setPage(1)
        }}
      />

      {error && <div className="error-banner">Gagal memuat data: {error}</div>}

      <section className="card table-card">
        <div className="table-caption">
          <strong>Data tersimpan</strong>
          <span>{formatNumber(total)} data · Urutan terbaru</span>
        </div>
        <div className="table-scroll">
          <table className="data-table full">
            <thead>
              <tr>
                <th>No.</th>
                <th>Tahun</th>
                <th>Komentar</th>
                <th>Kategori Asli</th>
                <th>Sentimen</th>
                <th>Kategori tersimpan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>Memuat data tersimpan...</td></tr>
              ) : comments.length === 0 ? (
                <tr><td colSpan={7}>Belum ada data yang sesuai. Impor dataset asli untuk memulai.</td></tr>
              ) : comments.map((comment, index) => (
                <tr key={comment.id}>
                  <td>{start + index}</td>
                  <td>{comment.year}</td>
                  <td>{comment.text.slice(0, 86)}{comment.text.length > 86 ? '...' : ''}</td>
                  <td>{comment.original_category ?? 'Tidak tersedia'}</td>
                  <td><SentimentBadge sentiment={comment.sentiment} /></td>
                  <td>{comment.category}</td>
                  <td>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setDetail(toFeedbackComment(comment))}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            {loading ? 'Memuat...' : `Menampilkan ${start}-${end} dari ${formatNumber(total)} data`}
          </span>
          <div>
            <button type="button" disabled={safePage === 1 || loading} onClick={() => setPage(safePage - 1)}>
              ‹
            </button>
            {visiblePages.map((number) => (
              <button
                key={number}
                type="button"
                className={number === safePage ? 'active' : ''}
                onClick={() => setPage(number)}
                disabled={loading}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage === totalPages || loading}
              onClick={() => setPage(safePage + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {detail && <DetailDrawer item={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
