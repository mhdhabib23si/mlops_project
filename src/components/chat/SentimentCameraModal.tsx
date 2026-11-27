import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCamera, IconClose } from '../ui/Icons'

export function SentimentCameraModal({
  onClose,
  onPhotoCaptured,
}: {
  onClose: () => void
  onPhotoCaptured: (photo: string) => void
}) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
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
    setLoading(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Akses kamera memerlukan koneksi HTTPS atau localhost.')
      }
      setStream(await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user' },
      }))
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

  const capturePhoto = () => {
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
    setPhoto(canvas.toDataURL('image/jpeg', 0.9))
    stream.getTracks().forEach((track) => track.stop())
    setStream(null)
    setError('')
  }

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
            <h2 id="sentiment-camera-title">Ambil Foto Wajah</h2>
            <p>Posisikan wajah di tengah kamera. Foto digunakan untuk analisis ekspresi wajah.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup kamera">
            <IconClose />
          </button>
        </header>

        <div className="sentiment-camera-stage">
          {photo ? (
            <img className="sentiment-photo" src={photo} alt="Pratinjau foto wajah" />
          ) : stream ? (
            <video ref={videoRef} className="sentiment-camera-video" autoPlay playsInline muted />
          ) : (
            <div className="sentiment-camera-placeholder">
              <IconCamera size={36} />
              <span>Arahkan wajah ke tengah kamera</span>
            </div>
          )}
        </div>

        <p className="sentiment-camera-note">
          Setelah digunakan, foto dikirim sementara ke backend untuk analisis ekspresi dan tidak disimpan permanen.
        </p>
        {error && <p className="sentiment-camera-error" role="alert">{error}</p>}

        <div className="sentiment-camera-actions">
          {stream ? (
            <button type="button" className="primary-btn" onClick={capturePhoto} disabled={loading}>
              <IconCamera size={18} /> Ambil Foto
            </button>
          ) : photo ? (
            <>
              <button type="button" className="ghost-btn" onClick={startCamera} disabled={loading}>
                Ambil Ulang
              </button>
              <button type="button" className="primary-btn" onClick={() => onPhotoCaptured(photo)}>
                Gunakan Foto
              </button>
            </>
          ) : (
            <button type="button" className="primary-btn" onClick={startCamera} disabled={loading}>
              <IconCamera size={18} /> {loading ? 'Membuka Kamera...' : 'Buka Kamera'}
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
