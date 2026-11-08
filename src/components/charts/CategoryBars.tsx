import type { CategoryStat } from '../../data/dashboard'
import { formatNumber, formatPercent, percentOf } from '../../lib/format'

export function CategoryBars({ rows, total }: { rows: CategoryStat[]; total: number }) {
  const max = Math.max(...rows.map((r) => r.total), 1)
  return (
    <div className="cat-bars">
      {rows.map((row) => (
        <div key={row.name} className="cat-row">
          <span>{row.name}</span>
          <div className="track">
            <div className="fill" style={{ width: `${(row.total / max) * 100}%` }} />
          </div>
          <small>
            {formatNumber(row.total)} · {formatPercent(percentOf(row.total, total))}
          </small>
        </div>
      ))}
    </div>
  )
}
