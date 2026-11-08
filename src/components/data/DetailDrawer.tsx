import type { FeedbackComment } from '../../types'
import { IconClose, IconInfo } from '../ui/Icons'
import { SentimentBadge } from '../ui/SentimentBadge'

export function DetailDrawer({
  item,
  onClose,
}: {
  item: FeedbackComment
  onClose: () => void
}) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">DATA UMPAN BALIK</p>
            <h2>Detail Umpan Balik</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">
            <IconClose />
          </button>
        </div>

        <div className="meta-grid">
          <div>
            <span>Tahun survei</span>
            <strong>{item.year}</strong>
          </div>
          <div>
            <span>Tanggal</span>
            <strong>{item.date}</strong>
          </div>
        </div>

        <section className="panel">
          <h3>Komentar mahasiswa</h3>
          <p>{item.text}</p>
          <p className="hint">
            <IconInfo size={14} /> Komentar anonim · Tanpa identitas mahasiswa
          </p>
        </section>

        <section className="panel">
          <h3>Informasi dan hasil analisis</h3>
          <label>
            Kategori asli · PCRSURVEI
            <strong>{item.originalCategory}</strong>
          </label>
          <label>
            Hasil sentimen
            <SentimentBadge sentiment={item.sentiment} />
          </label>
          <label>
            Hasil kategori prediksi
            <strong>{item.predictedCategory}</strong>
          </label>
        </section>

        <div className="drawer-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Tutup
          </button>
        </div>
      </aside>
    </div>
  )
}
