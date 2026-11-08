import { SURVEY_YEARS, YEARLY_SENTIMENT, YEARLY_TOTALS } from '../../data/dashboard'
import { formatNumber, formatPercent } from '../../lib/format'

export function VolumeTrend() {
  const values = SURVEY_YEARS.map((y) => YEARLY_TOTALS[y])
  const max = 24000
  const w = 520
  const h = 180
  const pad = 28
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / 3
    const y = h - pad - (v / max) * (h - pad * 2)
    return { x, y, v, year: SURVEY_YEARS[i] }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${d} L${pts[3].x},${h - pad} L${pts[0].x},${h - pad} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend-svg">
      {[0, 6000, 12000, 18000, 24000].map((tick) => {
        const y = h - pad - (tick / max) * (h - pad * 2)
        return (
          <g key={tick}>
            <line x1={pad} x2={w - 8} y1={y} y2={y} stroke="#EDF2F7" />
            <text x={0} y={y + 4} fontSize="10" fill="#718096">
              {tick === 0 ? '0' : formatNumber(tick)}
            </text>
          </g>
        )
      })}
      <path d={area} fill="rgba(0,75,95,0.08)" />
      <path d={d} fill="none" stroke="#004B5F" strokeWidth="2.4" />
      {pts.map((p) => (
        <g key={p.year}>
          <circle cx={p.x} cy={p.y} r="4" fill="#004B5F" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="#24343B">
            {formatNumber(p.v)}
          </text>
          <text x={p.x} y={h - 6} textAnchor="middle" fontSize="11" fill="#718096">
            {p.year}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function SentimentTrend() {
  const w = 520
  const h = 180
  const pad = 28
  const series = {
    positif: SURVEY_YEARS.map((y) => (YEARLY_SENTIMENT[y].positif / YEARLY_TOTALS[y]) * 100),
    netral: SURVEY_YEARS.map((y) => (YEARLY_SENTIMENT[y].netral / YEARLY_TOTALS[y]) * 100),
    negatif: SURVEY_YEARS.map((y) => (YEARLY_SENTIMENT[y].negatif / YEARLY_TOTALS[y]) * 100),
  }

  const line = (arr: number[], color: string) => {
    const pts = arr.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / 3
      const y = h - pad - (v / 100) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    return <path d={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.2" />
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend-svg">
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = h - pad - (tick / 100) * (h - pad * 2)
        return (
          <g key={tick}>
            <line x1={pad} x2={w - 8} y1={y} y2={y} stroke="#EDF2F7" />
            <text x={0} y={y + 4} fontSize="10" fill="#718096">
              {tick}.0%
            </text>
          </g>
        )
      })}
      {line(series.positif, '#5AA0B3')}
      {line(series.netral, '#2F6C7E')}
      {line(series.negatif, '#1B3C46')}
      {SURVEY_YEARS.map((year, i) => {
        const x = pad + (i * (w - pad * 2)) / 3
        return (
          <text key={year} x={x} y={h - 6} textAnchor="middle" fontSize="11" fill="#718096">
            {year}
          </text>
        )
      })}
    </svg>
  )
}

export function volumeChange(year: string, prev?: string) {
  if (!prev) return '—'
  const a = YEARLY_TOTALS[year]
  const b = YEARLY_TOTALS[prev]
  const pct = ((a - b) / b) * 100
  return `+${formatPercent(pct)}`
}
