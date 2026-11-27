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
  onRetry,
}: {
  job: ProcessJob
  onRetry: () => void
}) {
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

      {job.status === 'memvalidasi' && (
        <p className="job-note">Analisis model belum dimulai. Hasil validasi akan ditampilkan setelah pemeriksaan selesai.</p>
      )}

      {job.status === 'memproses' && (
        <p className="job-note">
          <IconRefresh /> Backend sedang menganalisis data dan menyimpannya ke SQLite.
        </p>
      )}

      {job.status === 'selesai' && (
        <p className="success-note">
          <IconCheck /> {formatNumber(job.progress?.saved ?? 0)} komentar berhasil diproses dan disimpan.
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
    void startJob(id, file)
  }

  return (
    <div className="page">
      <p className="crumb">Feedback Analytics | Proses Data</p>
      <header className="page-head">
        <div>
          <h1>Status Pemrosesan</h1>
        </div>
        <button type="button" className="primary-btn" onClick={() => inputRef.current?.click()}>
          <IconUpload /> Unggah Data
        </button>
      </header>

      {jobs.length === 0 && (
        <section className="empty-card">
          <div className="empty-icon">
            <IconInfo />
          </div>
          <h2>Belum ada proses data</h2>
          <p>Unggah file CSV atau Excel berisi kolom Komentar dan Tahun untuk memulai analisis.</p>
        </section>
      )}

      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
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
