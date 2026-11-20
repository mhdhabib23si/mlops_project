import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCamera, IconClose } from '../ui/Icons'
import { apiClient, type FaceAnalysisResponse } from '../../lib/api'

const EMOTION_LABELS: Record<string, string> = {
  happy: 'Senang',
  neutral: 'Datar',
  surprise: 'Terkejut',
  sad: 'Sedih',
  angry: 'Marah',
  disgust: 'Jijik',
  fear: 'Takut',
}

export function SentimentCameraModal({ onClose }: { onClose: () => void }) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<FaceAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      void videoRef.current.play().catch(() => {
        setError('Kamera tidak dapat menampilkan pratinjau. Coba muat ulang halaman.')
      })
    }

    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const startCamera = async () => {
    setError('')
    setPhoto(null)
    setAnalysis(null)
    setLoading(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Akses kamera memerlukan koneksi HTTPS atau localhost.')
      }
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' },
      })
      setStream(cameraStream)
    } catch (cameraError) {
      console.error('Camera access error:', cameraError)
      setError(
        cameraError instanceof Error && cameraError.message.includes('HTTPS')
          ? cameraError.message
          : cameraError instanceof DOMException && cameraError.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Izinkan akses kamera melalui pengaturan browser.'
            : 'Kamera tidak tersedia. Periksa kamera dan coba lagi.',
      )
    } finally {
      setLoading(false)
    }
  }

  const captureAndAnalyze = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight || !stream) {
      setError('Kamera belum siap. Tunggu pratinjau muncul, lalu coba lagi.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setError('Foto tidak dapat diproses oleh browser ini.')
      return
    }

    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!image) {
      setError('Foto tidak dapat dibuat. Coba ambil foto lagi.')
      return
    }

    setPhoto(canvas.toDataURL('image/jpeg', 0.9))
    setAnalysis(null)
    setError('')
    stream.getTracks().forEach((track) => track.stop())
    setStream(null)
    setLoading(true)
    try {
      setAnalysis(await apiClient.analyzeFace(image))
    } catch (analysisError) {
      console.error('Facial expression analysis error:', analysisError)
      setError(analysisError instanceof Error ? analysisError.message : 'Analisis ekspresi gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const emotion = analysis ? (EMOTION_LABELS[analysis.emotion] || analysis.emotion) : ''
  const confidence = analysis ? Math.round(analysis.confidence * 100) : 0

  return createPortal(
    <div
      className="modal-backdrop sentiment-camera-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="modal sentiment-camera-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sentiment-camera-title"
      >
        <header className="modal-head">
          <div>
            <h2 id="sentiment-camera-title">Deteksi Sentimen Wajah</h2>
            <p>Ambil foto dan model akan mengenali ekspresi serta menentukan sentimennya.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup kamera">
            <IconClose />
          </button>
        </header>

        <div className="sentiment-camera-stage">
          {photo ? (
            <img className="sentiment-photo" src={photo} alt="Foto untuk analisis ekspresi wajah" />
          ) : stream ? (
            <video ref={videoRef} className="sentiment-camera-video" autoPlay playsInline muted />
          ) : (
            <div className="sentiment-camera-placeholder">
              <IconCamera size={36} />
              <span>Arahkan wajah ke tengah kamera</span>
            </div>
          )}
        </div>

        {analysis && (
          <div className={`sentiment-analysis-result ${analysis.sentiment.toLowerCase()}`} role="status">
            <strong>Ekspresi: {emotion}</strong>
            <span>Sentimen: {analysis.sentiment}</span>
            <small>Tingkat keyakinan model: {confidence}%</small>
          </div>
        )}
        <p className="sentiment-camera-note">
          Foto dikirim ke backend aplikasi ini untuk analisis, bukan ke LM Studio. Akurasi uji model sekitar 71%
          pada FER2013; pencahayaan dan posisi wajah dapat memengaruhi hasil.
        </p>
        {error && <p className="sentiment-camera-error" role="alert">{error}</p>}

        <div className="sentiment-camera-actions">
          {photo && analysis && (
            <a className="ghost-btn sentiment-download" href={photo} download={`foto-sentimen-${analysis.sentiment.toLowerCase()}.jpg`}>
              Unduh Foto
            </a>
          )}
          {stream ? (
            <button type="button" className="primary-btn" onClick={captureAndAnalyze} disabled={loading}>
              <IconCamera size={18} /> {loading ? 'Menganalisis Ekspresi...' : 'Analisis Ekspresi'}
            </button>
          ) : (
            <button type="button" className="primary-btn" onClick={startCamera} disabled={loading}>
              <IconCamera size={18} /> {loading ? 'Menganalisis Ekspresi...' : photo ? 'Ambil Ulang' : 'Buka Kamera'}
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
