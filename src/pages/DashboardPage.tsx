import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryBars } from '../components/charts/CategoryBars'
import { DonutChart } from '../components/charts/DonutChart'
import { StackedBars } from '../components/charts/StackedBars'
import { SentimentTrend, VolumeTrend, volumeChange } from '../components/charts/TrendCharts'
import { UploadModal } from '../components/data/UploadModal'
import { DetailDrawer } from '../components/data/DetailDrawer'
import { APP_ROUTES } from '../lib/routes'
import { FilterBar } from '../components/ui/FilterBar'
import {
  IconArrowRight,
  IconChat,
  IconDownload,
  IconFlag,
  IconFrown,
  IconMeh,
  IconSmile,
  IconTrend,
  IconUpload,
} from '../components/ui/Icons'
import { SentimentBadge } from '../components/ui/SentimentBadge'
import { useApp } from '../context/AppContext'
import { apiClient, type DashboardStats, type PersistedFeedbackComment } from '../lib/api'
import { formatNumber, formatPercent, percentOf } from '../lib/format'
import type { FeedbackComment } from '../types'

export function DashboardPage() {
  const { filters, setFilters, resetFilters } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [detail, setDetail] = useState<FeedbackComment | null>(null)
  const [dashboardLoad, setDashboardLoad] = useState<{
    key: string
    stats?: DashboardStats
    latest: PersistedFeedbackComment[]
    error?: string
  } | null>(null)
  const filtersKey = `${filters.year}|${filters.category}|${filters.sentiment}`

  useEffect(() => {
    let active = true
    const currentFilters = {
      year: filters.year,
      category: filters.category,
      sentiment: filters.sentiment,
    }
    Promise.all([
      apiClient.getStats(currentFilters),
      apiClient.getComments({ limit: 5, ...currentFilters }),
    ])
      .then(([nextStats, recent]) => {
        if (!active) return
        setDashboardLoad({ key: filtersKey, stats: nextStats, latest: recent.comments })
      })
      .catch((error: unknown) => {
        if (!active) return
        setDashboardLoad({
          key: filtersKey,
          latest: [],
          error: error instanceof Error ? error.message : 'Gagal memuat data dashboard.',
        })
      })
    return () => {
      active = false
    }
  }, [filters.year, filters.category, filters.sentiment, filtersKey])

  const stats = dashboardLoad?.key === filtersKey ? dashboardLoad.stats ?? null : null
  const latest = dashboardLoad?.key === filtersKey ? dashboardLoad.latest : []
  const loadError = dashboardLoad?.key === filtersKey ? dashboardLoad.error ?? '' : ''
  const loading = !dashboardLoad || dashboardLoad.key !== filtersKey
  const empty = !stats || stats.total_comments === 0
  const categories = stats?.category_stats ?? []
  const years = Object.keys(stats?.yearly_totals ?? {}).sort()
  const attention = [...categories].sort((a, b) => percentOf(b.negatif, b.total) - percentOf(a.negatif, a.total))
  const topCategory = [...categories].sort((a, b) => b.total - a.total)[0]
  const worst = attention[0]
  const latestYear = years[years.length - 1]
  const previousYear = years[years.length - 2]
  const latestSentiment = latestYear ? stats?.yearly_sentiment[latestYear] : undefined
  const previousSentiment = previousYear ? stats?.yearly_sentiment[previousYear] : undefined
  const latestPositiveRate = latestYear && latestSentiment
    ? percentOf(latestSentiment.positif, stats?.yearly_totals[latestYear] ?? 0)
    : null
  const previousPositiveRate = previousYear && previousSentiment
    ? percentOf(previousSentiment.positif, stats?.yearly_totals[previousYear] ?? 0)
    : null
  const positiveChange = latestPositiveRate !== null && previousPositiveRate !== null
    ? latestPositiveRate - previousPositiveRate
    : null

  const openDetail = (comment: PersistedFeedbackComment) => {
    setDetail({
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
    })
  }

  const exportReport = () => {
    const lines = [
      'Kategori,Total,Positif,Netral,Negatif',
      ...(stats?.category_stats ?? []).map(
        (c) => `${c.name},${c.total},${c.positif},${c.netral},${c.negatif}`,
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'laporan-umpan-balik.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <p className="crumb">Feedback Analytics | Dashboard</p>
      <header className="page-head">
        <div>
          <h1>Dashboard Analisis Umpan Balik</h1>
          <p>Ringkasan hasil analisis umpan balik mahasiswa PCR.</p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={exportReport}
          disabled={!stats || stats.total_comments === 0 || loading}
        >
          <IconDownload /> Export Laporan
        </button>
      </header>
      <p className="updated">
        {loading ? 'Memuat data tersimpan...' : stats ? `${formatNumber(stats.total_comments)} komentar tersimpan di SQLite` : ''}
      </p>

      <FilterBar
        filters={filters}
        years={(stats?.available_years ?? []).map(String)}
        onChange={setFilters}
        onReset={resetFilters}
      />

      {loading && <div className="info-banner">Memuat statistik dari database...</div>}
      {loadError && <div className="error-banner">Gagal memuat data: {loadError}</div>}

      {!loading && !loadError && stats && (
        <>
      <section className="kpi-grid">
        <article className="kpi white">
          <div>
            <span>Total Umpan Balik</span>
            <IconChat />
          </div>
          <strong>{formatNumber(stats.total_comments)}</strong>
          <small>Jumlah data sesuai filter</small>
        </article>
        <article className="kpi positif">
          <div>
            <span>Sentimen Positif</span>
            <IconSmile />
          </div>
          <strong>{formatNumber(stats.total_positif)}</strong>
          <small>{formatPercent(percentOf(stats.total_positif, stats.total_comments))} dari data terfilter</small>
        </article>
        <article className="kpi netral">
          <div>
            <span>Sentimen Netral</span>
            <IconMeh />
          </div>
          <strong>{formatNumber(stats.total_netral)}</strong>
          <small>{formatPercent(percentOf(stats.total_netral, stats.total_comments))} dari data terfilter</small>
        </article>
        <article className="kpi negatif">
          <div>
            <span>Sentimen Negatif</span>
            <IconFrown />
          </div>
          <strong>{formatNumber(stats.total_negatif)}</strong>
          <small>{formatPercent(percentOf(stats.total_negatif, stats.total_comments))} dari data terfilter</small>
        </article>
      </section>

      {empty ? (
        <section className="empty-card">
          <div className="empty-icon">
            <IconTrend size={28} />
          </div>
          <h2>
            {stats.available_years.length
              ? 'Tidak ada umpan balik yang sesuai dengan filter'
              : 'Belum ada umpan balik untuk dianalisis'}
          </h2>
          <p>
            {stats.available_years.length
              ? 'Ubah filter atau pilih ulang rentang data untuk melihat hasil.'
              : 'Belum ada data di database. Unggah file asli untuk melihat ringkasan, grafik, tren, dan insight.'}
          </p>
          <button type="button" className="primary-btn" onClick={() => setShowUpload(true)}>
            <IconUpload /> Unggah Data
          </button>
          <small>Dashboard hanya menampilkan data yang benar-benar sudah diimpor.</small>
        </section>
      ) : (
        <>
          <section className="grid-2">
            <article className="card">
              <h2>Distribusi Sentimen</h2>
              <p>Proporsi dari seluruh komentar</p>
              <DonutChart
                positif={stats.total_positif}
                netral={stats.total_netral}
                negatif={stats.total_negatif}
                total={stats.total_comments}
              />
            </article>
            <article className="card">
              <h2>Umpan Balik per Kategori</h2>
              <p>
                Jumlah komentar dan bagian dari total {formatNumber(stats.total_comments)} komentar
              </p>
              <CategoryBars rows={categories} total={stats.total_comments} />
            </article>
          </section>

          <article className="card">
            <h2>Perbandingan Sentimen per Layanan</h2>
            <p>Komposisi dalam setiap kategori layanan · masing-masing batang = 100,0%</p>
            <div className="mini-legend">
              <span>
                <i className="dot positif" /> Positif
              </span>
              <span>
                <i className="dot netral" /> Netral
              </span>
              <span>
                <i className="dot negatif" /> Negatif
              </span>
            </div>
            <StackedBars rows={categories} />
            <p className="footnote">Persentase dibulatkan satu desimal. Jumlah di kanan adalah total komentar kategori.</p>
          </article>

          <section className="grid-2">
            <article className="card">
              <h2>Tren Umpan Balik Tahunan</h2>
              <p>Jumlah komentar per tahun pada data terfilter</p>
              {latestYear && (
                <p className="trend-highlight">
                  <strong>{formatNumber(stats.yearly_totals[latestYear])} komentar pada {latestYear}</strong>
                  <span>
                    {previousYear
                      ? `${volumeChange(latestYear, previousYear, stats.yearly_totals)} dari ${previousYear}`
                      : 'Belum ada tahun pembanding'}
                  </span>
                </p>
              )}
              <VolumeTrend years={years} totals={stats.yearly_totals} />
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>TAHUN</th>
                    <th>JUMLAH KOMENTAR</th>
                    <th>PERUBAHAN</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((year, i) => (
                    <tr key={year}>
                      <td>{year}</td>
                      <td>{formatNumber(stats.yearly_totals[year])}</td>
                      <td>{i === 0 ? '—' : volumeChange(year, years[i - 1], stats.yearly_totals)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="card">
              <h2>Tren Sentimen Tahunan</h2>
              <p>Proporsi sentimen terhadap total komentar tiap tahun</p>
              <div className="mini-legend">
                <span>
                  <i className="dot positif" /> Positif
                </span>
                <span>
                  <i className="dot netral" /> Netral
                </span>
                <span>
                  <i className="dot negatif" /> Negatif
                </span>
              </div>
              <SentimentTrend
                years={years}
                totals={stats.yearly_totals}
                sentiments={stats.yearly_sentiment}
              />
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>TAHUN</th>
                    <th>POSITIF</th>
                    <th>NETRAL</th>
                    <th>NEGATIF</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((year) => {
                    const s = stats.yearly_sentiment[year]
                    const t = stats.yearly_totals[year]
                    return (
                      <tr key={year}>
                        <td>{year}</td>
                        <td>
                          {formatNumber(s.positif)} · {formatPercent(percentOf(s.positif, t))}
                        </td>
                        <td>
                          {formatNumber(s.netral)} · {formatPercent(percentOf(s.netral, t))}
                        </td>
                        <td>
                          {formatNumber(s.negatif)} · {formatPercent(percentOf(s.negatif, t))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="footnote">Rincian jumlah komentar · persentase dari total tiap tahun.</p>
            </article>
          </section>

          <section className="card">
            <h2>Insight Utama</h2>
            <div className="insight-grid">
              <article>
                <p>
                  <IconChat size={16} /> Kategori Terbanyak
                </p>
                <h3>{topCategory?.name}</h3>
                <strong>{formatNumber(topCategory?.total ?? 0)}</strong>
                <small>
                  komentar · {formatPercent(percentOf(topCategory?.total ?? 0, stats.total_comments))} dari total
                </small>
                <p>Kategori dengan jumlah komentar terbanyak pada data terfilter.</p>
              </article>
              <article>
                <p>
                  <IconFlag size={16} /> Sentimen Negatif Tertinggi
                </p>
                <h3>{worst?.name}</h3>
                <strong>{formatPercent(percentOf(worst?.negatif ?? 0, worst?.total ?? 1))}</strong>
                <small>
                  {formatNumber(worst?.negatif ?? 0)} dari {formatNumber(worst?.total ?? 0)} komentar
                </small>
                <p>Proporsi negatif tertinggi di antara kategori yang memiliki data.</p>
              </article>
              <article>
                <p>
                  <IconTrend size={16} /> Perubahan Sentimen
                </p>
                <h3>
                  {previousYear && latestYear
                    ? `${latestYear} dibandingkan ${previousYear}`
                    : 'Belum ada data pembanding'}
                </h3>
                <strong>
                  {positiveChange === null
                    ? '—'
                    : `${positiveChange >= 0 ? '+' : ''}${positiveChange.toFixed(1).replace('.', ',')}`}
                </strong>
                <small>poin persentase · sentimen positif</small>
                <p>
                  {latestPositiveRate !== null && previousPositiveRate !== null
                    ? `Proporsi positif: ${formatPercent(previousPositiveRate)} → ${formatPercent(latestPositiveRate)}.`
                    : 'Perlu data dari minimal dua tahun untuk membandingkan tren.'}
                </p>
              </article>
            </div>
          </section>

          <section className="card attention">
            <div className="attention-head">
              <h2>Kategori yang Perlu Diperhatikan</h2>
              <p>Diurutkan berdasarkan proporsi sentimen negatif dalam setiap kategori, bukan jumlah komentar semata.</p>
            </div>
            <table className="attention-table">
              <thead>
                <tr>
                  <th>KATEGORI LAYANAN</th>
                  <th>PROPORSI NEGATIF</th>
                  <th>JUMLAH NEGATIF / TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>
                      <div className="neg-track">
                        <span style={{ width: `${percentOf(row.negatif, row.total)}%` }} />
                      </div>
                    </td>
                    <td>
                      <b>{formatPercent(percentOf(row.negatif, row.total))}</b>
                      <small>
                        {formatNumber(row.negatif)} / {formatNumber(row.total)} komentar
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card">
            <div className="table-head">
              <div>
                <h2>Umpan Balik Mahasiswa Terbaru</h2>
                <p>Komentar terbaru dari data yang tersimpan</p>
              </div>
              <Link to={APP_ROUTES.adminData} className="text-btn">
                Lihat Semua Data <IconArrowRight size={16} />
              </Link>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Komentar Mahasiswa</th>
                  <th>Kategori Layanan</th>
                  <th>Sentimen</th>
                  <th>Tahun</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={row.id}>
                    <td>{row.text.slice(0, 92)}{row.text.length > 92 ? '...' : ''}</td>
                    <td>{row.category}</td>
                    <td>
                      <SentimentBadge sentiment={row.sentiment} />
                    </td>
                    <td>{row.year}</td>
                    <td>
                      <button type="button" className="link-btn" onClick={() => openDetail(row)}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
        </>
      )}

      <footer className="page-foot">
        <span>Politeknik Caltex Riau · Analisis Umpan Balik Mahasiswa</span>
        <span>IndoBERT · LLaMA 3 8B Instruct</span>
      </footer>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {detail && <DetailDrawer item={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
