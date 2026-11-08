import { formatNumber, formatPercent } from '../../lib/format'

export function DonutChart({
  positif,
  netral,
  negatif,
  total,
}: {
  positif: number
  netral: number
  negatif: number
  total: number
}) {
  const r = 70
  const c = 2 * Math.PI * r
  const p1 = total ? (positif / total) * c : 0
  const p2 = total ? (netral / total) * c : 0
  const p3 = total ? (negatif / total) * c : 0

  return (
    <div className="donut-wrap">
      <div className="donut-visual">
      <svg viewBox="0 0 200 200" className="donut">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#EEF3F6" strokeWidth="22" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="#5AA0B3"
          strokeWidth="22"
          strokeDasharray={`${p1} ${c - p1}`}
          strokeDashoffset={c * 0.25}
        />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="#2F6C7E"
          strokeWidth="22"
          strokeDasharray={`${p2} ${c - p2}`}
          strokeDashoffset={c * 0.25 - p1}
        />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="#1B3C46"
          strokeWidth="22"
          strokeDasharray={`${p3} ${c - p3}`}
          strokeDashoffset={c * 0.25 - p1 - p2}
        />
      </svg>
      <div className="donut-center">
        <strong>{formatNumber(total)}</strong>
        <span>Komentar</span>
      </div>
      </div>
      <ul className="legend">
        <li>
          <i className="dot positif" /> Positif
          <b>
            {formatNumber(positif)} · {formatPercent((positif / total) * 100)}
          </b>
        </li>
        <li>
          <i className="dot netral" /> Netral
          <b>
            {formatNumber(netral)} · {formatPercent((netral / total) * 100)}
          </b>
        </li>
        <li>
          <i className="dot negatif" /> Negatif
          <b>
            {formatNumber(negatif)} · {formatPercent((negatif / total) * 100)}
          </b>
        </li>
      </ul>
    </div>
  )
}
