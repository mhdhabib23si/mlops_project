import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { IconClose, IconFile, IconInfo, IconUpload } from '../ui/Icons'
import { apiClient } from '../../lib/api'

export function UploadModal({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { addUploadJob, startJob } = useApp()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'validating' | 'validated' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const pick = async (next: File | null) => {
    if (!next) return
    setFile(next)
    setUploadStatus('validating')
    setErrorMessage('')

    try {
      // Validate file with backend
      const response = await apiClient.uploadFile(next)
      setUploadStatus('validated')
      console.log('File validated:', response)
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memvalidasi file')
      console.error('Upload error:', error)
    }
  }

  const process = async () => {
    if (!file || uploadStatus !== 'validated') return

    setUploading(true)
    const id = addUploadJob(file)
    startJob(id, file)  // Pass file to startJob
    onClose()
    navigate('/proses')

    try {
      // Start batch processing in background
      const response = await apiClient.batchProcess(file)
      console.log('Batch processing started:', response)
      // Job status is updated in startJob
    } catch (error) {
      console.error('Batch processing error:', error)
      // Job status is updated in startJob
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Unggah Data</h2>
            <p>Tambahkan dataset PCRSURVEI untuk dianalisis secara otomatis.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <IconClose />
          </button>
        </div>

        <p className="hint">
          <IconInfo size={16} /> Data simulasi · Bukan hasil penelitian
        </p>

        <label
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            pick(e.dataTransfer.files[0] ?? null)
          }}
        >
          <IconUpload size={22} />
          <strong>Tarik file ke sini atau pilih dari perangkat</strong>
          <span>Format CSV atau Excel (.csv, .xlsx, .xls)</span>
          <button
            type="button"
            className="ghost-btn"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            Pilih File
          </button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".csv,.xlsx,.xls"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>

        {file && (
          <div className="file-row">
            <IconFile />
            <div>
              <strong>{file.name}</strong>
              <p>{Math.max(1, Math.round(file.size / 1024))} KB · {uploadStatus === 'validating' ? 'Memvalidasi...' : uploadStatus === 'validated' ? 'Valid' : uploadStatus === 'error' ? 'Gagal' : 'File terpilih'}</p>
            </div>
            <span className={uploadStatus === 'validated' ? 'online-status' : uploadStatus === 'error' ? 'muted' : 'muted'}>
              {uploadStatus === 'validating' ? '⏳' : uploadStatus === 'validated' ? '✓' : uploadStatus === 'error' ? '✗' : 'Menunggu'}
            </span>
            <button type="button" className="icon-btn" onClick={() => { setFile(null); setUploadStatus('idle'); setErrorMessage(''); }} aria-label="Hapus file">
              <IconClose size={16} />
            </button>
          </div>
        )}

        {uploadStatus === 'error' && errorMessage && (
          <div className="error-banner">
            {errorMessage}
          </div>
        )}

        <div className="pipeline">
          <p>Setelah validasi struktur data</p>
          <span>Preprocessing → Sentimen IndoBERT → Kategori LLaMA 3 8B Instruct → Simpan & perbarui dashboard</span>
        </div>

        <div className="info-box">
          <IconInfo size={16} />
          Analisis berjalan di latar belakang. Anda dapat meninggalkan halaman ini dan melihat status pemrosesan kembali.
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose} disabled={uploading}>
            Batal
          </button>
          <button type="button" className="primary-btn" disabled={!file || uploadStatus !== 'validated' || uploading} onClick={process}>
            {uploading ? 'Memproses...' : 'Proses Data →'}
          </button>
        </div>
      </div>
    </div>
  )
}
