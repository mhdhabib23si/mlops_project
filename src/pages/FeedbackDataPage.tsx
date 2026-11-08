import { useMemo, useState } from 'react'
import { DetailDrawer } from '../components/data/DetailDrawer'
import { UploadModal } from '../components/data/UploadModal'
import { FilterBar } from '../components/ui/FilterBar'
import { IconSearch, IconUpload } from '../components/ui/Icons'
import { SentimentBadge } from '../components/ui/SentimentBadge'
import { useApp } from '../context/AppContext'
import { formatNumber } from '../lib/format'
import type { FeedbackComment } from '../types'

const PAGE_SIZE = 7

function matchesCategory(predicted: string, filter: string) {
  const map: Record<string, string> = {
    Kemahasiswaan: 'Kemahasiswaan',
    Keuangan: 'Keuangan',
    'Sistem & TI': 'Sistem',
    Perpustakaan: 'Perpustakaan',
    'Kerjasama & Karir': 'Kerjasama',
    BAAK: 'BAAK',
    'Sarana & Prasarana': 'Sarana',
  }
  return predicted.includes(map[filter] ?? filter)
}

export function FeedbackDataPage() {
  const { filters, setFilters, resetFilters, comments } = useApp()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<FeedbackComment | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return comments.filter((c) => {
      if (filters.year !== 'all' && String(c.year) !== filters.year) return false
      if (filters.sentiment !== 'all' && c.sentiment !== filters.sentiment) return false
      if (filters.category !== 'all' && !matchesCategory(c.predictedCategory, filters.category)) return false
      if (q && !c.text.toLowerCase().includes(q) && !c.predictedCategory.toLowerCase().includes(q)) return false
      return true
    })
  }, [comments, filters, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const start = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const end = Math.min(safePage * PAGE_SIZE, filtered.length)

  return (
    <div className="page">
      <p className="crumb">Feedback Analytics | Data Umpan Balik</p>
      <header className="page-head">
        <div>
          <h1>Data Umpan Balik</h1>
          <p>{formatNumber(70000)} komentar mahasiswa · periode survei 2022-2025</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => setShowUpload(true)}>
          <IconUpload /> Unggah Data
        </button>
      </header>

      <div className="search-box">
        <IconSearch />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          placeholder="Cari kata atau frasa dalam komentar..."
        />
      </div>

      <FilterBar
        filters={filters}
        onChange={(next) => {
          setFilters(next)
          setPage(1)
        }}
        onReset={() => {
          resetFilters()
          setPage(1)
        }}
      />

      <section className="card table-card">
        <div className="table-caption">
          <strong>Seluruh komentar</strong>
          <span>
            {formatNumber(filtered.length)} data · Urutan terbaru
          </span>
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
              <th>Kategori Prediksi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{start + i}</td>
                <td>{row.year}</td>
                <td>{row.text.slice(0, 86)}{row.text.length > 86 ? '...' : ''}</td>
                <td>{row.originalCategory}</td>
                <td>
                  <SentimentBadge sentiment={row.sentiment} />
                </td>
                <td>{row.predictedCategory}</td>
                <td>
                  <button type="button" className="link-btn" onClick={() => setDetail(row)}>
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
            Menampilkan {start}-{end} dari {formatNumber(filtered.length)} data
          </span>
          <div>
            <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={n === safePage ? 'active' : ''}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
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
