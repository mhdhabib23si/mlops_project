import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryBars } from '../components/charts/CategoryBars'
import { DonutChart } from '../components/charts/DonutChart'
import { StackedBars } from '../components/charts/StackedBars'
import { SentimentTrend, VolumeTrend, volumeChange } from '../components/charts/TrendCharts'
import { UploadModal } from '../components/data/UploadModal'
import { DetailDrawer } from '../components/data/DetailDrawer'
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
import {
  CATEGORY_STATS,
  SURVEY_YEARS,
  TOTAL_COMMENTS,
  TOTAL_NEGATIF,
  TOTAL_NETRAL,
  TOTAL_POSITIF,
  YEARLY_SENTIMENT,
  YEARLY_TOTALS,
} from '../data/dashboard'
import { formatNumber, formatPercent, percentOf } from '../lib/format'
import type { FeedbackComment } from '../types'

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

export function DashboardPage() {
  const { filters, setFilters, resetFilters, comments } = useApp()
  const [showUpload, setShowUpload] = useState(false)
  const [detail, setDetail] = useState<FeedbackComment | null>(null)

  const filteredComments = useMemo(
    () =>
      comments.filter((c) => {
        if (filters.year !== 'all' && String(c.year) !== filters.year) return false
        if (filters.sentiment !== 'all' && c.sentiment !== filters.sentiment) return false
        if (filters.category !== 'all' && !matchesCategory(c.predictedCategory, filters.category)) return false
        return true
      }),
    [comments, filters],
  )

  const stats = useMemo(() => {
    const year = filters.year
    let total = year === 'all' ? TOTAL_COMMENTS : YEARLY_TOTALS[year]
    let positif = year === 'all' ? TOTAL_POSITIF : YEARLY_SENTIMENT[year].positif
    let netral = year === 'all' ? TOTAL_NETRAL : YEARLY_SENTIMENT[year].netral
    let negatif = year === 'all' ? TOTAL_NEGATIF : YEARLY_SENTIMENT[year].negatif
    let categories = CATEGORY_STATS.map((c) => ({ ...c }))

    if (filters.category !== 'all') {
      categories = categories.filter((c) => c.name === filters.category)
      const cat = categories[0]
      if (cat) {
        total = cat.total
        positif = cat.positif
        netral = cat.netral
        negatif = cat.negatif
      }
    }
    if (filters.sentiment === 'Positif') {
      total = positif
      netral = 0
      negatif = 0
    } else if (filters.sentiment === 'Netral') {
      total = netral
      positif = 0
      negatif = 0
    } else if (filters.sentiment === 'Negatif') {
      total = negatif
      positif = 0
      netral = 0
    }
    return { total, positif, netral, negatif, categories }
  }, [filters])

  const empty = stats.total === 0
  const attention = [...stats.categories].sort((a, b) => percentOf(b.negatif, b.total) - percentOf(a.negatif, a.total))
  const topCategory = [...stats.categories].sort((a, b) => b.total - a.total)[0]
  const worst = attention[0]
  const latest = filteredComments.slice(0, 5)

  const exportReport = () => {
    const lines = [
      'Kategori,Total,Positif,Netral,Negatif',
      ...stats.categories.map(
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
        <button type="button" className="primary-btn" onClick={exportReport}>
          <IconDownload /> Export Laporan
        </button>
      </header>
      <p className="updated">Diperbarui 20 Des 2025, 09.30 WIB</p>

      <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />

      <section className="kpi-grid">
        <article className="kpi white">
          <div>
            <span>Total Umpan Balik</span>
            <IconChat />
          </div>
          <strong>{formatNumber(stats.total)}</strong>
          <small>Periode survei 2022-2025</small>
        </article>
        <article className="kpi positif">
          <div>
            <span>Sentimen Positif</span>
            <IconSmile />
          </div>
          <strong>{formatNumber(stats.positif)}</strong>
          <small>{formatPercent(percentOf(stats.positif, stats.total || 1))} dari seluruh komentar</small>
        </article>
        <article className="kpi netral">
          <div>
            <span>Sentimen Netral</span>
            <IconMeh />
          </div>
          <strong>{formatNumber(stats.netral)}</strong>
          <small>{formatPercent(percentOf(stats.netral, stats.total || 1))} dari seluruh komentar</small>
        </article>
        <article className="kpi negatif">
          <div>
            <span>Sentimen Negatif</span>
            <IconFrown />
          </div>
          <strong>{formatNumber(stats.negatif)}</strong>
          <small>{formatPercent(percentOf(stats.negatif, stats.total || 1))} dari seluruh komentar</small>
        </article>
      </section>

      {empty ? (
        <section className="empty-card">
          <div className="empty-icon">
            <IconTrend size={28} />
          </div>
          <h2>Belum ada umpan balik untuk dianalisis</h2>
          <p>
            Unggah dataset PCRSURVEI pertama untuk melihat distribusi sentimen, kategori layanan, tren tahunan, dan
            insight.
          </p>
          <button type="button" className="primary-btn" onClick={() => setShowUpload(true)}>
            <IconUpload /> Unggah Data
          </button>
          <small>Grafik, insight, dan komentar terbaru akan tampil setelah pemrosesan data selesai.</small>
        </section>
      ) : (
        <>
          <section className="grid-2">
            <article className="card">
              <h2>Distribusi Sentimen</h2>
              <p>Proporsi dari seluruh komentar</p>
              <DonutChart
                positif={stats.positif}
                netral={stats.netral}
                negatif={stats.negatif}
                total={stats.total}
              />
            </article>
            <article className="card">
              <h2>Umpan Balik per Kategori</h2>
              <p>
                Jumlah komentar dan bagian dari total {formatNumber(stats.total)} komentar
              </p>
              <CategoryBars rows={stats.categories} total={stats.total} />
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
            <StackedBars rows={stats.categories} />
            <p className="footnote">Persentase dibulatkan satu desimal. Jumlah di kanan adalah total komentar kategori.</p>
          </article>

          <section className="grid-2">
            <article className="card">
              <h2>Tren Umpan Balik Tahunan</h2>
              <p>Jumlah komentar · periode survei 2022-2025</p>
              <p className="trend-highlight">
                <strong>{formatNumber(YEARLY_TOTALS['2025'])} komentar pada 2025</strong>
                <span>{volumeChange('2025', '2024')} dari 2024</span>
              </p>
              <VolumeTrend />
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>TAHUN</th>
                    <th>JUMLAH KOMENTAR</th>
                    <th>PERUBAHAN</th>
                  </tr>
                </thead>
                <tbody>
                  {SURVEY_YEARS.map((year, i) => (
                    <tr key={year}>
                      <td>{year}</td>
                      <td>{formatNumber(YEARLY_TOTALS[year])}</td>
                      <td>{i === 0 ? '—' : volumeChange(year, SURVEY_YEARS[i - 1])}</td>
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
              <SentimentTrend />
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
                  {SURVEY_YEARS.map((year) => {
                    const s = YEARLY_SENTIMENT[year]
                    const t = YEARLY_TOTALS[year]
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
                <small>komentar · {formatPercent(percentOf(topCategory?.total ?? 0, stats.total))} dari total</small>
                <p>Kategori yang paling banyak dibahas pada periode 2022-2025.</p>
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
                <p>Proporsi negatif tertinggi di antara tujuh kategori layanan.</p>
              </article>
              <article>
                <p>
                  <IconTrend size={16} /> Perubahan Sentimen
                </p>
                <h3>2025 dibandingkan 2024</h3>
                <strong>+4,3</strong>
                <small>poin persentase · positif</small>
                <p>Positif: 55,3% → 59,5%; selisih dihitung sebelum pembulatan, bukan ukuran kualitas layanan.</p>
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
                <p>Lima komentar terbaru · anonim · data simulasi</p>
              </div>
              <Link to="/data" className="text-btn">
                Lihat Semua Data <IconArrowRight size={16} />
              </Link>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Komentar Mahasiswa</th>
                  <th>Kategori Layanan</th>
                  <th>Sentimen</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={row.id}>
                    <td>{row.text.slice(0, 92)}...</td>
                    <td>{row.predictedCategory}</td>
                    <td>
                      <SentimentBadge sentiment={row.sentiment} />
                    </td>
                    <td>{row.date.replace(' Desember ', ' Des ')}</td>
                    <td>
                      <button type="button" className="link-btn" onClick={() => setDetail(row)}>
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

      <footer className="page-foot">
        <span>Politeknik Caltex Riau · Analisis Umpan Balik Mahasiswa</span>
        <span>IndoBERT · LLaMA 3 8B Instruct</span>
      </footer>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {detail && <DetailDrawer item={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
