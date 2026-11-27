import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SentimentCameraModal } from '../components/chat/SentimentCameraModal'
import { SentimentBadge } from '../components/ui/SentimentBadge'
import { IconCamera, IconHeartMark } from '../components/ui/Icons'
import { apiClient, type CommentResponse, type FaceAnalysisResponse } from '../lib/api'
import { APP_ROUTES } from '../lib/routes'

export function UserFeedbackPage() {
  const [cameraPhoto, setCameraPhoto] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysisResponse | null>(null)
  const [faceLoading, setFaceLoading] = useState(false)
  const [faceError, setFaceError] = useState('')
  const [comment, setComment] = useState('')
  const [textAnalysis, setTextAnalysis] = useState<CommentResponse | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState('')

  const analyzePhoto = async (photo: string) => {
    setFaceAnalysis(null)
    setFaceError('')
    setFaceLoading(true)

    try {
      const image = await fetch(photo).then((response) => response.blob())
      setFaceAnalysis(await apiClient.analyzeFace(image))
    } catch (error) {
      setFaceError(error instanceof Error ? error.message : 'Gagal menganalisis foto.')
    } finally {
      setFaceLoading(false)
    }
  }

  const handlePhotoCaptured = (photo: string) => {
    setCameraPhoto(photo)
    setCameraOpen(false)
    setTextAnalysis(null)
    setTextError('')
    void analyzePhoto(photo)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const feedback = comment.trim()
    if (!feedback || !faceAnalysis || textLoading) return

    setTextAnalysis(null)
    setTextError('')
    setTextLoading(true)
    try {
      setTextAnalysis(await apiClient.analyzeComment(feedback))
    } catch (error) {
      setTextError(error instanceof Error ? error.message : 'Gagal menganalisis umpan balik.')
    } finally {
      setTextLoading(false)
    }
  }

  return (
    <div className="user-chat-page">
      <header className="user-chat-header">
        <Link to={APP_ROUTES.user} className="user-chat-brand">
          <IconHeartMark size={30} />
          <span>Suara Mahasiswa PCR</span>
        </Link>
        <Link to={APP_ROUTES.adminLogin} className="user-admin-link">Masuk Admin</Link>
      </header>

      <main className="user-chat-main">
        <div className="user-chat-intro">
          <p className="crumb">Politeknik Caltex Riau · Umpan Balik Mahasiswa</p>
          <h1>Sampaikan umpan balik Anda</h1>
          <p>Ambil foto terlebih dahulu, lalu tulis pengalaman Anda untuk dianalisis.</p>
        </div>

        {!cameraPhoto ? (
          <section className="chat-access-gate user-camera-gate">
            <div className="chat-access-icon"><IconCamera size={28} /></div>
            <h2>Ambil foto untuk memulai</h2>
            <p>
              Kamera dan analisis ekspresi wajah diperlukan sebelum Anda dapat mengirim umpan balik.
            </p>
            <button type="button" className="primary-btn" onClick={() => setCameraOpen(true)}>
              <IconCamera size={18} /> Buka Kamera
            </button>
          </section>
        ) : (
          <div className="user-feedback-flow">
            <section className="user-feedback-card">
              <h2>Analisis ekspresi wajah</h2>
              <div className="sentiment-camera-stage">
                <img className="sentiment-photo" src={cameraPhoto} alt="Foto yang diambil untuk analisis ekspresi" />
              </div>

              {faceLoading && <p className="user-feedback-status" role="status">Sedang menganalisis ekspresi wajah...</p>}
              {faceError && <p className="sentiment-camera-error" role="alert">{faceError}</p>}
              {faceAnalysis && (
                <div className={`sentiment-analysis-result ${faceAnalysis.sentiment.toLowerCase()}`}>
                  <strong>Sentimen wajah: <SentimentBadge sentiment={faceAnalysis.sentiment} /></strong>
                  <small>
                    Ekspresi: {faceAnalysis.emotion} · Keyakinan {Math.round(faceAnalysis.confidence * 100)}%
                  </small>
                  {faceAnalysis.adjusted_for_sad && (
                    <small>
                      Skor tertinggi model: {faceAnalysis.model_emotion} ({Math.round(faceAnalysis.model_confidence * 100)}%).
                      Skor sedih cukup dekat, jadi dipilih sedih untuk mengurangi kasus murung terbaca netral.
                      Penyesuaian ini dapat meningkatkan hasil sedih palsu.
                    </small>
                  )}
                </div>
              )}

              <div className="user-feedback-actions">
                {faceError && (
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={faceLoading}
                    onClick={() => void analyzePhoto(cameraPhoto)}
                  >
                    Coba Analisis Lagi
                  </button>
                )}
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={faceLoading}
                  onClick={() => setCameraOpen(true)}
                >
                  <IconCamera size={16} /> Ambil Foto Ulang
                </button>
              </div>
            </section>

            {faceAnalysis && (
              <section className="user-feedback-card">
                <h2>Umpan balik Anda</h2>
                <form className="user-feedback-form" onSubmit={handleSubmit}>
                  <label className="field">
                    <span>Ceritakan pengalaman Anda</span>
                    <textarea
                      className="user-feedback-textarea"
                      value={comment}
                      onChange={(event) => {
                        setComment(event.target.value)
                        setTextAnalysis(null)
                        setTextError('')
                      }}
                      placeholder="Tulis pendapat tentang layanan kampus..."
                      rows={6}
                      maxLength={2000}
                      required
                    />
                  </label>
                  <button type="submit" className="primary-btn" disabled={!comment.trim() || textLoading}>
                    {textLoading ? 'Menganalisis...' : 'Analisis Umpan Balik'}
                  </button>
                </form>

                {textError && <p className="sentiment-camera-error" role="alert">{textError}</p>}
                {textAnalysis && (
                  <div className={`sentiment-analysis-result ${textAnalysis.sentiment.toLowerCase()}`} aria-live="polite">
                    <strong>Sentimen teks: <SentimentBadge sentiment={textAnalysis.sentiment} /></strong>
                    <small>Kategori: {textAnalysis.category}</small>
                    <small>Keyakinan analisis: {Math.round(textAnalysis.confidence * 100)}%</small>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      <footer className="user-chat-footer">
        Foto diproses sementara untuk analisis ekspresi. Hasil analisis saat ini hanya ditampilkan dan belum disimpan.
      </footer>

      {cameraOpen && (
        <SentimentCameraModal
          onClose={() => setCameraOpen(false)}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}
    </div>
  )
}
