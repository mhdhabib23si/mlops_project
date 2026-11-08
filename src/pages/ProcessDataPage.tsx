import { useRef } from 'react'
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconInfo,
  IconRefresh,
  IconUpload,
} from '../components/ui/Icons'
import { useApp } from '../context/AppContext'
import { formatNumber } from '../lib/format'
import type { ProcessJob } from '../types'

function StatusPill({ status }: { status: ProcessJob['status'] }) {
  const map = {
    menunggu: 'Menunggu',
    memvalidasi: 'Memvalidasi Data',
    memproses: 'Memproses Data',
    selesai: 'Selesai',
    gagal: 'Gagal',
  }
  return <span className={`status-pill ${status}`}>{map[status]}</span>
}

function JobCard({
  job,
  onStart,
  onRetry,
}: {
  job: ProcessJob
  onStart: (id: string) => void
  onRetry: () => void
}) {
  const total = job.progress?.total ?? 0
  const categoryPct = total ? Math.round(((job.progress?.category ?? 0) / total) * 100) : 0

  return (
    <article className={`job-card ${job.status}`}>
      <header>
        <div className="job-title">
          {job.status === 'selesai' && <IconCheck />}
          {job.status === 'gagal' && <IconAlert />}
          {(job.status === 'menunggu' || job.status === 'memvalidasi' || job.status === 'memproses') && (
            job.status === 'menunggu' ? <IconClock /> : <IconRefresh />
          )}
          <div>
            <strong>{job.fileName}</strong>
            <p>{job.message}</p>
          </div>
        </div>
        <StatusPill status={job.status} />
      </header>

      {job.status === 'menunggu' && (
        <div className="job-actions">
          <p>Tekan Proses Data untuk memulai pemeriksaan file.</p>
          <button type="button" className="primary-btn" onClick={() => onStart(job.id)}>
            Proses Data
          </button>
        </div>
      )}

      {job.status === 'memvalidasi' && (
        <p className="job-note">Analisis model belum dimulai. Hasil validasi akan ditampilkan setelah pemeriksaan selesai.</p>
      )}

      {job.status === 'memproses' && job.progress && (
        <div className="progress-block">
          <div className="steps">
            <div className="done">
              <IconCheck /> Preprocessing
              <small>Selesai</small>
            </div>
            <div className="done">
              <IconCheck /> Prediksi Sentimen
              <small>
                {formatNumber(job.progress.sentiment)} / {formatNumber(job.progress.total)}
              </small>
            </div>
            <div className="current">
              <IconRefresh /> Identifikasi Kategori
              <small>
                {formatNumber(job.progress.category)} / {formatNumber(job.progress.total)}
              </small>
            </div>
            <div>
              <IconClock /> Simpan & perbarui
              <small>Menunggu</small>
            </div>
          </div>
          <div className="bar">
            <span style={{ width: `${categoryPct}%` }} />
          </div>
          <p>
            {categoryPct.toFixed(1).replace('.', ',')}% tahap kategori · Anda dapat meninggalkan halaman ini. Proses tetap
            berjalan di latar belakang.
          </p>
        </div>
      )}

      {job.status === 'selesai' && (
        <p className="success-note">
          <IconCheck /> Preprocessing, prediksi sentimen, dan identifikasi kategori selesai. Dashboard telah diperbarui
          untuk unggahan ini.
        </p>
      )}

      {job.status === 'gagal' && (
        <>
          <div className="error-panel">
            <strong>
              <IconAlert /> Data belum dapat diproses
            </strong>
            <p>{job.errorDetail}</p>
          </div>
          <div className="job-actions end">
            <button type="button" className="ghost-btn" onClick={onRetry}>
              <IconUpload /> Pilih File Lain
            </button>
          </div>
        </>
      )}
    </article>
  )
}

export function ProcessDataPage() {
  const { jobs, startJob, addUploadJob } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)

  const retry = (file: File | null) => {
    if (!file) return
    const id = addUploadJob(file)
    startJob(id)
  }

  return (
    <div className="page">
      <p className="crumb">Feedback Analytics | Proses Data</p>
      <header className="page-head">
        <div>
          <h1>Status Pemrosesan</h1>
        </div>
      </header>

      <div className="info-banner">
        <IconInfo /> Setiap kartu adalah contoh unggahan berbeda, bukan proses yang berlangsung bersamaan.
      </div>

      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onStart={startJob}
          onRetry={() => inputRef.current?.click()}
        />
      ))}

      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".csv,.xlsx,.xls"
        onChange={(e) => {
          retry(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </div>
  )
}
