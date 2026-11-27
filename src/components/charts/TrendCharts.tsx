import { formatNumber, formatPercent } from '../../lib/format'

interface TrendProps {
  years: string[]
  totals: Record<string, number>
}

interface SentimentTrendProps extends TrendProps {
  sentiments: Record<
    string,
    { positif: number; netral: number; negatif: number }
  >
}

function yearX(index: number, count: number, width: number, padding: number) {
  if (count < 2) return width / 2
  return padding + (index * (width - padding * 2)) / (count - 1)
}

export function VolumeTrend({ years, totals }: TrendProps) {
  const width = 520
  const height = 180
  const padding = 28
  const maxValue = Math.max(...years.map((year) => totals[year] ?? 0), 1)
  const max = Math.ceil(maxValue / 4) * 4
  const points = years.map((year, index) => {
    const value = totals[year] ?? 0
    return {
      x: yearX(index, years.length, width, padding),
      y: height - padding - (value / max) * (height - padding * 2),
      value,
      year,
    }
  })
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const area = points.length
    ? `${line} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`
    : ''

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg">
      {[0, 1, 2, 3, 4].map((step) => {
        const tick = (max / 4) * step
        const y = height - padding - (tick / max) * (height - padding * 2)
        return (
          <g key={step}>
            <line x1={padding} x2={width - 8} y1={y} y2={y} stroke="#EDF2F7" />
            <text x={0} y={y + 4} fontSize="10" fill="#718096">
              {formatNumber(tick)}
            </text>
          </g>
        )
      })}
      <path d={area} fill="rgba(0,75,95,0.08)" />
      <path d={line} fill="none" stroke="#004B5F" strokeWidth="2.4" />
      {points.map((point) => (
        <g key={point.year}>
          <circle cx={point.x} cy={point.y} r="4" fill="#004B5F" />
          <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="11" fill="#24343B">
            {formatNumber(point.value)}
          </text>
          <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#718096">
            {point.year}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function SentimentTrend({ years, totals, sentiments }: SentimentTrendProps) {
  const width = 520
  const height = 180
  const padding = 28
  const series = {
    positif: years.map((year) => {
      const total = totals[year] ?? 0
      return total ? ((sentiments[year]?.positif ?? 0) / total) * 100 : 0
    }),
    netral: years.map((year) => {
      const total = totals[year] ?? 0
      return total ? ((sentiments[year]?.netral ?? 0) / total) * 100 : 0
    }),
    negatif: years.map((year) => {
      const total = totals[year] ?? 0
      return total ? ((sentiments[year]?.negatif ?? 0) / total) * 100 : 0
    }),
  }

  const line = (values: number[], color: string) => {
    const points = values.map((value, index) => {
      const x = yearX(index, values.length, width, padding)
      const y = height - padding - (value / 100) * (height - padding * 2)
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    return <path d={points.join(' ')} fill="none" stroke={color} strokeWidth="2.2" />
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg">
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = height - padding - (tick / 100) * (height - padding * 2)
        return (
          <g key={tick}>
            <line x1={padding} x2={width - 8} y1={y} y2={y} stroke="#EDF2F7" />
            <text x={0} y={y + 4} fontSize="10" fill="#718096">
              {formatPercent(tick)}
            </text>
          </g>
        )
      })}
      {line(series.positif, '#5AA0B3')}
      {line(series.netral, '#2F6C7E')}
      {line(series.negatif, '#1B3C46')}
      {years.map((year, index) => (
        <text
          key={year}
          x={yearX(index, years.length, width, padding)}
          y={height - 6}
          textAnchor="middle"
          fontSize="11"
          fill="#718096"
        >
          {year}
        </text>
      ))}
    </svg>
  )
}

export function volumeChange(year: string, previous: string | undefined, totals: Record<string, number>) {
  if (!previous) return '—'
  const previousTotal = totals[previous]
  if (!previousTotal) return '—'
  const change = ((totals[year] - previousTotal) / previousTotal) * 100
  return `${change >= 0 ? '+' : ''}${formatPercent(change)}`
}
