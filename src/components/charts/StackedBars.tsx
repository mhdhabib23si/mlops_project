import { useState } from 'react'
import type { CategoryStat } from '../../data/dashboard'
import { formatNumber, formatPercent, percentOf } from '../../lib/format'

export function StackedBars({ rows }: { rows: CategoryStat[] }) {
  const [hover, setHover] = useState<string | null>(null)

  return (
    <div className="stacked-wrap">
      {hover && (
        <div className="tooltip">
          Contoh tooltip: {hover}
        </div>
      )}
      {rows.map((row) => {
        const p = percentOf(row.positif, row.total)
        const n = percentOf(row.netral, row.total)
        const g = percentOf(row.negatif, row.total)
        return (
          <div key={row.name} className="stacked-row">
            <span>{row.name}</span>
            <div className="stacked-track">
              <div className="seg positif" style={{ width: `${p}%` }} />
              <div className="seg netral" style={{ width: `${n}%` }} />
              <div
                className="seg negatif"
                style={{ width: `${g}%` }}
                onMouseEnter={() =>
                  setHover(`${row.name} Negatif: ${formatNumber(row.negatif)} komentar · ${formatPercent(g)}`)
                }
                onMouseLeave={() => setHover(null)}
              />
              <em className="seg-label" style={{ left: `${p / 2}%` }}>
                {formatPercent(p, 1)}
              </em>
              <em className="seg-label" style={{ left: `${p + n / 2}%` }}>
                {formatPercent(n, 1)}
              </em>
              <em className="seg-label dark" style={{ left: `${p + n + g / 2}%` }}>
                {formatPercent(g, 1)}
              </em>
            </div>
            <small>{formatNumber(row.total)}</small>
          </div>
        )
      })}
    </div>
  )
}
